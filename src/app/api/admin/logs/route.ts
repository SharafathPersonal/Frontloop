import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
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
