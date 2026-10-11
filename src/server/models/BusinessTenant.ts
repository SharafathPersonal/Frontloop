import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

export const TENANT_CATEGORIES = ['clinic', 'institute', 'restaurant', 'salon', 'retail', 'other'] as const;
export const SUBSCRIPTION_PLANS = ['trial', 'starter', 'growth', 'pro'] as const;
export const SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due', 'canceled'] as const;
export const WHATSAPP_STATUSES = ['disconnected', 'connected', 'error'] as const;

export type TenantCategory = (typeof TENANT_CATEGORIES)[number];

const BusinessTenantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, lowercase: true, trim: true, match: /^[a-z0-9-]{3,64}$/ },
    category: { type: String, enum: TENANT_CATEGORIES, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timezone: { type: String, default: 'Asia/Kolkata' }, // IANA; business hours evaluate in this zone
    botEnabled: { type: Boolean, default: true },

    whatsapp: {
      phoneNumberId: { type: String }, // webhook routing key
      displayPhoneNumber: { type: String },
      wabaId: { type: String },
      accessTokenEnc: { type: String, select: false }, // AES-256-GCM via server/crypto.ts
      status: { type: String, enum: WHATSAPP_STATUSES, default: 'disconnected' },
      lastError: { code: Number, message: String, at: Date },
      connectedAt: { type: Date },
    },

    subscription: {
      plan: { type: String, enum: SUBSCRIPTION_PLANS, default: 'trial' },
      status: { type: String, enum: SUBSCRIPTION_STATUSES, default: 'trialing' },
      currentPeriodEnd: { type: Date },
      replyQuota: { type: Number, default: 300, min: 0 },
      repliesUsed: { type: Number, default: 0, min: 0 },
      cashfreeCustomerId: { type: String },
    },

    legacyShopId: { type: String },
  },
  { timestamps: true },
);

BusinessTenantSchema.index({ slug: 1 }, { unique: true });
// A phone number can never be bound to two tenants; E11000 at connect time = reject.
BusinessTenantSchema.index(
  { 'whatsapp.phoneNumberId': 1 },
  { unique: true, partialFilterExpression: { 'whatsapp.phoneNumberId': { $type: 'string' } } },
);
BusinessTenantSchema.index({ ownerId: 1 });
BusinessTenantSchema.index({ 'subscription.status': 1, 'subscription.currentPeriodEnd': 1 });
BusinessTenantSchema.index({ legacyShopId: 1 }, { unique: true, sparse: true });

export type BusinessTenantDoc = InferSchemaType<typeof BusinessTenantSchema>;

export const BusinessTenant: Model<BusinessTenantDoc> =
  (models.BusinessTenant as Model<BusinessTenantDoc>) ??
  model<BusinessTenantDoc>('BusinessTenant', BusinessTenantSchema);
