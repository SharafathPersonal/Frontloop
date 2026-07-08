import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { shop_id, account_email, action_type } = body;

    if (!shop_id || !account_email || !action_type) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    await supabaseAdmin.from('user_activity_logs').insert({
      shop_id,
      account_email,
      action_type,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
