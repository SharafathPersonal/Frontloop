import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

if (
  process.env.NODE_ENV !== 'test' &&
  (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
) {
  console.warn(
    '[SupabaseClient] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. ' +
    'Configure your .env.local file before going to production.'
  );
}

/**
 * Browser-side Supabase client.
 * Typed as `any` at the query level to avoid "never" inference errors
 * when the remote database schema is not yet reflected in the local type system.
 * Replace `any` with `Database` from @/types/broadcast once you have
 * run the Supabase schema migration and the project is connected.
 *
 * Usage: import { supabase, db } from '@/lib/supabaseClient'
 * - `supabase` → Supabase client instance (auth, storage, realtime)
 * - `db(table)` → type-escaped shorthand for supabase.from(table)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createBrowserClient<any>(supabaseUrl, supabaseAnonKey);

/**
 * Convenience helper for database table access.
 * Bypasses strict Database generic inference until remote schema is applied.
 * @example const { data } = await db('shops').select('*').eq('id', userId).single();
 */
export function db(table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(table);
}

export default supabase;
