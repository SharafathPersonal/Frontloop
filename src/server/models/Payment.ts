import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { tenantGuard } from './plugins/tenant-guard';

export const PAYMENT_SOURCES = ['webhook', 'verify'] as const;

/**
 * One row per fulfilled Cashfree order. `_id` is the Cashfree order_id, so the
 * insert itself is the idempotency check: a second webhook delivery or a
 * replayed /api/checkout/verify call hits E11000 and grants nothing.
 */
const PaymentSchema = new Schema(
  {
    _id: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'BusinessTenant', required: true },
    plan: { type: String, required: true },
    amountINR: { type: Number, required: true, min: 0 },
    source: { type: String, enum: PAYMENT_SOURCES, required: true },
    periodEnd: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PaymentSchema.index({ tenantId: 1, createdAt: -1 });

PaymentSchema.plugin(tenantGuard);

export type PaymentDoc = InferSchemaType<typeof PaymentSchema>;

export const Payment: Model<PaymentDoc> =
  (models.Payment as Model<PaymentDoc>) ?? model<PaymentDoc>('Payment', PaymentSchema);
