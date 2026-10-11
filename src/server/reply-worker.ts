import 'server-only';
import mongoose from 'mongoose';
import { connectDB } from './db';
import { Message, type MessageDoc } from './models/Message';
import { Lead } from './models/Lead';
import { KnowledgeBase } from './models/KnowledgeBase';
import { BusinessTenant } from './models/BusinessTenant';
import { rateLimit } from './rate-limit';
import { generateAIReply } from './ai-pipeline';
import { sendWhatsAppText } from './meta-graph';
import { getTenantByPhoneNumberId } from './tenant-resolver';

export interface ProcessPendingMessageParams {
  messageId: string; // Message._id (Mongo string)
  tenantId: string; // Mongo ObjectId string
  leadId: string; // Mongo ObjectId string
  phoneNumberId: string;
}

const SERVICE_WINDOW_HOURS = 24;

/**
 * Executes background processing for a pending inbound message.
 * Called inside Next.js `after()` or triggered by the reply sweeper cron.
 */
export async function processInboundMessageReply(params: ProcessPendingMessageParams): Promise<void> {
  const { messageId, tenantId, leadId, phoneNumberId } = params;

  await connectDB();

  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
  const leadObjectId = new mongoose.Types.ObjectId(leadId);
  const messageObjectId = new mongoose.Types.ObjectId(messageId);

  // 1. Atomic message claim: replyState 'pending' -> 'processing'
  // Strictly pass tenantId in filter for tenantGuard compliance.
  const claimedMessage = await Message.findOneAndUpdate(
    {
      _id: messageObjectId,
      tenantId: tenantObjectId,
      replyState: 'pending',
    },
    {
      $set: {
        replyState: 'processing',
        claimedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  ).lean<MessageDoc | null>();

  if (!claimedMessage) {
    // Already claimed or handled by another worker/invocation
    return;
  }

  // Helper to mark message skipped or failed
  const markSkipped = async (reason: string) => {
    await Message.updateOne(
      { _id: messageObjectId, tenantId: tenantObjectId },
      { $set: { replyState: 'skipped', replyNote: reason } },
    );
  };

  const markFailed = async (reason: string, errorObj?: { code?: number; title?: string }) => {
    await Message.updateOne(
      { _id: messageObjectId, tenantId: tenantObjectId },
      {
        $set: {
          replyState: 'failed',
          replyNote: reason,
          ...(errorObj ? { error: errorObj } : {}),
        },
      },
    );
  };

  // 2. Gate Checks
  // A. Tenant resolution & botEnabled check
  const tenant = await getTenantByPhoneNumberId(phoneNumberId);
  if (!tenant || !tenant.accessToken) {
    await markFailed('Tenant not found or WhatsApp access token missing');
    return;
  }

  if (!tenant.botEnabled) {
    await markSkipped('Tenant bot is disabled');
    return;
  }

  // B. Subscription Quota check
  if (
    tenant.subscription.status === 'past_due' ||
    tenant.subscription.status === 'canceled' ||
    tenant.subscription.repliesUsed >= tenant.subscription.replyQuota
  ) {
    await markSkipped('Subscription quota exceeded or status inactive');
    return;
  }

  // C. Rate Limits
  // 15 replies per minute per lead
  const leadRateOk = await rateLimit(`reply:lead:${leadId}`, 15, 60);
  if (!leadRateOk) {
    await markSkipped('Lead rate limit exceeded (15/min)');
    return;
  }

  // 120 replies per minute per tenant
  const tenantRateOk = await rateLimit(`reply:tenant:${tenantId}`, 120, 60);
  if (!tenantRateOk) {
    await markSkipped('Tenant rate limit exceeded (120/min)');
    return;
  }

  // D. Fetch Lead (strictly with tenantId)
  const lead = await Lead.findOne({
    _id: leadObjectId,
    tenantId: tenantObjectId,
  }).lean();

  if (!lead) {
    await markFailed('Lead record not found');
    return;
  }

  // E. Lead botPaused check (human takeover)
  if (lead.botPaused) {
    await markSkipped('Bot paused for lead (agent takeover)');
    return;
  }

  // F. 24-hour customer service window check
  if (lead.lastInboundAt) {
    const elapsedMs = Date.now() - new Date(lead.lastInboundAt).getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    if (elapsedHours > SERVICE_WINDOW_HOURS) {
      await markSkipped('Customer 24-hour service window expired');
      return;
    }
  }

  // 3. Assemble Knowledge Base & Conversation History
  const kb = await KnowledgeBase.findOne({ tenantId: tenantObjectId }).lean();

  // Check handoff keywords if configured
  const incomingText = claimedMessage.body || '';
  const handoffKeywords = kb?.bot?.handoffKeywords || ['human', 'agent', 'call me'];
  const hasHandoffRequest = handoffKeywords.some(
    (kw) => kw.trim() && incomingText.toLowerCase().includes(kw.toLowerCase().trim()),
  );

  if (hasHandoffRequest) {
    // Auto-pause bot on lead for human takeover
    await Lead.updateOne(
      { _id: leadObjectId, tenantId: tenantObjectId },
      { $set: { botPaused: true } },
    );
    await markSkipped('Handoff keyword matched, bot paused for human agent');
    return;
  }

  // Fetch recent conversation history (last 10 messages before current)
  const recentMessages = await Message.find({
    tenantId: tenantObjectId,
    leadId: leadObjectId,
    _id: { $ne: messageObjectId },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  recentMessages.reverse(); // chronological order

  const conversationHistory = recentMessages
    .filter((m) => m.body && m.body.trim())
    .map((m) => ({
      role: (m.direction === 'in' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.body!,
    }));

  // 4. Run AI generation
  const enabledFaqs = (kb?.faqs || [])
    .filter((f) => f.enabled !== false)
    .map((f) => ({ question: f.question, answer: f.answer }));

  const aiResult = await generateAIReply({
    tenantName: tenant.name,
    tenantCategory: 'business',
    kbContext: kb?.context || '',
    faqs: enabledFaqs,
    services: (kb?.services || []).map((s) => ({
      name: s.name,
      description: s.description || undefined,
      priceMinor: s.priceMinor || undefined,
    })),
    botPersona: kb?.bot?.persona || undefined,
    botFallbackReply: kb?.bot?.fallbackReply || undefined,
    botCaptureFields: kb?.bot?.captureFields || ['name', 'requirement'],
    conversationHistory,
    latestCustomerMessage: incomingText,
    customerProfileName: lead.profileName || undefined,
    customerPhone: lead.phone,
  });

  const replyBody = aiResult.replyText;

  // 5. Send outbound message via Meta Graph API
  const metaRes = await sendWhatsAppText(
    tenant.phoneNumberId,
    tenant.accessToken,
    lead.phone,
    replyBody,
  );

  if (!metaRes.ok) {
    // Handle Graph API specific errors
    const errorCode = metaRes.error?.code || 500;
    const errorMsg = metaRes.error?.message || 'Meta API error';

    if (errorCode === 131047) {
      // 24-hour window closed on Meta's side
      await markSkipped('Meta 131047: Outside 24-hour service window');
      return;
    }

    if (errorCode === 190) {
      // Invalid/expired OAuth token
      console.error(`[WhatsApp] Invalid access token for tenant ${tenantId}`);
      await BusinessTenant.updateOne(
        { _id: tenantObjectId },
        {
          $set: {
            'whatsapp.status': 'error',
            'whatsapp.lastError': {
              code: 190,
              message: 'Access token expired or invalid',
              at: new Date(),
            },
          },
        },
      );
    }

    await markFailed(`Meta send error: ${errorMsg}`, {
      code: errorCode,
      title: errorMsg.slice(0, 100),
    });
    return;
  }

  // 6. Persist outbound Message & update Lead & Tenant Quota
  const outboundWaMessageId = metaRes.messageId;

  // Insert outbound message document
  await Message.create({
    tenantId: tenantObjectId,
    leadId: leadObjectId,
    direction: 'out',
    author: 'bot',
    waMessageId: outboundWaMessageId,
    type: 'text',
    body: replyBody,
    status: 'sent',
    waTimestamp: new Date(),
  });

  // Mark inbound message done
  await Message.updateOne(
    { _id: messageObjectId, tenantId: tenantObjectId },
    {
      $set: {
        replyState: 'done',
        replyNote: `Replied via ${aiResult.providerUsed}`,
      },
    },
  );

  // Update Lead with extracted attributes
  const leadUpdates: Record<string, unknown> = {
    $set: {
      lastMessageAt: new Date(),
      status: lead.status === 'new' ? 'contacted' : lead.status,
    },
    $inc: { messageCount: 1 },
  };

  const setFields: Record<string, unknown> = (leadUpdates.$set as Record<string, unknown>);

  if (aiResult.extractedName && !lead.name) {
    setFields.name = aiResult.extractedName;
  }
  if (aiResult.extractedRequirement) {
    setFields.requirement = aiResult.extractedRequirement;
  }
  if (aiResult.extractedIntent) {
    setFields.intent = aiResult.extractedIntent;
  }

  await Lead.updateOne({ _id: leadObjectId, tenantId: tenantObjectId }, leadUpdates);

  // Increment Tenant reply quota counter
  await BusinessTenant.updateOne(
    { _id: tenantObjectId },
    { $inc: { 'subscription.repliesUsed': 1 } },
  );
}

