import { Schema, model, models, type Model } from 'mongoose';

export type RateLimitDoc = { _id: string; count: number; expiresAt: Date };

const RateLimitSchema = new Schema<RateLimitDoc>({
  _id: { type: String },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit: Model<RateLimitDoc> =
  (models.RateLimit as Model<RateLimitDoc>) ?? model<RateLimitDoc>('RateLimit', RateLimitSchema);
