import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

export const USER_ROLES = ['owner', 'staff', 'platform_admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const UserSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, trim: true, maxlength: 120 },
    role: { type: String, enum: USER_ROLES, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'BusinessTenant' },
    sessionVersion: { type: Number, default: 0 }, // bump to revoke every issued JWT
    disabled: { type: Boolean, default: false },
    legacySupabaseId: { type: String },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, role: 1 });
UserSchema.index({ legacySupabaseId: 1 }, { unique: true, sparse: true });

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User: Model<UserDoc> = (models.User as Model<UserDoc>) ?? model<UserDoc>('User', UserSchema);
