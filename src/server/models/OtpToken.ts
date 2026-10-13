import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

export const OTP_PURPOSES = ['register', 'reset_password'] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

/**
 * One live code per (email, purpose): requesting a new code replaces the old one.
 * Not tenant-scoped (it exists before any tenant does), so no tenantGuard.
 * The code is stored only as a keyed HMAC; `payloadEnc` (pending registration
 * details) is AES-256-GCM encrypted. Mongo's TTL monitor removes expired rows.
 */
const OtpTokenSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    purpose: { type: String, enum: OTP_PURPOSES, required: true },
    hashedCode: { type: String, required: true },
    payloadEnc: { type: String },
    attempts: { type: Number, default: 0, min: 0 },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);

OtpTokenSchema.index({ email: 1, purpose: 1 }, { unique: true });
OtpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type OtpTokenDoc = InferSchemaType<typeof OtpTokenSchema>;

export const OtpToken: Model<OtpTokenDoc> =
  (models.OtpToken as Model<OtpTokenDoc>) ?? model<OtpTokenDoc>('OtpToken', OtpTokenSchema);
