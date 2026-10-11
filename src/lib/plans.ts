/** Single source of truth for paid plans: billing, quota grants, and the settings page. */
export const PLAN_CONFIG = {
  starter: {
    name: 'Starter Plan',
    priceINR: 1499,
    replyQuota: 1000,
  },
  growth: {
    name: 'Growth Plan',
    priceINR: 3499,
    replyQuota: 3500,
  },
  pro: {
    name: 'Pro Plan',
    priceINR: 7999,
    replyQuota: 10000,
  },
} as const;

export type PlanKey = keyof typeof PLAN_CONFIG;

/** Own-key check: `plan in PLAN_CONFIG` would accept inherited keys like "constructor". */
export const isPlanKey = (plan: unknown): plan is PlanKey =>
  typeof plan === 'string' && Object.hasOwn(PLAN_CONFIG, plan);
