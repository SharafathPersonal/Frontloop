import 'server-only';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { connectDB } from '../db';
import { User } from '../models/User';
import { BusinessTenant, type TenantCategory } from '../models/BusinessTenant';
import { KnowledgeBase } from '../models/KnowledgeBase';
import { TRIAL_CONFIG, trialEndsAt } from '@/lib/plans';

const slugify = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'business'}-${randomBytes(3).toString('hex')}`;

/** Pending signup, stored AES-encrypted on the OTP token until the code is verified. */
export type PendingRegistration = {
  businessName: string;
  category: TenantCategory;
  passwordHash: string;
};

export type CreateWorkspaceResult = { ok: true; userId: string; tenantId: string } | { ok: false; reason: 'email_taken' };

/**
 * Creates the tenant (on a 14-day trial), its owner and an empty knowledge base.
 * Pre-assigned ids let the three writes reference each other; writes are
 * sequential with compensating deletes, so a failure leaves nothing behind.
 */
export async function createOwnerWorkspace(input: {
  email: string;
  passwordHash: string;
  businessName: string;
  category: TenantCategory;
}): Promise<CreateWorkspaceResult> {
  await connectDB();
  const userId = new Types.ObjectId();
  const tenantId = new Types.ObjectId();

  try {
    await BusinessTenant.create({
      _id: tenantId,
      name: input.businessName,
      slug: slugify(input.businessName),
      category: input.category,
      ownerId: userId,
      // The reply worker's quota reservation stops replies once this date passes.
      subscription: { plan: 'trial', status: 'trialing', replyQuota: TRIAL_CONFIG.replyQuota, currentPeriodEnd: trialEndsAt() },
    });
    await User.create({ _id: userId, email: input.email, passwordHash: input.passwordHash, role: 'owner', tenantId });
    await KnowledgeBase.create({ tenantId });
  } catch (err) {
    await Promise.allSettled([
      KnowledgeBase.deleteOne({ tenantId }),
      User.deleteOne({ _id: userId }),
      BusinessTenant.deleteOne({ _id: tenantId }),
    ]);
    if ((err as { code?: number }).code === 11000) return { ok: false, reason: 'email_taken' };
    throw err;
  }

  return { ok: true, userId: String(userId), tenantId: String(tenantId) };
}
