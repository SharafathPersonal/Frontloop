import 'server-only';
import { z } from 'zod';

const base64Key32 = z
  .string()
  .refine((v) => Buffer.from(v, 'base64').length === 32, 'must be 32 bytes, base64-encoded');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Phase 0 — required
  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'must be a mongodb:// or mongodb+srv:// URI'),
  MONGODB_DB: z.string().min(1).default('frontloop'),
  AUTH_SECRET: z.string().min(32, 'must be at least 32 characters'),
  TOKEN_ENC_KEY: base64Key32,

  // Phase 1+ — becomes required when the webhook / AI pipeline lands
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_VERIFY_TOKEN: z.string().min(24).optional(),
  GRAPH_API_VERSION: z.string().regex(/^v\d+\.\d+$/).default('v21.0'),
  CRON_SECRET: z.string().min(24).optional(),
  RESEND_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  CEREBRAS_API_KEY: z.string().optional(),

  // Phase 3 — Cashfree Billing
  CASHFREE_APP_ID: z.string().optional(),
  CASHFREE_SECRET_KEY: z.string().optional(),
  CASHFREE_API_VERSION: z.string().default('2023-08-01'),
  // Explicit, never inferred from NODE_ENV: Vercel previews run with NODE_ENV=production.
  CASHFREE_ENV: z.enum(['sandbox', 'production']).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/**
 * Validated on first access rather than at import time, so `next build` can
 * evaluate modules without production secrets present. Any missing or malformed
 * variable throws — there are no fallback defaults for secrets.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

type OptionalSecret = {
  [K in keyof Env]-?: undefined extends Env[K] ? K : never;
}[keyof Env];

/**
 * Phase 1+ variables are optional at boot so unrelated routes keep working, but
 * any code path that depends on one must fail closed when it is absent.
 */
export function requireEnv<K extends OptionalSecret>(key: K): NonNullable<Env[K]> {
  const value = getEnv()[key];
  if (value == null || value === '') throw new Error(`Missing required environment variable: ${key}`);
  return value as NonNullable<Env[K]>;
}
