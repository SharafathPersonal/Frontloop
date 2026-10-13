import 'server-only';
import type { Types } from 'mongoose';
import { BusinessTenant } from './models/BusinessTenant';

const BILLABLE_STATUSES = ['trialing', 'active'] as const;

type SubscriptionLike = { status?: string | null; currentPeriodEnd?: Date | string | null } | null | undefined;

/** True while the tenant's trial or paid period is running (trials created before 2026-10 carry no end date). */
export function isSubscriptionLive(subscription: SubscriptionLike, now = Date.now()): boolean {
  if (!subscription?.status || !(BILLABLE_STATUSES as readonly string[]).includes(subscription.status)) return false;
  return !subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd).getTime() > now;
}

/**
 * Atomically reserves one AI reply. Concurrent callers (WhatsApp worker, web
 * chat) can never overshoot the plan, and a lapsed period reserves nothing.
 * Every successful reservation must end in a delivered reply or releaseReplyQuota().
 */
export async function reserveReplyQuota(tenantId: Types.ObjectId): Promise<boolean> {
  const reservation = await BusinessTenant.updateOne(
    {
      _id: tenantId,
      'subscription.status': { $in: [...BILLABLE_STATUSES] },
      $or: [{ 'subscription.currentPeriodEnd': null }, { 'subscription.currentPeriodEnd': { $gt: new Date() } }],
      $expr: { $lt: ['$subscription.repliesUsed', '$subscription.replyQuota'] },
    },
    { $inc: { 'subscription.repliesUsed': 1 } },
  );
  return reservation.modifiedCount === 1;
}

export async function releaseReplyQuota(tenantId: Types.ObjectId): Promise<void> {
  await BusinessTenant.updateOne(
    { _id: tenantId, 'subscription.repliesUsed': { $gt: 0 } },
    { $inc: { 'subscription.repliesUsed': -1 } },
  );
}
