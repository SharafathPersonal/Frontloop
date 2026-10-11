import 'server-only';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDB } from '@/server/db';
import { KnowledgeBase, type KnowledgeBaseDoc } from '@/server/models/KnowledgeBase';
import { Lead, type LeadDoc, type LeadStatus, type LeadIntent } from '@/server/models/Lead';
import { Message, type MessageDoc } from '@/server/models/Message';
import { BusinessTenant } from '@/server/models/BusinessTenant';

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
  exceptions: z.array(ExceptionScheduleSchema).default([]),
});

export const BotSettingsInputSchema = z.object({
  persona: z.string().max(500, 'Max 500 characters').optional().default(''),
  languages: z.array(z.string()).default(['en']),
  fallbackReply: z
    .string()
    .max(500, 'Max 500 characters')
    .default('Thanks for reaching out! Our team will get back to you shortly.'),
  handoffKeywords: z.array(z.string()).default(['human', 'agent', 'call me']),
  captureFields: z.array(z.enum(['name', 'requirement', 'preferred_time', 'email'])).default(['name', 'requirement']),
});

export const KnowledgeBaseInputSchema = z.object({
  context: z.string().max(8000, 'Context cannot exceed 8,000 characters').default(''),
  faqs: z.array(FaqInputSchema).default([]),
  services: z.array(ServiceInputSchema).default([]),
  hours: HoursInputSchema.optional(),
  bot: BotSettingsInputSchema.optional(),
});

export type KnowledgeBaseInput = z.infer<typeof KnowledgeBaseInputSchema>;

export interface LeadQueryFilter {
  status?: LeadStatus;
  searchPhone?: string;
  cursor?: {
    lastMessageAt?: Date;
    _id?: string;
  };
  limit?: number;
}

export interface PaginatedLeads {
  leads: Array<LeadDoc & { _id: unknown }>;
  nextCursor: {
    lastMessageAt: string;
    _id: string;
  } | null;
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
    async saveKnowledgeBase(input: unknown) {
      await connectDB();
      const validated = KnowledgeBaseInputSchema.parse(input);

      // Verify size limit of KnowledgeBase content
      const size = JSON.stringify({
        f: validated.faqs,
        s: validated.services,
        c: validated.context,
      }).length;

      if (size > 60_000) {
        throw new Error('Knowledge base exceeds maximum 60,000 characters');
      }

      const updateData: Record<string, unknown> = {
        context: validated.context,
        faqs: validated.faqs,
        services: validated.services,
        $inc: { version: 1 },
      };

      if (validated.hours) {
        updateData.hours = validated.hours;
      }
      if (validated.bot) {
        updateData.bot = validated.bot;
      }

      const updated = await KnowledgeBase.findOneAndUpdate(
        { tenantId: tenantObjectId },
        {
          $set: updateData,
          $setOnInsert: { tenantId: tenantObjectId },
        },
        { upsert: true, returnDocument: 'after' },
      ).lean();

      return updated;
    },

    /**
     * Cursor-paginated query of Leads by lastMessageAt desc and _id desc.
     */
    async listLeads(filter: LeadQueryFilter = {}): Promise<PaginatedLeads> {
      await connectDB();

      const limit = Math.min(Math.max(filter.limit ?? 25, 1), 100);
      const query: Record<string, unknown> = {
        tenantId: tenantObjectId,
      };

      if (filter.status) {
        query.status = filter.status;
      }

      if (filter.searchPhone) {
        const clean = filter.searchPhone.replace(/\D/g, '');
        if (clean) {
          query.phone = { $regex: `^${clean}` };
        }
      }

      if (filter.cursor?.lastMessageAt && filter.cursor?._id) {
        query.$or = [
          { lastMessageAt: { $lt: new Date(filter.cursor.lastMessageAt) } },
          {
            lastMessageAt: new Date(filter.cursor.lastMessageAt),
            _id: { $lt: new mongoose.Types.ObjectId(filter.cursor._id) },
          },
        ];
      }

      const [docs, totalCount] = await Promise.all([
        Lead.find(query)
          .sort({ lastMessageAt: -1, _id: -1 })
          .limit(limit + 1)
          .lean<Array<LeadDoc & { _id: unknown }>>(),
        Lead.countDocuments({
          tenantId: tenantObjectId,
          ...(filter.status ? { status: filter.status } : {}),
        }),
      ]);

      let nextCursor: PaginatedLeads['nextCursor'] = null;
      let leads = docs;

      if (docs.length > limit) {
        leads = docs.slice(0, limit);
        const lastItem = leads[leads.length - 1];
        if (lastItem && lastItem.lastMessageAt) {
          nextCursor = {
            lastMessageAt: new Date(lastItem.lastMessageAt).toISOString(),
            _id: String(lastItem._id),
          };
        }
      }

      return { leads, nextCursor, totalCount };
    },

    /**
     * Fetches a single lead by ID with strict tenant isolation.
     */
    async getLead(leadId: string) {
      await connectDB();
      return Lead.findOne({
        _id: new mongoose.Types.ObjectId(leadId),
        tenantId: tenantObjectId,
      }).lean<(LeadDoc & { _id: unknown }) | null>();
    },

    /**
     * Fetches conversation messages for a lead in chronological order.
     */
    async getLeadMessages(leadId: string, limit = 100) {
      await connectDB();
      return Message.find({
        tenantId: tenantObjectId,
        leadId: new mongoose.Types.ObjectId(leadId),
      })
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean<Array<MessageDoc & { _id: unknown }>>();
    },

    /**
     * Toggles botPaused (human takeover) for a lead.
     */
    async toggleBotPaused(leadId: string, botPaused: boolean) {
      await connectDB();
      const updated = await Lead.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(leadId),
          tenantId: tenantObjectId,
        },
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
      await connectDB();
      return Lead.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(leadId),
          tenantId: tenantObjectId,
        },
        { $set: updates },
        { returnDocument: 'after' },
      ).lean();
    },

    /**
     * Queries all leads for CSV export.
     */
    async getLeadsForExport(filter: { status?: LeadStatus } = {}) {
      await connectDB();
      return Lead.find({
        tenantId: tenantObjectId,
        ...(filter.status ? { status: filter.status } : {}),
      })
        .sort({ createdAt: -1 })
        .lean<Array<LeadDoc & { _id: unknown }>>();
    },
  };
}

