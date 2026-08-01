import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// FIX CRITICAL #4: The supabase admin client is now created per-request (inside
// the handler) rather than at module load time. A strict admin_session cookie
// verification gate now blocks all unauthenticated callers before any DB query.

export async function GET(req: Request) {
  try {
    // ── STEP 1: Admin session gate ────────────────────────────────────────────
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin_session');
    const adminSecret = process.env.ADMIN_SECURE_TOKEN;

    if (!adminSession?.value || !adminSecret || adminSession.value !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── STEP 2: Fail explicitly if service role key is absent ─────────────────
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── STEP 3: Serve requested log type ─────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '0', 10);
    const type = searchParams.get('type') || 'activity';
    const limit = 20;
    const from = page * limit;
    const to = from + limit - 1;

    if (type === 'system') {
      const { data, error } = await supabaseAdmin
        .from('system_logs')
        .select(`
          id,
          error_type,
          failure_reason,
          created_at,
          campaign_id,
          shops ( shop_name )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const hasMore = data ? data.length === limit : false;
      return NextResponse.json({ logs: data || [], hasMore });
    } else {
      const { data, error } = await supabaseAdmin
        .from('user_activity_logs')
        .select(`
          id,
          account_email,
          action_type,
          created_at,
          shop_id
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const hasMore = data ? data.length === limit : false;
      return NextResponse.json({ logs: data || [], hasMore });
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
