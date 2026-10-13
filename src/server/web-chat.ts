import 'server-only';
import mongoose from 'mongoose';
import { connectDB } from './db';
import { Lead } from './models/Lead';
import { Message } from './models/Message';
import { KnowledgeBase } from './models/KnowledgeBase';
import { BusinessTenant } from './models/BusinessTenant';
import { rateLimit } from './rate-limit';
import { generateAIReply } from './ai-pipeline';
import { knowledgeContext } from './ai-context';
import { isSubscriptionLive, releaseReplyQuota, reserveReplyQuota } from './quota';
import type { GuestSession } from './auth/guest-session';
import { matchesHandoffKeyword, resolveHandoffKeywords } from '@/lib/bot-defaults';

const HISTORY_LIMIT = 20;
const DISPLAY_LIMIT = 100;

export const HANDOFF_NOTICE = 'Our team will contact you on your phone shortly.';
export const REQUEST_HUMAN_TEXT = 'I would like to talk to a person from your team.';
const OFFLINE_NOTICE = 'This front desk is not taking chats right now. The team will contact you on your phone.';
const BUSY_NOTICE = 'We are receiving a lot of messages right now. Please wait a minute and try again.';

export type WebChatMessage = { id: string; from: 'customer' | 'bot'; body: string; createdAt: string };

const toWebMessage = (m: { _id: unknown; direction: string; body?: string | null; createdAt?: Date }): WebChatMessage => ({
  id: String(m._id),
  from: m.direction === 'in' ? 'customer' : 'bot',
  body: m.body ?? '',
  createdAt: (m.createdAt ?? new Date()).toISOString(),
});

/**
 * Creates or reuses the tenant's lead for this phone. If the phone already
 * belongs to a WhatsApp lead the records merge (one customer, one pipeline row),
 * but the typed phone is unverified, so the web session never sees that
 * lead's other conversations: see getWebChatHistory.
 */
export async function startWebChatLead(tenantId: string, name: string, phone: string): Promise<string> {
  await connectDB();
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
  const lead = await Lead.findOneAndUpdate(
    { tenantId: tenantObjectId, phone },
    { $setOnInsert: { status: 'new', intent: 'enquiry', botPaused: false, source: 'web_widget', name } },
    { upsert: true, returnDocument: 'after' },
  ).lean();
  if (!lead) throw new Error('Lead upsert returned nothing');
  // An existing lead keeps its name; the web form only fills a gap.
  if (!lead.name) await Lead.updateOne({ _id: lead._id, tenantId: tenantObjectId }, { $set: { name } });
  return String(lead._id);
}

/** Messages of this guest session only, oldest first. Never the lead's WhatsApp history or other web sessions. */
export async function getWebChatHistory(session: GuestSession): Promise<{ messages: WebChatMessage[]; botPaused: boolean } | null> {
  await connectDB();
  const tenantId = new mongoose.Types.ObjectId(session.tenantId);
  const leadId = new mongoose.Types.ObjectId(session.leadId);
  const [lead, docs] = await Promise.all([
    Lead.findOne({ _id: leadId, tenantId }).select('botPaused').lean(),
    Message.find({ tenantId, leadId, webSessionId: session.sessionId })
      .sort({ createdAt: -1 })
      .limit(DISPLAY_LIMIT)
      .select('direction body createdAt')
      .lean(),
  ]);
  if (!lead) return null;
  return { messages: docs.reverse().map(toWebMessage), botPaused: Boolean(lead.botPaused) };
}

export type WebChatResult =
  | { ok: true; customerMessage: WebChatMessage; reply: WebChatMessage | null; botPaused: boolean; notice: string | null }
  | { ok: false; status: number; error: string };

/**
 * Synchronous web chat turn. Mirrors the WhatsApp worker's rules: same rate-limit
 * buckets, same quota reservation (released on failure or canned fallback), same
 * handoff keywords. Web rows carry `channel: 'web'` and are never `pending`, so
 * the WhatsApp sweeper can never pick one up and send it over WhatsApp.
 */
export async function sendWebChatMessage(
  session: GuestSession,
  input: { text?: string; requestHuman?: boolean },
): Promise<WebChatResult> {
  await connectDB();
  const tenantId = new mongoose.Types.ObjectId(session.tenantId);
  const leadId = new mongoose.Types.ObjectId(session.leadId);

  const [tenant, lead] = await Promise.all([
    BusinessTenant.findOne({ _id: tenantId }).select('name category timezone subscription').lean(),
    Lead.findOne({ _id: leadId, tenantId }).select('status name botPaused').lean(),
  ]);
  if (!tenant || !lead) return { ok: false, status: 401, error: 'Your chat session has ended. Please start a new chat.' };

  const [leadOk, tenantOk] = await Promise.all([
    rateLimit(`reply:lead:${session.leadId}`, 15, 60),
    rateLimit(`reply:tenant:${session.tenantId}`, 120, 60),
  ]);
  if (!leadOk || !tenantOk) return { ok: false, status: 429, error: BUSY_NOTICE };

  const body = input.requestHuman ? input.text || REQUEST_HUMAN_TEXT : (input.text ?? '');
  const inbound = await Message.create({
    tenantId,
    leadId,
    direction: 'in',
    author: 'customer',
    channel: 'web',
    webSessionId: session.sessionId,
    type: 'text',
    body,
    status: 'received',
  });
  const customerMessage = toWebMessage(inbound);
  const finish = (replyState: 'done' | 'skipped' | 'failed', replyNote: string) =>
    Message.updateOne({ _id: inbound._id, tenantId }, { $set: { replyState, replyNote } });
  const touchLead = (set: Record<string, unknown>, count: number) =>
    Lead.updateOne({ _id: leadId, tenantId }, { $set: set, $max: { lastMessageAt: new Date() }, $inc: { messageCount: count } });

  const kb = await KnowledgeBase.findOne({ tenantId }).lean();
  const wantsHuman = input.requestHuman || matchesHandoffKeyword(body, resolveHandoffKeywords(kb?.bot?.handoffKeywords));

  if (lead.botPaused || wantsHuman) {
    await Promise.all([touchLead({ botPaused: true }, 1), finish('skipped', 'Web chat: waiting for a human')]);
    return { ok: true, customerMessage, reply: null, botPaused: true, notice: HANDOFF_NOTICE };
  }

  if (!isSubscriptionLive(tenant.subscription) || !(await reserveReplyQuota(tenantId))) {
    await Promise.all([touchLead({}, 1), finish('skipped', 'Web chat: subscription lapsed or reply quota exhausted')]);
    return { ok: true, customerMessage, reply: null, botPaused: false, notice: OFFLINE_NOTICE };
  }

  // From here the reservation must end in a delivered AI reply or a release.
  let aiResult;
  try {
    const history = await Message.find({ tenantId, leadId, webSessionId: session.sessionId, _id: { $ne: inbound._id } })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT)
      .select('direction body')
      .lean();
    aiResult = await generateAIReply({
      ...knowledgeContext(tenant, kb),
      conversationHistory: history
        .reverse()
        .filter((m) => m.body?.trim())
        .map((m) => ({ role: m.direction === 'in' ? ('user' as const) : ('assistant' as const), content: m.body! })),
      latestCustomerMessage: body,
      customerProfileName: session.name,
    });
  } catch (err) {
    await releaseReplyQuota(tenantId);
    await finish('failed', `Web chat pipeline error: ${(err instanceof Error ? err.message : String(err)).slice(0, 200)}`);
    throw err;
  }

  const usedFallback = aiResult.providerUsed === 'fallback';
  if (usedFallback) {
    console.error(`[AI_DOWN] Fallback triggered across all LLM tiers (tenant ${session.tenantId}, web chat)`);
    await releaseReplyQuota(tenantId);
  }

  const outbound = await Message.create({
    tenantId,
    leadId,
    direction: 'out',
    author: 'bot',
    channel: 'web',
    webSessionId: session.sessionId,
    type: 'text',
    body: aiResult.replyText,
    status: 'sent',
  });

  const set: Record<string, unknown> = { status: lead.status === 'new' ? 'contacted' : lead.status };
  if (aiResult.extractedName && !lead.name) set.name = aiResult.extractedName;
  if (aiResult.extractedRequirement) set.requirement = aiResult.extractedRequirement;
  if (aiResult.extractedIntent) set.intent = aiResult.extractedIntent;
  if (aiResult.handoff) set.botPaused = true;

  await Promise.all([
    touchLead(set, 2),
    finish('done', usedFallback ? 'AI provider unavailable: fallback sent' : `Replied via ${aiResult.providerUsed} (web)`),
  ]);

  return {
    ok: true,
    customerMessage,
    reply: toWebMessage(outbound),
    botPaused: aiResult.handoff,
    notice: aiResult.handoff ? HANDOFF_NOTICE : null,
  };
}
