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

    let resolvedShopId = shop_id;
    if (!resolvedShopId) {
      const host = req.headers.get('host') || '';
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || endpoint.includes('mock-endpoint');
      if (isLocal) {
        const { data: firstShop } = await supabaseAdmin
          .from('shops')
          .select('id')
          .limit(1)
          .maybeSingle();
        if (firstShop) {
          resolvedShopId = firstShop.id;
        }
      }
    }

    if (!resolvedShopId) {
      return NextResponse.json({ error: 'Missing shop ID' }, { status: 400 });
    }

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
