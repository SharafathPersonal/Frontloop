/**
 * Shared bootstrap for operational scripts. Scripts run under
 * `tsx --conditions=react-server` so `server-only` modules (db, env, crypto,
 * password) resolve exactly as they do inside Next.js.
 */

/** Loads `.env.local` then `.env`. Variables already in the shell always win. */
export function loadLocalEnv(): void {
  for (const file of ['.env.local', '.env']) {
    try {
      process.loadEnvFile(file);
    } catch {
      // absent file: CI / production inject variables directly
    }
  }
}

export const hasFlag = (flag: string) => process.argv.includes(flag);

/** Seeded demo tenant; the webhook harness locates it by the same slug. */
export const SEED_TENANT_SLUG = process.env.SEED_TENANT_SLUG ?? 'al-shifa-clinic';
export const SEED_PHONE_NUMBER_ID = process.env.SEED_PHONE_NUMBER_ID ?? '100000000000001';
