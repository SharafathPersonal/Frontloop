import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { tenantGuard } from './plugins/tenant-guard';

export const LEAD_STATUSES = ['new', 'contacted', 'converted', 'lost'] as const;
export const LEAD_INTENTS = ['enquiry', 'booking', 'pricing', 'admission', 'complaint', 'other'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadIntent = (typeof LEAD_INTENTS)[number];

const LeadSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'BusinessTenant', required: true, immutable: true },
    phone: { type: String, required: true, match: /^\d{8,15}$/ }, // E.164 digits, no '+'
    profileName: { type: String, trim: true, maxlength: 120 }, // WhatsApp contacts[].profile.name
    name: { type: String, trim: true, maxlength: 120 }, // AI-extracted or agent-edited
    requirement: { type: String, trim: true, maxlength: 1000 },
    intent: { type: String, enum: LEAD_INTENTS, default: 'enquiry' },
    status: { type: String, enum: LEAD_STATUSES, default: 'new' },
    botPaused: { type: Boolean, default: false }, // human takeover
    lastInboundAt: { type: Date }, // anchor for the 24h customer-service window
    lastMessageAt: { type: Date }, // no default: would conflict with $max on upsert
    messageCount: { type: Number, default: 0, min: 0 },
    notes: { type: String, maxlength: 2000 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

LeadSchema.index({ tenantId: 1, phone: 1 }, { unique: true }); // upsert key + phone-prefix search
LeadSchema.index({ tenantId: 1, status: 1, lastMessageAt: -1, _id: -1 }); // filtered dashboard + cursor
LeadSchema.index({ tenantId: 1, lastMessageAt: -1, _id: -1 }); // unfiltered dashboard + cursor
LeadSchema.index({ tenantId: 1, createdAt: -1 }); // CSV export by date range
LeadSchema.index({ tenantId: 1, botPaused: 1, lastInboundAt: -1, _id: -1 }); // "Needs Human" queue + cursor

LeadSchema.plugin(tenantGuard);

export type LeadDoc = InferSchemaType<typeof LeadSchema>;

export const Lead: Model<LeadDoc> = (models.Lead as Model<LeadDoc>) ?? model<LeadDoc>('Lead', LeadSchema);
