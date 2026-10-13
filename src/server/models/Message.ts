import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { tenantGuard } from './plugins/tenant-guard';

export const MESSAGE_DIRECTIONS = ['in', 'out'] as const;
export const MESSAGE_AUTHORS = ['customer', 'bot', 'agent'] as const;
export const DELIVERY_STATUSES = ['received', 'sent', 'delivered', 'read', 'failed'] as const;
export const REPLY_STATES = ['pending', 'processing', 'done', 'skipped', 'failed'] as const;
export const MESSAGE_CHANNELS = ['whatsapp', 'web'] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
export type ReplyState = (typeof REPLY_STATES)[number];

const MessageSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'BusinessTenant', required: true, immutable: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    direction: { type: String, enum: MESSAGE_DIRECTIONS, required: true },
    author: { type: String, enum: MESSAGE_AUTHORS, required: true },
    waMessageId: { type: String }, // Meta wamid: globally unique, the idempotency key
    type: { type: String, default: 'text' },
    body: { type: String, maxlength: 4096 },
    status: { type: String, enum: DELIVERY_STATUSES },
    replyState: { type: String, enum: REPLY_STATES }, // inbound messages only
    replyNote: { type: String },
    claimedAt: { type: Date },
    replyAttempts: { type: Number, default: 0, min: 0 }, // claims so far; capped by the reply worker
    error: { code: Number, title: String },
    waTimestamp: { type: Date },
    // Absent on rows written before web chat existed; absent means WhatsApp.
    channel: { type: String, enum: MESSAGE_CHANNELS },
    // Web chat only: the guest session that wrote it. The phone number a web
    // guest types is unverified, so web history and AI context are scoped to
    // this id, never to the whole lead.
    webSessionId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MessageSchema.index(
  { waMessageId: 1 },
  { unique: true, partialFilterExpression: { waMessageId: { $type: 'string' } } },
);
MessageSchema.index({ tenantId: 1, leadId: 1, createdAt: -1 }); // AI history + conversation view
MessageSchema.index(
  { replyState: 1, createdAt: 1 },
  { partialFilterExpression: { replyState: { $in: ['pending', 'processing'] } } },
); // reply sweeper

MessageSchema.plugin(tenantGuard);

export type MessageDoc = InferSchemaType<typeof MessageSchema>;

export const Message: Model<MessageDoc> =
  (models.Message as Model<MessageDoc>) ?? model<MessageDoc>('Message', MessageSchema);
