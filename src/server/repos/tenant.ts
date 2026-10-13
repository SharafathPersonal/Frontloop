import 'server-only';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDB } from '@/server/db';
import { KnowledgeBase, type KnowledgeBaseDoc } from '@/server/models/KnowledgeBase';
import { Lead, type LeadDoc, type LeadStatus, type LeadIntent } from '@/server/models/Lead';
import { Message, type MessageDoc } from '@/server/models/Message';
import { BusinessTenant } from '@/server/models/BusinessTenant';
import { DEFAULT_HANDOFF_KEYWORDS, MIN_HANDOFF_KEYWORD_LENGTH } from '@/lib/bot-defaults';
import { isWithinServiceWindow } from '@/lib/whatsapp-window';
import { sendWhatsAppText } from '@/server/meta-graph';
import { getTenantByPhoneNumberId } from '@/server/tenant-resolver';

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Zod validation matching KnowledgeBase Mongoose schema
export const SlotInputSchema = z.object({
  open: z.string().regex(HHMM_REGEX, 'Must be valid HH:MM format (00:00 - 23:59)'),
  close: z.string().regex(HHMM_REGEX, 'Must be valid HH:MM format (00:00 - 23:59)'),
});

export const FaqInputSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(300, 'Max 300 characters'),
  answer: z.string().trim().min(1, 'Answer is required').max(2000, 'Max 2000 characters'),
  enabled: z.boolean().default(true),
});

export const ServiceInputSchema = z.object({
  name: z.string().trim().min(1, 'Service name is required').max(120, 'Max 120 characters'),
  description: z.string().trim().max(500, 'Max 500 characters').optional().default(''),
  priceMinor: z.number().int().min(0, 'Price must be non-negative').optional(),
  currency: z.string().default('INR'),
  durationMin: z.number().int().min(0, 'Duration must be non-negative').optional(),
});

export const DayScheduleSchema = z.object({
  day: z.number().int().min(0).max(6), // 0 = Sunday
  closed: z.boolean().default(false),
  slots: z.array(SlotInputSchema).default([]),
});

export const ExceptionScheduleSchema = z.object({
  date: z.string().regex(DATE_REGEX, 'Must be YYYY-MM-DD'),
  closed: z.boolean().default(true),
  slots: z.array(SlotInputSchema).default([]),
  note: z.string().max(200).optional().default(''),
});

export const HoursInputSchema = z.object({
  weekly: z.array(DayScheduleSchema).default([]),
  exceptions: z.array(ExceptionScheduleSchema).optional(), // omitted = keep stored exceptions
});

export const BotSettingsInputSchema = z.object({
  persona: z.string().max(500, 'Max 500 characters').optional().default(''),
  languages: z.array(z.string().trim().min(2).max(20)).max(10).default(['en']),
  fallbackReply: z
    .string()
    .max(500, 'Max 500 characters')
    .default('Thanks for reaching out! Our team will get back to you shortly.'),
  handoffKeywords: z
    .array(
      z
        .string()
        .trim()
        .min(MIN_HANDOFF_KEYWORD_LENGTH, `Handoff keywords must be at least ${MIN_HANDOFF_KEYWORD_LENGTH} characters`)
        .max(40, 'Handoff keywords can be at most 40 characters'),
    )
    .max(20, 'At most 20 handoff keywords')
    .default([...DEFAULT_HANDOFF_KEYWORDS]),
  captureFields: z.array(z.enum(['name', 'requirement', 'preferred_time', 'email'])).default(['name', 'requirement']),
});

export const KnowledgeBaseInputSchema = z.object({
  context: z.string().max(8000, 'Context cannot exceed 8,000 characters').default(''),
  faqs: z.array(FaqInputSchema).default([]),
  services: z.array(ServiceInputSchema).default([]),
  hours: HoursInputSchema.optional(),
  bot: BotSettingsInputSchema.optional(),
});

export type KnowledgeBaseInput = z.input<typeof KnowledgeBaseInputSchema>;

export type SaveKnowledgeBaseResult = { ok: true } | { ok: false; error: string };

const KB_SECTION_LABELS: Record<string, string> = {
  faqs: 'FAQ',
  services: 'Service',
  context: 'Business context',
  hours: 'Business hours',
  bot: 'Bot settings',
};

/** Turns the first zod issue into a field-specific sentence, e.g. "FAQ #2: answer is required". */
function describeKbIssue(issue: z.core.$ZodIssue): string {
  const [section, index] = issue.path;
  const base = KB_SECTION_LABELS[String(section)] ?? 'Knowledge base';
  const label = typeof index === 'number' && (section === 'faqs' || section === 'services')
    ? `${base} #${index + 1}`
    : base;
  const message = issue.message.charAt(0).toLowerCase() + issue.message.slice(1);
  return `${label}: ${message}`;
}

/** `at` is the sort-field value of the last row on the previous page (lastMessageAt, or lastInboundAt for Needs Human). */
export type LeadCursor = { at: string; _id: string };

/** Cursor is URL-safe: `<epochMs>_<objectId>`. Malformed input yields null (first page). */
export function encodeLeadCursor(c: LeadCursor): string {
  return `${new Date(c.at).getTime()}_${c._id}`;
}

export function decodeLeadCursor(raw: string | undefined): LeadCursor | null {
  const match = raw?.match(/^(\d{1,15})_([a-f0-9]{24})$/);
  if (!match) return null;
  return { at: new Date(Number(match[1])).toISOString(), _id: match[2] };
}

export interface LeadQueryFilter {
  status?: LeadStatus;
  /** Bot-paused leads only, most recent customer message first. */
  needsHuman?: boolean;
  searchPhone?: string;
  cursor?: LeadCursor;
  limit?: number;
}

export type AgentReplyResult =
  | { ok: true; message: { id: string; createdAt: string } }
  | { ok: false; error: string };

export const SERVICE_WINDOW_EXPIRED_ERROR = 'WhatsApp 24-hour service window expired. Customer must message first.';

const toObjectId = (id: string) => (mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null);

export interface PaginatedLeads {
  leads: Array<LeadDoc & { _id: unknown }>;
  nextCursor: LeadCursor | null;
  totalCount: number;
}

export function forTenant(tenantId: string) {
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

  return {
    /**
     * Retrieves the tenant document.
     */
    async getTenant() {
      await connectDB();
      return BusinessTenant.findById(tenantObjectId).lean();
    },

    /** Encrypted token + routing id, for reusing a stored token. Never send to the browser. */
    async getWhatsAppSecret() {
      await connectDB();
      const tenant = await BusinessTenant.findOne({ _id: tenantObjectId })
        .select('+whatsapp.accessTokenEnc whatsapp.phoneNumberId')
        .lean<{ whatsapp?: { accessTokenEnc?: string; phoneNumberId?: string } } | null>();
      return { accessTokenEnc: tenant?.whatsapp?.accessTokenEnc, phoneNumberId: tenant?.whatsapp?.phoneNumberId };
    },

    /**
     * Binds a verified WhatsApp number to this tenant. The unique partial index on
     * `whatsapp.phoneNumberId` turns a number owned by another tenant into E11000.
     */
    async connectWhatsApp(config: {
      phoneNumberId: string;
      wabaId: string;
      displayPhoneNumber: string;
      accessTokenEnc: string;
    }): Promise<{ ok: true } | { ok: false; reason: 'number_taken' }> {
      await connectDB();
      try {
        await BusinessTenant.updateOne(
          { _id: tenantObjectId },
          {
            $set: {
              'whatsapp.phoneNumberId': config.phoneNumberId,
              'whatsapp.wabaId': config.wabaId,
              'whatsapp.displayPhoneNumber': config.displayPhoneNumber,
              'whatsapp.accessTokenEnc': config.accessTokenEnc,
              'whatsapp.status': 'connected',
              'whatsapp.connectedAt': new Date(),
              botEnabled: true,
            },
            $unset: { 'whatsapp.lastError': '' },
          },
        );
      } catch (err) {
        if ((err as { code?: number }).code === 11000) return { ok: false, reason: 'number_taken' };
        throw err;
      }
      return { ok: true };
    },

    /** Drops the token and releases the number so webhooks stop routing here and it can be re-linked. */
    async disconnectWhatsApp() {
      await connectDB();
      await BusinessTenant.updateOne(
        { _id: tenantObjectId },
        {
          $set: { 'whatsapp.status': 'disconnected', botEnabled: false },
          $unset: {
            'whatsapp.accessTokenEnc': '',
            'whatsapp.phoneNumberId': '',
            'whatsapp.lastError': '',
            'whatsapp.connectedAt': '',
          },
        },
      );
    },

    /**
     * Fetches the KnowledgeBase document for this tenant.
     * Guaranteed to pass tenantId in query for tenantGuard.
     */
    async getKnowledgeBase() {
      await connectDB();
      const kb = await KnowledgeBase.findOne({ tenantId: tenantObjectId }).lean<
        (KnowledgeBaseDoc & { _id: unknown }) | null
      >();
      return kb;
    },

    /**
     * Upserts the KnowledgeBase document with strict Zod validation.
     */
    async saveKnowledgeBase(input: unknown): Promise<SaveKnowledgeBaseResult> {
      const parsed = KnowledgeBaseInputSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, error: describeKbIssue(parsed.error.issues[0]) };
      }
      const validated = parsed.data;

      // Verify size limit of KnowledgeBase content
      const size = JSON.stringify({
        f: validated.faqs,
        s: validated.services,
        c: validated.context,
      }).length;

      if (size > 60_000) {
        return { ok: false, error: 'Knowledge base exceeds the maximum of 60,000 characters' };
      }

      const updateData: Record<string, unknown> = {
        context: validated.context,
        faqs: validated.faqs,
        services: validated.services,
      };

      // Dotted paths so a partial `hours` payload never wipes the sibling field.
      if (validated.hours) {
        updateData['hours.weekly'] = validated.hours.weekly;
        if (validated.hours.exceptions) updateData['hours.exceptions'] = validated.hours.exceptions;
      }
      if (validated.bot) {
        updateData.bot = validated.bot;
      }

      await connectDB();
      await KnowledgeBase.findOneAndUpdate(
        { tenantId: tenantObjectId },
        {
          $set: updateData,
          $inc: { version: 1 },
          $setOnInsert: { tenantId: tenantObjectId },
        },
        { upsert: true, runValidators: true },
      );

      return { ok: true };
    },

    /**
     * Cursor-paginated query of Leads by lastMessageAt desc and _id desc.
     */
    async listLeads(filter: LeadQueryFilter = {}): Promise<PaginatedLeads> {
      await connectDB();

      const limit = Math.min(Math.max(filter.limit ?? 25, 1), 100);
      const sortField = filter.needsHuman ? 'lastInboundAt' : 'lastMessageAt';
      const query: Record<string, unknown> = {
        tenantId: tenantObjectId,
      };

      if (filter.status) {
        query.status = filter.status;
      }
      if (filter.needsHuman) {
        query.botPaused = true;
      }

      if (filter.searchPhone) {
        const clean = filter.searchPhone.replace(/\D/g, '');
        if (clean) {
          query.phone = { $regex: `^${clean}` };
        }
      }

      // Count before the cursor clause: the total covers every page of this filter.
      const countQuery = { ...query };

      if (filter.cursor?.at && filter.cursor?._id && mongoose.isValidObjectId(filter.cursor._id)) {
        const at = new Date(filter.cursor.at);
        query.$or = [
          { [sortField]: { $lt: at } },
          { [sortField]: at, _id: { $lt: new mongoose.Types.ObjectId(filter.cursor._id) } },
        ];
      }

      const [docs, totalCount] = await Promise.all([
        Lead.find(query)
          .sort({ [sortField]: -1, _id: -1 })
          .limit(limit + 1)
          .lean<Array<LeadDoc & { _id: unknown }>>(),
        Lead.countDocuments(countQuery),
      ]);

      let nextCursor: PaginatedLeads['nextCursor'] = null;
      let leads = docs;

      if (docs.length > limit) {
        leads = docs.slice(0, limit);
        const lastItem = leads[leads.length - 1];
        const lastValue = lastItem?.[sortField];
        if (lastItem && lastValue) {
          nextCursor = { at: new Date(lastValue).toISOString(), _id: String(lastItem._id) };
        }
      }

      return { leads, nextCursor, totalCount };
    },

    /**
     * Fetches a single lead by ID with strict tenant isolation.
     */
    async getLead(leadId: string) {
      const _id = toObjectId(leadId);
      if (!_id) return null;
      await connectDB();
      return Lead.findOne({ _id, tenantId: tenantObjectId }).lean<(LeadDoc & { _id: unknown }) | null>();
    },

    /**
     * Fetches conversation messages for a lead in chronological order.
     */
    async getLeadMessages(leadId: string, limit = 100) {
      const leadObjectId = toObjectId(leadId);
      if (!leadObjectId) return [];
      await connectDB();
      // Newest `limit` messages, returned oldest-first for the timeline.
      const docs = await Message.find({ tenantId: tenantObjectId, leadId: leadObjectId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean<Array<MessageDoc & { _id: unknown }>>();
      return docs.reverse();
    },

    /**
     * Toggles botPaused (human takeover) for a lead.
     */
    async toggleBotPaused(leadId: string, botPaused: boolean) {
      const _id = toObjectId(leadId);
      if (!_id) return null;
      await connectDB();
      const updated = await Lead.findOneAndUpdate(
        { _id, tenantId: tenantObjectId },
        { $set: { botPaused } },
        { returnDocument: 'after' },
      ).lean();

      return updated;
    },

    /**
     * Updates status or notes on a lead.
     */
    async updateLead(
      leadId: string,
      updates: {
        status?: LeadStatus;
        notes?: string;
        name?: string;
        requirement?: string;
        intent?: LeadIntent;
      },
    ) {
      const _id = toObjectId(leadId);
      if (!_id) return null;
      await connectDB();
      return Lead.findOneAndUpdate(
        { _id, tenantId: tenantObjectId },
        { $set: updates },
        { returnDocument: 'after', runValidators: true },
      ).lean();
    },

    /**
     * Sends a staff-written WhatsApp reply. Never touches the AI reply quota.
     * Replying by hand also pauses the bot for this lead, so the AI cannot answer
     * over the human in the same conversation.
     */
    async sendAgentReply(leadId: string, text: string): Promise<AgentReplyResult> {
      const _id = toObjectId(leadId);
      if (!_id) return { ok: false, error: 'Lead not found' };
      await connectDB();

      const lead = await Lead.findOne({ _id, tenantId: tenantObjectId }).select('phone status lastInboundAt').lean();
      if (!lead) return { ok: false, error: 'Lead not found' };
      if (!isWithinServiceWindow(lead.lastInboundAt)) return { ok: false, error: SERVICE_WINDOW_EXPIRED_ERROR };

      const tenantDoc = await BusinessTenant.findOne({ _id: tenantObjectId }).select('whatsapp.phoneNumberId').lean();
      const phoneNumberId = tenantDoc?.whatsapp?.phoneNumberId;
      if (!phoneNumberId) return { ok: false, error: 'Connect your WhatsApp number in Settings before replying.' };

      const tenant = await getTenantByPhoneNumberId(phoneNumberId);
      if (!tenant || tenant.id !== tenantId || !tenant.accessToken) {
        return { ok: false, error: 'Your WhatsApp credentials are unavailable. Reconnect WhatsApp in Settings.' };
      }

      const sent = await sendWhatsAppText(phoneNumberId, tenant.accessToken, lead.phone, text);
      if (!sent.ok) {
        const code = sent.error?.code;
        if (code === 131047) return { ok: false, error: SERVICE_WINDOW_EXPIRED_ERROR };
        if (code === 190) {
          await BusinessTenant.updateOne(
            { _id: tenantObjectId },
            {
              $set: {
                'whatsapp.status': 'error',
                'whatsapp.lastError': { code: 190, message: 'Access token expired or invalid', at: new Date() },
              },
            },
          );
          return { ok: false, error: 'Meta rejected your access token. Reconnect WhatsApp in Settings.' };
        }
        return { ok: false, error: 'WhatsApp did not accept the message. Please try again.' };
      }

      const sentAt = new Date();
      const message = await Message.create({
        tenantId: tenantObjectId,
        leadId: _id,
        direction: 'out',
        author: 'agent',
        channel: 'whatsapp',
        waMessageId: sent.messageId,
        type: 'text',
        body: text,
        status: 'sent',
        waTimestamp: sentAt,
      });
      await Lead.updateOne(
        { _id, tenantId: tenantObjectId },
        {
          $set: { botPaused: true, status: lead.status === 'new' ? 'contacted' : lead.status },
          $max: { lastMessageAt: sentAt },
          $inc: { messageCount: 1 },
        },
      );

      return { ok: true, message: { id: String(message._id), createdAt: sentAt.toISOString() } };
    },

    /**
     * Streams leads for CSV export without buffering the whole collection.
     * Rides the `{ tenantId, createdAt: -1 }` index.
     */
    async exportLeadsCursor(filter: { status?: LeadStatus; needsHuman?: boolean } = {}) {
      await connectDB();
      return Lead.find({
        tenantId: tenantObjectId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.needsHuman ? { botPaused: true } : {}),
      })
        .sort({ createdAt: -1 })
        .lean<LeadDoc & { _id: unknown }>()
        .cursor();
    },
  };
}

