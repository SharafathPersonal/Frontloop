import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

export async function GET() {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Missing service role key' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const nowIso = new Date().toISOString();

    // 1. Find all draft offers that should be live (start_at <= NOW())
    const { data: startedOffers } = await supabase
      .from('shop_flash_offers')
      .select('*, shop:shops(*)')
      .eq('status', 'draft')
      .lte('start_at', nowIso)
      .eq('is_deleted', false)
      .eq('is_active', true);

    let processedCount = 0;
    if (startedOffers && startedOffers.length > 0) {
      for (const offer of startedOffers) {
        // Update status to active
        await supabase
          .from('shop_flash_offers')
          .update({ status: 'active' })
          .eq('id', offer.id);

        // Send push notification if scheduled for broadcast
        if (offer.broadcast_web_push && !offer.push_sent) {
          const shop = offer.shop;
          if (shop) {
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

            if (vapidPublicKey && vapidPrivateKey) {
              webpush.setVapidDetails(
                'mailto:support@trueattendly.online',
                vapidPublicKey,
                vapidPrivateKey
              );

              // Get subscriptions
              const { data: subscriptions } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('shop_id', shop.id);

              if (subscriptions && subscriptions.length > 0) {
                const payload = JSON.stringify({
                  title: `${shop.shop_name}: New Flash Offer!`,
                  body: `${offer.product_name} is now live!`,
                  icon: offer.image_url || shop.logo_url || '/images/logo-light.png',
                  data: {
                    click_url: `${process.env.NEXT_PUBLIC_APP_URL}/offers/${shop.slug}?click_offer_id=${offer.id}`,
                    offer_id: offer.id,
                    offerId: offer.id,
                    shop_slug: shop.slug,
                    shopSlug: shop.slug
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
                    console.error('[Web Push Dispatch] Delivery failed for subscription ID:', sub.id, err);
                    const isGone = err.statusCode === 410;
                    const isNotFound = err.statusCode === 404;
                    const isInvalid = err.statusCode === 400;
                    
                    if (isGone || isNotFound || isInvalid) {
                      console.log(`[Web Push Dispatch] Subscription ID ${sub.id} is obsolete/expired (status ${err.statusCode}). Marking for database deletion.`);
                      failedIds.push(sub.id);
                    } else {
                      console.warn(`[Web Push Dispatch] Transient error for subscription ID ${sub.id}:`, err.message || err);
                      sentCount++;
                    }
                  }
                });
                await Promise.all(sendPromises);

                if (failedIds.length > 0) {
                  console.log(`[Web Push Dispatch] Purging ${failedIds.length} obsolete subscriptions from the database...`);
                  const { error: purgeError } = await supabase
                    .from('push_subscriptions')
                    .delete()
                    .in('id', failedIds);
                  if (purgeError) {
                    console.error('[Web Push Dispatch] Failed to delete obsolete subscriptions:', purgeError);
                  } else {
                    console.log('[Web Push Dispatch] Obsolete subscriptions purged successfully.');
                  }
                }

                await supabase
                  .from('shop_flash_offers')
                  .update({ push_sent: true, push_sent_count: sentCount })
                  .eq('id', offer.id);
              }
            }
          }
        }
        processedCount++;
      }
    }

    // 2. Find all active offers that should be expired (end_at <= NOW())
    const { count: expiredCount } = await supabase
      .from('shop_flash_offers')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lte('end_at', nowIso);

    return NextResponse.json({
      ok: true,
      activated: processedCount,
      expired: expiredCount || 0
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
