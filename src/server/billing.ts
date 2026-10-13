import 'server-only';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getEnv, requireEnv } from './env';
import { connectDB } from './db';
import { BusinessTenant } from './models/BusinessTenant';
import { Payment, PAYMENT_SOURCES } from './models/Payment';
import { PLAN_CONFIG, isPlanKey, nextPeriodEnd, type PlanKey } from '@/lib/plans';

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

/**
 * Order tags are attacker-influenced until proven otherwise; validated, never trusted.
 * `plan` is checked against the checkout snapshot in fulfilPaidOrder, not the live
 * config, so a plan retired mid-payment is still recognised.
 */
export const OrderTagsSchema = z.object({
  tenantId: z.string().regex(OBJECT_ID_PATTERN),
  plan: z.string().regex(/^[a-z0-9_-]{1,32}$/),
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
 * Snapshots the quoted order before the customer is sent to Cashfree. Fulfilment
 * validates against this row, never against the live PLAN_CONFIG, so a price
 * change between checkout and payment cannot reject a paid order.
 */
export async function createPendingOrder(orderId: string, tenantId: string, plan: PlanKey): Promise<void> {
  const { priceINR, replyQuota } = PLAN_CONFIG[plan];
  await connectDB();
  await Payment.create({
    _id: orderId,
    tenantId: new mongoose.Types.ObjectId(tenantId),
    plan,
    amountINR: priceINR,
    replyQuota,
    status: 'pending',
  });
}

/** Removes a snapshot whose Cashfree order was never created, so no unpayable row lingers. */
export async function discardPendingOrder(orderId: string, tenantId: string): Promise<void> {
  await Payment.deleteOne({ _id: orderId, tenantId: new mongoose.Types.ObjectId(tenantId), status: 'pending' });
}

const reject = (reason: string): FulfilResult => ({ status: 'rejected', reason });

/**
 * Single fulfilment path for both the webhook and the return-URL verify call.
 *
 * The Payment flip to `applied` and the tenant upgrade commit in one transaction:
 * a crash between them rolls both back, so a retry re-applies instead of hitting
 * "duplicate" on a plan that was never granted. Concurrent webhook + verify calls
 * write-conflict; the loser is retried by `withTransaction` and sees `applied`.
 * Requires a replica set (MongoDB Atlas, or a local `mongod --replSet`).
 */
export async function fulfilPaidOrder(order: PaidOrder): Promise<FulfilResult> {
  if (!ORDER_ID_PATTERN.test(order.orderId)) return reject('Malformed order id');
  if (!OBJECT_ID_PATTERN.test(order.tenantId)) return reject('Malformed tenant id');
  if (order.currency !== 'INR') return reject(`Unsupported currency ${order.currency}`);

  await connectDB();
  const tenantId = new mongoose.Types.ObjectId(order.tenantId);
  const session = await mongoose.startSession();
  let result = reject('Fulfilment did not run');
  try {
    await session.withTransaction(async () => {
      result = await applyOrder(order, tenantId, session);
    });
  } finally {
    await session.endSession();
  }
  return result;
}

async function applyOrder(
  order: PaidOrder,
  tenantId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession,
): Promise<FulfilResult> {
  const snapshot = await Payment.findOne({ _id: order.orderId, tenantId }).session(session).lean();
  if (snapshot && (snapshot.status ?? 'applied') === 'applied') return { status: 'duplicate' };

  let plan: PlanKey;
  let amountINR: number;
  let replyQuota: number;
  if (snapshot) {
    if (!isPlanKey(snapshot.plan)) return reject(`Snapshot plan ${snapshot.plan} no longer exists`);
    plan = snapshot.plan;
    amountINR = snapshot.amountINR;
    replyQuota = snapshot.replyQuota ?? PLAN_CONFIG[plan].replyQuota;
  } else {
    // Orders created before checkout snapshots existed are checked against the live price.
    if (!isPlanKey(order.plan)) return reject('Unknown plan');
    plan = order.plan;
    amountINR = PLAN_CONFIG[plan].priceINR;
    replyQuota = PLAN_CONFIG[plan].replyQuota;
  }

  if (order.plan !== plan) return reject(`Paid plan ${order.plan} does not match quoted plan ${plan}`);
  if (order.amount !== amountINR) return reject(`Amount INR ${order.amount} does not match quoted INR ${amountINR}`);

  const tenant = await BusinessTenant.findOne({ _id: tenantId }).select('subscription').session(session).lean();
  if (!tenant) return reject('Tenant not found');

  const periodEnd = nextPeriodEnd(tenant.subscription, plan);

  await Payment.updateOne(
    { _id: order.orderId, tenantId },
    {
      $set: { plan, amountINR, replyQuota, status: 'applied', source: order.source, periodEnd, appliedAt: new Date() },
    },
    { session, upsert: true },
  );

  await BusinessTenant.updateOne(
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
    { session },
  );

  return { status: 'applied', plan, quota: replyQuota, periodEnd };
}
