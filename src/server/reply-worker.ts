import 'server-only';
import mongoose from 'mongoose';
import { connectDB } from './db';
import { Message, type MessageDoc } from './models/Message';
import { Lead } from './models/Lead';
import { KnowledgeBase } from './models/KnowledgeBase';
import { BusinessTenant } from './models/BusinessTenant';
import { rateLimit } from './rate-limit';
import { generateAIReply } from './ai-pipeline';
import { describeBusinessHours } from './business-hours';
import { sendWhatsAppText } from './meta-graph';
import { getTenantByPhoneNumberId } from './tenant-resolver';
import { resolveHandoffKeywords } from '@/lib/bot-defaults';
import { isWithinServiceWindow } from '@/lib/whatsapp-window';

export interface ProcessPendingMessageParams {
  messageId: string; // Message._id (Mongo string)
  tenantId: string; // Mongo ObjectId string
  leadId: string; // Mongo ObjectId string
  phoneNumberId: string;
}

const HISTORY_LIMIT = 20;
const MAX_REPLY_ATTEMPTS = 3;
const BILLABLE_STATUSES = ['trialing', 'active'] as const;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  const claimedMessage = await Message.findOneAndUpdate(
    { _id: messageObjectId, tenantId: tenantObjectId, replyState: 'pending' },
    { $set: { replyState: 'processing', claimedAt: new Date() }, $inc: { replyAttempts: 1 } },
    { returnDocument: 'after' },
  ).lean<(MessageDoc & { createdAt: Date }) | null>();

  if (!claimedMessage) return; // already claimed by another invocation

  const finish = (replyState: 'skipped' | 'failed', reason: string, error?: { code?: number; title?: string }) =>
    Message.updateOne(
      { _id: messageObjectId, tenantId: tenantObjectId },
      { $set: { replyState, replyNote: reason, ...(error ? { error } : {}) } },
    );

  // A message that keeps crashing the pipeline is retried by the sweeper at most MAX_REPLY_ATTEMPTS times.
  if ((claimedMessage.replyAttempts ?? 1) > MAX_REPLY_ATTEMPTS) {
    await finish('failed', `Gave up after ${MAX_REPLY_ATTEMPTS} attempts`);
    return;
  }

  // 2. Gates that cost nothing, evaluated before any quota or rate budget is spent.
  const tenant = await getTenantByPhoneNumberId(phoneNumberId);
  if (!tenant || !tenant.accessToken) {
    await finish('failed', 'Tenant not found or WhatsApp access token missing');
    return;
  }
  if (!tenant.botEnabled) {
    await finish('skipped', 'Tenant bot is disabled');
    return;
  }

  const lead = await Lead.findOne({ _id: leadObjectId, tenantId: tenantObjectId }).lean();
  if (!lead) {
    await finish('failed', 'Lead record not found');
    return;
  }
  if (lead.botPaused) {
    await finish('skipped', 'Bot paused for lead (agent takeover)');
    return;
  }
  if (lead.lastInboundAt && !isWithinServiceWindow(lead.lastInboundAt)) {
    await finish('skipped', 'Customer 24-hour service window expired');
    return;
  }

  // Burst coalescing: when a customer sends several messages in a row, only the
  // newest gets a reply; it sees the earlier ones in its history.
  const newerInbound = await Message.exists({
    tenantId: tenantObjectId,
    leadId: leadObjectId,
    direction: 'in',
    createdAt: { $gt: claimedMessage.createdAt },
  });
  if (newerInbound) {
    await finish('skipped', 'Superseded by a newer customer message');
    return;
  }

  const kb = await KnowledgeBase.findOne({ tenantId: tenantObjectId }).lean();

  const incomingText = claimedMessage.body || '';
  const handoffKeywords = resolveHandoffKeywords(kb?.bot?.handoffKeywords);
  const hasHandoffRequest = handoffKeywords.some(
    // Unicode-aware word boundary: `\b` is ASCII-only and never matches Malayalam/Devanagari keywords.
    (kw) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(kw)}($|[^\\p{L}\\p{N}])`, 'iu').test(incomingText),
  );
  if (hasHandoffRequest) {
    await Lead.updateOne({ _id: leadObjectId, tenantId: tenantObjectId }, { $set: { botPaused: true } });
    await finish('skipped', 'Handoff keyword matched, bot paused for human agent');
    return;
  }

  // 3. Rate limits: 15/min per lead, 120/min per tenant
  if (!(await rateLimit(`reply:lead:${leadId}`, 15, 60))) {
    await finish('skipped', 'Lead rate limit exceeded (15/min)');
    return;
  }
  if (!(await rateLimit(`reply:tenant:${tenantId}`, 120, 60))) {
    await finish('skipped', 'Tenant rate limit exceeded (120/min)');
    return;
  }

  // 4. Atomic quota reservation: concurrent workers can never overshoot the plan,
  // and a lapsed paid period stops replies (trials carry no period end).
  const reservation = await BusinessTenant.updateOne(
    {
      _id: tenantObjectId,
      'subscription.status': { $in: [...BILLABLE_STATUSES] },
      $or: [{ 'subscription.currentPeriodEnd': null }, { 'subscription.currentPeriodEnd': { $gt: new Date() } }],
      $expr: { $lt: ['$subscription.repliesUsed', '$subscription.replyQuota'] },
    },
    { $inc: { 'subscription.repliesUsed': 1 } },
  );
  if (reservation.modifiedCount === 0) {
    await finish('skipped', 'Subscription quota exhausted, expired, or inactive');
    return;
  }

  // From here on the reserved reply must be either delivered or handed back exactly once.
  let quotaHeld = true;
  const releaseQuota = async () => {
    if (!quotaHeld) return;
    quotaHeld = false;
    await BusinessTenant.updateOne(
      { _id: tenantObjectId, 'subscription.repliesUsed': { $gt: 0 } },
      { $inc: { 'subscription.repliesUsed': -1 } },
    );
  };

  let delivered = false;
  const generateAndDeliver = async () => {
    // 5. Prompt context
    const recentMessages = await Message.find({
      tenantId: tenantObjectId,
      leadId: leadObjectId,
      _id: { $ne: messageObjectId },
    })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT)
      .lean();
    recentMessages.reverse(); // chronological order

    const conversationHistory = recentMessages
      .filter((m) => m.body && m.body.trim())
      .map((m) => ({
        role: (m.direction === 'in' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.body!,
      }));

    const aiResult = await generateAIReply({
      tenantName: tenant.name,
      tenantCategory: tenant.category,
      kbContext: kb?.context || '',
      faqs: (kb?.faqs || []).filter((f) => f.enabled !== false).map((f) => ({ question: f.question, answer: f.answer })),
      services: (kb?.services || []).map((s) => ({
        name: s.name,
        description: s.description || undefined,
        priceMinor: s.priceMinor ?? undefined,
        currency: s.currency || 'INR',
        durationMin: s.durationMin ?? undefined,
      })),
      businessHours: describeBusinessHours(kb?.hours, tenant.timezone),
      botPersona: kb?.bot?.persona || undefined,
      botFallbackReply: kb?.bot?.fallbackReply || undefined,
      botCaptureFields: kb?.bot?.captureFields || ['name', 'requirement'],
      conversationHistory,
      latestCustomerMessage: incomingText,
      customerProfileName: lead.profileName || undefined,
    });

    // 6. Dispatch via Meta Graph API
    const metaRes = await sendWhatsAppText(tenant.phoneNumberId, tenant.accessToken, lead.phone, aiResult.replyText);

    if (!metaRes.ok) {
      await releaseQuota();
      const errorCode = metaRes.error?.code || 500;
      const errorMsg = metaRes.error?.message || 'Meta API error';

      if (errorCode === 131047) {
        await finish('skipped', 'Meta 131047: Outside 24-hour service window');
        return;
      }

      if (errorCode === 190) {
        console.error(`[WhatsApp] Invalid access token for tenant ${tenantId}`);
        await BusinessTenant.updateOne(
          { _id: tenantObjectId },
          {
            $set: {
              'whatsapp.status': 'error',
              'whatsapp.lastError': { code: 190, message: 'Access token expired or invalid', at: new Date() },
            },
          },
        );
      }

      await finish('failed', `Meta send error: ${errorMsg}`, { code: errorCode, title: errorMsg.slice(0, 100) });
      return;
    }
    delivered = true;
    const usedFallback = aiResult.providerUsed === 'fallback';
    if (usedFallback) {
      // Every LLM tier failed and the canned reply went out: never bill the tenant for it.
      console.error(`[AI_DOWN] Fallback triggered across all LLM tiers (tenant ${tenantId}, message ${messageId})`);
      await releaseQuota();
    } else {
      quotaHeld = false; // the AI reply was sent; the reservation is now spent
    }

    // 7. Persist. Mark the inbound done first: if we crash after this point the
    // sweeper must not resend a reply the customer already received.
    const sentAt = new Date();
    await Message.updateOne(
      { _id: messageObjectId, tenantId: tenantObjectId },
      {
        $set: {
          replyState: 'done',
          replyNote: usedFallback ? 'AI provider unavailable: fallback sent' : `Replied via ${aiResult.providerUsed}`,
        },
      },
    );

    await Message.create({
      tenantId: tenantObjectId,
      leadId: leadObjectId,
      direction: 'out',
      author: 'bot',
      waMessageId: metaRes.messageId,
      type: 'text',
      body: aiResult.replyText,
      status: 'sent',
      waTimestamp: sentAt,
    });

    const setFields: Record<string, unknown> = {
      status: lead.status === 'new' ? 'contacted' : lead.status,
    };
    if (aiResult.extractedName && !lead.name) setFields.name = aiResult.extractedName;
    if (aiResult.extractedRequirement) setFields.requirement = aiResult.extractedRequirement;
    if (aiResult.extractedIntent) setFields.intent = aiResult.extractedIntent;
    if (aiResult.handoff) setFields.botPaused = true;

    await Lead.updateOne(
      { _id: leadObjectId, tenantId: tenantObjectId },
      { $set: setFields, $max: { lastMessageAt: sentAt }, $inc: { messageCount: 1 } },
    );
  };

  try {
    await generateAndDeliver();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[Reply Worker] Message ${messageId} failed: ${reason}`);
    if (!delivered) {
      await releaseQuota();
      await finish('failed', `Reply pipeline error: ${reason.slice(0, 200)}`);
    } else {
      // Already delivered to the customer: never let the sweeper send it twice.
      await Message.updateOne(
        { _id: messageObjectId, tenantId: tenantObjectId },
        { $set: { replyState: 'done', replyNote: 'Delivered; post-send bookkeeping failed' } },
      );
    }
  }
}
