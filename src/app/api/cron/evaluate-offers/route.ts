import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

export async function GET(req: Request) {
  try {
    // Validate cron secret if deployed to Vercel (optional but recommended)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    const nowIso = new Date().toISOString();

    // 1. Fetch all draft offers that need to be activated
    const { data: draftsToActivate, error: draftErr } = await supabaseAdmin
      .from('shop_flash_offers')
      .select('*, shops (id, shop_name, logo_url, slug)')
      .eq('status', 'draft')
      .lte('start_at', nowIso)
      .eq('is_deleted', false)
      .eq('is_active', true);

    if (draftErr) {
      console.error('Error fetching drafts:', draftErr);
    } else if (draftsToActivate && draftsToActivate.length > 0) {
      // Transition to active
      await supabaseAdmin
        .from('shop_flash_offers')
        .update({ status: 'active' })
        .in('id', draftsToActivate.map(o => o.id));

      const pushPending = draftsToActivate.filter(o => o.broadcast_web_push && !o.push_sent);
      
      if (pushPending.length > 0) {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        if (vapidPublicKey && vapidPrivateKey) {
          webpush.setVapidDetails(
            'mailto:support@trueattendly.online',
            vapidPublicKey,
            vapidPrivateKey
          );

          // Group offers by shop_id to batch fetch subscriptions
          const shopIds = [...new Set(pushPending.map(o => o.shop_id))];
          
          for (const shopId of shopIds) {
            const shopOffers = pushPending.filter(o => o.shop_id === shopId);
            const shop = shopOffers[0].shops; // From joined table

            const { data: subscriptions } = await supabaseAdmin
              .from('push_subscriptions')
              .select('*')
              .eq('shop_id', shopId);

            if (subscriptions && subscriptions.length > 0) {
              for (const offer of shopOffers) {
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
                const failedIds: string[] = [];
                const sendPromises = subscriptions.map(async (sub: any) => {
                  try {
                    const isMock = sub.endpoint?.includes('mock-endpoint') || sub.endpoint?.includes('trueattendly.online');
                    if (isMock) {
                      sentCount++;
                    } else {
                      await webpush.sendNotification({
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
                      failedIds.push(sub.id);
                    }
                  }
                });

                await Promise.all(sendPromises);

                if (failedIds.length > 0) {
                  await supabaseAdmin
                    .from('push_subscriptions')
                    .delete()
                    .in('id', failedIds);
                }

                await supabaseAdmin
                  .from('shop_flash_offers')
                  .update({ push_sent: true, push_sent_count: sentCount })
                  .eq('id', offer.id);
              }
            }
          }
        }
      }
    }

    // 2. Auto-expire any active offers that have reached end_at
    await supabaseAdmin
      .from('shop_flash_offers')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lte('end_at', nowIso);

    return NextResponse.json({ ok: true, processed: draftsToActivate?.length || 0 });
  } catch (err: any) {
    console.error('Cron job error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
