import 'server-only';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getEnv, requireEnv } from './env';
import { connectDB } from './db';
import { BusinessTenant } from './models/BusinessTenant';
import { Payment, PAYMENT_SOURCES } from './models/Payment';
import { PLAN_CONFIG, isPlanKey, type PlanKey } from '@/lib/plans';

const BILLING_PERIOD_DAYS = 30;

export const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,50}$/;
export const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/;

export type CashfreeConfig = {
  appId: string;
  secretKey: string;
  apiVersion: string;
  mode: 'sandbox' | 'production';
  ordersUrl: string;
};

/** Fails closed: every billing path throws when any Cashfree variable is missing. */
export function getCashfreeConfig(): CashfreeConfig {
  const mode = requireEnv('CASHFREE_ENV');
  return {
    appId: requireEnv('CASHFREE_APP_ID'),
    secretKey: requireEnv('CASHFREE_SECRET_KEY'),
    apiVersion: getEnv().CASHFREE_API_VERSION,
    mode,
    ordersUrl: mode === 'production' ? 'https://api.cashfree.com/pg/orders' : 'https://sandbox.cashfree.com/pg/orders',
  };
}

/** 128 bits of entropy: order ids are never guessable from a tenant id or clock. */
export const newOrderId = () => `SUB_${randomBytes(16).toString('hex')}`;

/** Order tags are attacker-influenced until proven otherwise — validated, never trusted. */
export const OrderTagsSchema = z.object({
  tenantId: z.string().regex(OBJECT_ID_PATTERN),
  plan: z.string().refine(isPlanKey, 'unknown plan'),
});

export type PaidOrder = {
  orderId: string;
  tenantId: string;
  plan: string;
  amount: number;
  currency: string;
  source: (typeof PAYMENT_SOURCES)[number];
};

export type FulfilResult =
  | { status: 'applied'; plan: PlanKey; quota: number; periodEnd: Date }
  | { status: 'duplicate' }
  | { status: 'rejected'; reason: string };

/**
 * Single fulfilment path for both the webhook and the return-URL verify call.
 * The Payment insert (keyed by order id) runs first and is the idempotency gate;
 * the tenant update resets the reply counter so each paid period starts at zero.
 */
export async function fulfilPaidOrder(order: PaidOrder): Promise<FulfilResult> {
  if (!ORDER_ID_PATTERN.test(order.orderId)) return { status: 'rejected', reason: 'Malformed order id' };
  if (!OBJECT_ID_PATTERN.test(order.tenantId)) return { status: 'rejected', reason: 'Malformed tenant id' };
  if (!isPlanKey(order.plan)) return { status: 'rejected', reason: 'Unknown plan' };

  const plan = order.plan;
  const { priceINR, replyQuota } = PLAN_CONFIG[plan];
  if (order.currency !== 'INR' || order.amount !== priceINR) {
    return { status: 'rejected', reason: `Amount ${order.currency} ${order.amount} does not match ${plan} price` };
  }

  await connectDB();
  const tenantId = new mongoose.Types.ObjectId(order.tenantId);
  const periodEnd = new Date(Date.now() + BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  try {
    await Payment.create({ _id: order.orderId, tenantId, plan, amountINR: order.amount, source: order.source, periodEnd });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { status: 'duplicate' };
    throw err;
  }

  const res = await BusinessTenant.updateOne(
    { _id: tenantId },
    {
      $set: {
        'subscription.plan': plan,
        'subscription.status': 'active',
        'subscription.currentPeriodEnd': periodEnd,
        'subscription.replyQuota': replyQuota,
        'subscription.repliesUsed': 0,
      },
    },
  );

  if (res.matchedCount === 0) {
    await Payment.deleteOne({ _id: order.orderId, tenantId });
    return { status: 'rejected', reason: 'Tenant not found' };
  }

  return { status: 'applied', plan, quota: replyQuota, periodEnd };
}
