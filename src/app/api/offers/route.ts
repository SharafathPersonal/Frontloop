import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

    const cookieStore = await cookies();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* noop for service role */ },
        },
      }
    );

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'newest';

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Find shop by slug
    const { data: shop, error: shopErr } = await supabase
      .from('shops')
      .select('id, shop_name, logo_url, invoice_theme_color, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (shopErr || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    // Auto-activate any drafts that have reached start_at
    const { data: draftsToActivate } = await supabase
      .from('shop_flash_offers')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('status', 'draft')
      .lte('start_at', nowIso)
      .eq('is_deleted', false)
      .eq('is_active', true);

    if (draftsToActivate && draftsToActivate.length > 0) {
      await supabase
        .from('shop_flash_offers')
        .update({ status: 'active' })
        .in('id', draftsToActivate.map(o => o.id));

      const pushPending = draftsToActivate.filter(o => o.broadcast_web_push && !o.push_sent);
      if (pushPending.length > 0) {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        if (vapidPublicKey && vapidPrivateKey) {
          const { default: webpushMod } = await import('web-push');
          webpushMod.setVapidDetails(
            'mailto:support@trueattendly.online',
            vapidPublicKey,
            vapidPrivateKey
          );

          const { data: subscriptions } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('shop_id', shop.id);

          if (subscriptions && subscriptions.length > 0) {
            for (const offer of pushPending) {
              const payload = JSON.stringify({
                title: `${shop.shop_name}: New Flash Offer!`,
                body: `${offer.product_name} is now live!`,
                icon: offer.image_url || shop.logo_url || '/images/logo-light.png',
                data: {
                  click_url: `${process.env.NEXT_PUBLIC_APP_URL}/offers/${shop.slug}?click_offer_id=${offer.id}`,
                  offer_id: offer.id
                }
              });

              let sentCount = 0;
              const sendPromises = subscriptions.map(async (sub: any) => {
                try {
                  const isMock = sub.endpoint?.includes('mock-endpoint') || sub.endpoint?.includes('trueattendly.online');
                  if (isMock) {
                    sentCount++;
                  } else {
                    await webpushMod.sendNotification({
                      endpoint: sub.endpoint,
                      keys: {
                        auth: sub.auth,
                        p256dh: sub.p256dh
                      }
                    }, payload);
                    sentCount++;
                  }
                } catch (err: any) {
                  sentCount++;
                  const shouldPurge = err.statusCode === 410 || 
                                      err.statusCode === 404 || 
                                      err.code === 'ENOTFOUND' || 
                                      err.code === 'EAI_AGAIN' ||
                                      err.statusCode === undefined;
                  if (shouldPurge) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                  }
                }
              });
              await Promise.all(sendPromises);

              await supabase
                .from('shop_flash_offers')
                .update({ push_sent: true, push_sent_count: sentCount })
                .eq('id', offer.id);
            }
          }
        }
      }
    }

    // Auto-expire any active offers that have reached end_at
    await supabase
      .from('shop_flash_offers')
      .update({ status: 'expired' })
      .eq('shop_id', shop.id)
      .eq('status', 'active')
      .lte('end_at', nowIso);

    // Fetch active, non-deleted offers with filters, sorting, and pagination bounds
    let query = supabase
      .from('shop_flash_offers')
      .select('id, product_name, offer_description, original_price, discount_price, show_percentage_badge, show_discount_price, image_url, created_at, push_shared_count, start_at, end_at, status')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .eq('status', 'active');

    if (search.trim()) {
      query = query.ilike('product_name', `%${search.trim()}%`);
    }

    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort === 'price-asc') {
      query = query.order('discount_price', { ascending: true });
    } else if (sort === 'price-desc') {
      query = query.order('discount_price', { ascending: false });
    }

    const { data: offers } = await query.range(start, end);


    return NextResponse.json({
      shop: { id: shop.id, name: shop.shop_name, logo_url: shop.logo_url, theme_color: shop.invoice_theme_color || '#5C4033' },
      offers: offers || [],
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
