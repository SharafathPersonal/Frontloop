/** Single source of truth for plans: billing, quota grants, landing cards and the settings page. */
export const PLAN_CONFIG = {
  starter: {
    name: 'Starter Plan',
    priceINR: 1499,
    replyQuota: 1000,
    audience: 'Single Clinic & Boutique',
    tagline: 'For solo doctors, boutique salons, and neighbourhood academies starting with WhatsApp automation.',
    extras: [],
    featured: false,
  },
  growth: {
    name: 'Growth Plan',
    priceINR: 3499,
    replyQuota: 3500,
    audience: 'Multi-Doctor & Busy Centres',
    tagline: 'For busy clinics, training institutes, and multi-chair studios handling heavy daily inquiry volumes.',
    extras: ['Guided WhatsApp onboarding support'],
    featured: true,
  },
  pro: {
    name: 'Pro Plan',
    priceINR: 7999,
    replyQuota: 10000,
    audience: 'High-Volume Businesses',
    tagline: 'For multi-branch practices and institutes answering thousands of WhatsApp inquiries every month.',
    extras: ['Guided WhatsApp onboarding support'],
    featured: false,
  },
} as const;

/** Every plan ships the same product; plans differ only by reply allowance and onboarding help. */
export const PLAN_FEATURES = [
  '1 connected WhatsApp Business number',
  'Knowledge base: services, prices, hours & FAQs',
  'English & Manglish understanding',
  'Automatic intent tagging & lead capture',
  'Human takeover with in-dashboard replies',
  'Web chat link & printable QR card',
  'Lead pipeline dashboard & CSV export',
] as const;

export type PlanKey = keyof typeof PLAN_CONFIG;

export const PLAN_KEYS = Object.keys(PLAN_CONFIG) as PlanKey[];

/** Free trial granted at registration; enforced by `subscription.currentPeriodEnd`. */
export const TRIAL_CONFIG = {
  days: 14,
  replyQuota: 300,
} as const;

/** Paid plans are prepaid for this many days per payment. */
export const BILLING_PERIOD_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export const trialEndsAt = (from = Date.now()) => new Date(from + TRIAL_CONFIG.days * DAY_MS);

/**
 * Renewing the same plan before it lapses extends from the current period end;
 * anything else (new plan, lapsed period, trial) starts a fresh period now.
 */
export function nextPeriodEnd(
  current: { plan?: string | null; status?: string | null; currentPeriodEnd?: Date | string | null } | null | undefined,
  plan: PlanKey,
  now = Date.now(),
): Date {
  const currentEnd = current?.currentPeriodEnd ? new Date(current.currentPeriodEnd).getTime() : 0;
  const isEarlySamePlanRenewal = current?.plan === plan && current?.status === 'active' && currentEnd > now;
  return new Date((isEarlySamePlanRenewal ? currentEnd : now) + BILLING_PERIOD_DAYS * DAY_MS);
}

/** Own-key check: `plan in PLAN_CONFIG` would accept inherited keys like "constructor". */
export const isPlanKey = (plan: unknown): plan is PlanKey =>
  typeof plan === 'string' && Object.hasOwn(PLAN_CONFIG, plan);
