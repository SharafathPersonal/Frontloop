import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 50;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data: logs, error } = await supabaseAdmin
      .from('user_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
