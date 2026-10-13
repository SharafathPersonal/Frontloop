import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { tenantGuard } from './plugins/tenant-guard';

export const PAYMENT_SOURCES = ['webhook', 'verify'] as const;
export const PAYMENT_STATUSES = ['pending', 'applied'] as const;

/**
 * One row per Cashfree order, keyed by the Cashfree order_id.
 *
 * Checkout inserts a `pending` snapshot of the quoted plan, amount and quota, so a
 * later PLAN_CONFIG price change can never reject an order the customer already
 * paid. Fulfilment flips it to `applied` in the same transaction that upgrades the
 * tenant; a second webhook delivery or a replayed verify finds it applied and
 * grants nothing. Rows written before snapshots existed have no `status` and are
 * treated as applied.
 */
const PaymentSchema = new Schema(
  {
    _id: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'BusinessTenant', required: true, immutable: true },
    plan: { type: String, required: true },
    amountINR: { type: Number, required: true, min: 0 },
    replyQuota: { type: Number, min: 0 },
    status: { type: String, enum: PAYMENT_STATUSES },
    source: { type: String, enum: PAYMENT_SOURCES },
    periodEnd: { type: Date },
    appliedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PaymentSchema.index({ tenantId: 1, createdAt: -1 });

PaymentSchema.plugin(tenantGuard);

export type PaymentDoc = InferSchemaType<typeof PaymentSchema>;

export const Payment: Model<PaymentDoc> =
  (models.Payment as Model<PaymentDoc>) ?? model<PaymentDoc>('Payment', PaymentSchema);
