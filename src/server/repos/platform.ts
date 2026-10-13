import 'server-only';
import mongoose from 'mongoose';
import { connectDB } from '@/server/db';
import { BusinessTenant } from '@/server/models/BusinessTenant';
import { Message } from '@/server/models/Message';
import { PLAN_KEYS, type PlanKey } from '@/lib/plans';

// Platform-admin reads only. Every Message query here is cross-tenant by design
// and opts out of tenantGuard explicitly.
const CROSS_TENANT = { crossTenant: true } as const;

/** The sweeper resets `processing` rows older than 2 minutes; anything much older means it is not running. */
const SWEEPER_STALE_MS = 5 * 60 * 1000;
const BACKLOG_WARN_MS = 2 * 60 * 1000;

export type HealthLevel = 'ok' | 'warn' | 'down';

export interface PlatformOverview {
  generatedAt: Date;
  tenants: {
    total: number;
    activeTrials: number;
    expiredTrials: number;
    paidByPlan: Record<PlanKey, number>;
    paidTotal: number;
  };
  whatsapp: { connected: number; error: number; disconnected: number };
  messages: {
    totalEstimated: number;
    inbound24h: number;
    aiReplies24h: number;
    agentReplies24h: number;
    failed24h: number;
    pending: number;
    processing: number;
  };
  health: {
    database: { level: HealthLevel; latencyMs: number | null };
    sweeper: { level: HealthLevel; oldestPendingAgeMs: number | null; stalledProcessing: number; detail: string };
  };
  recentTenants: Array<{
    id: string;
    name: string;
    category: string;
    plan: string;
    status: string;
    whatsappStatus: string;
    createdAt: Date | null;
  }>;
}

async function pingDatabase(): Promise<PlatformOverview['health']['database']> {
  const started = performance.now();
  try {
    await mongoose.connection.db?.admin().ping();
    return { level: 'ok', latencyMs: Math.round(performance.now() - started) };
  } catch {
    return { level: 'down', latencyMs: null };
  }
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
  await connectDB();
  const now = new Date();
  // ObjectIds embed their creation second, so an _id range rides the default _id index.
  const since24h = mongoose.Types.ObjectId.createFromTime(Math.floor(now.getTime() / 1000) - 24 * 60 * 60);
  const recent = { _id: { $gte: since24h } };
  const notExpired = { $or: [{ 'subscription.currentPeriodEnd': null }, { 'subscription.currentPeriodEnd': { $gt: now } }] };

  const [
    total,
    activeTrials,
    trialsTotal,
    paidGroups,
    whatsappGroups,
    totalEstimated,
    inbound24h,
    aiReplies24h,
    agentReplies24h,
    failed24h,
    pending,
    processing,
    oldestPending,
    stalledProcessing,
    recentTenants,
    database,
  ] = await Promise.all([
    BusinessTenant.countDocuments({}),
    BusinessTenant.countDocuments({ 'subscription.plan': 'trial', ...notExpired }),
    BusinessTenant.countDocuments({ 'subscription.plan': 'trial' }),
    BusinessTenant.aggregate<{ _id: string; count: number }>([
      { $match: { 'subscription.status': 'active', 'subscription.currentPeriodEnd': { $gt: now } } },
      { $group: { _id: '$subscription.plan', count: { $sum: 1 } } },
    ]),
    BusinessTenant.aggregate<{ _id: string | null; count: number }>([
      { $group: { _id: '$whatsapp.status', count: { $sum: 1 } } },
    ]),
    Message.estimatedDocumentCount(),
    Message.countDocuments({ ...recent, direction: 'in' }).setOptions(CROSS_TENANT),
    Message.countDocuments({ ...recent, author: 'bot' }).setOptions(CROSS_TENANT),
    Message.countDocuments({ ...recent, author: 'agent' }).setOptions(CROSS_TENANT),
    Message.countDocuments({ ...recent, replyState: 'failed' }).setOptions(CROSS_TENANT),
    Message.countDocuments({ replyState: 'pending' }).setOptions(CROSS_TENANT),
    Message.countDocuments({ replyState: 'processing' }).setOptions(CROSS_TENANT),
    Message.findOne({ replyState: 'pending' }).sort({ createdAt: 1 }).select('createdAt').setOptions(CROSS_TENANT).lean<{ createdAt?: Date }>(),
    Message.countDocuments({ replyState: 'processing', claimedAt: { $lt: new Date(now.getTime() - SWEEPER_STALE_MS) } }).setOptions(CROSS_TENANT),
    BusinessTenant.find({}).sort({ createdAt: -1 }).limit(8).select('name category subscription.plan subscription.status whatsapp.status createdAt').lean(),
    pingDatabase(),
  ]);

  const paidByPlan = Object.fromEntries(PLAN_KEYS.map((key) => [key, 0])) as Record<PlanKey, number>;
  for (const group of paidGroups) if (group._id in paidByPlan) paidByPlan[group._id as PlanKey] = group.count;

  const whatsapp = { connected: 0, error: 0, disconnected: 0 };
  for (const group of whatsappGroups) {
    const key = (group._id ?? 'disconnected') as keyof typeof whatsapp;
    if (key in whatsapp) whatsapp[key] += group.count;
  }

  const oldestPendingAgeMs = oldestPending?.createdAt ? now.getTime() - new Date(oldestPending.createdAt).getTime() : null;
  let sweeper: PlatformOverview['health']['sweeper'];
  if (stalledProcessing > 0 || (oldestPendingAgeMs ?? 0) > SWEEPER_STALE_MS) {
    sweeper = {
      level: 'down',
      oldestPendingAgeMs,
      stalledProcessing,
      detail: 'Replies are stuck. The reply sweeper is probably not being called; check the external cron schedule.',
    };
  } else if ((oldestPendingAgeMs ?? 0) > BACKLOG_WARN_MS) {
    sweeper = { level: 'warn', oldestPendingAgeMs, stalledProcessing, detail: 'A reply backlog is building up.' };
  } else {
    sweeper = { level: 'ok', oldestPendingAgeMs, stalledProcessing, detail: 'No stuck replies.' };
  }

  return {
    generatedAt: now,
    tenants: {
      total,
      activeTrials,
      expiredTrials: trialsTotal - activeTrials,
      paidByPlan,
      paidTotal: Object.values(paidByPlan).reduce((sum, n) => sum + n, 0),
    },
    whatsapp,
    messages: { totalEstimated, inbound24h, aiReplies24h, agentReplies24h, failed24h, pending, processing },
    health: { database, sweeper },
    recentTenants: recentTenants.map((t) => ({
      id: String(t._id),
      name: t.name,
      category: t.category,
      plan: t.subscription?.plan ?? 'trial',
      status: t.subscription?.status ?? 'trialing',
      whatsappStatus: t.whatsapp?.status ?? 'disconnected',
      createdAt: (t as { createdAt?: Date }).createdAt ?? null,
    })),
  };
}
