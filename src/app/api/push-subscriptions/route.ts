import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { shop_id, endpoint, keys, p256dh: flatP256dh, auth: flatAuth } = body;

    // Resolve nested keys or flat keys
    const p256dh = keys?.p256dh || flatP256dh || null;
    const auth = keys?.auth || flatAuth || null;

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing subscription endpoint' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable' }, { status: 500 });
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

    if (!shop_id) {
      return NextResponse.json({ error: 'Missing shop_id parameter' }, { status: 400 });
    }

    // Verify shop_id exists
    const { data: validShop, error: shopErr } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('id', shop_id)
      .maybeSingle();

    if (shopErr || !validShop) {
      return NextResponse.json({ error: 'Invalid or unauthorized shop ID' }, { status: 400 });
    }

    const resolvedShopId = shop_id;

    // Upsert subscription using unique composite key (shop_id, endpoint) conflict resolution
    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        shop_id: resolvedShopId,
        endpoint,
        p256dh,
        auth,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'shop_id,endpoint'
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
