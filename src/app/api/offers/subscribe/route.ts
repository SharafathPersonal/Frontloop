import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { shop_id, endpoint, keys, p256dh: flatP256dh, auth: flatAuth } = body;

    // Resolve nested keys or flat keys
    const p256dh = keys?.p256dh || flatP256dh || null;
    const auth = keys?.auth || flatAuth || null;

    if (!shop_id || !endpoint) {
      return NextResponse.json({ error: 'Missing shop ID or subscription endpoint' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        shop_id,
        endpoint,
        p256dh,
        auth,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
