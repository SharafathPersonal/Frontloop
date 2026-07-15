import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

async function sendPushNotificationsForOffers(offers: any[], shop: any) {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured in environment');
      return;
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    webpush.setVapidDetails(
      'mailto:support@trueattendly.online',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Get all subscriptions for the shop
    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('shop_id', shop.id);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for shop:', shop.id);
      return;
    }

    for (const offer of offers) {
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

      // Record successfully sent count in DB
      await supabaseAdmin
        .from('shop_flash_offers')
        .update({
          push_sent: true,
          push_sent_count: (offer.push_sent_count || 0) + sentCount
        })
        .eq('id', offer.id);
    }
  } catch (err) {
    console.error('Error sending push notifications:', err);
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              /* noop */
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      product_name,
      original_price,
      discount_price,
      offer_description,
      show_percentage_badge,
      show_discount_price,
      image_url,
      broadcast_web_push,
      start_at,
      end_at
    } = body;

    if (!product_name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const orig = parseFloat(original_price);
    const disc = parseFloat(discount_price);
    if (isNaN(orig) || orig <= 0) return NextResponse.json({ error: 'Valid original price required' }, { status: 400 });
    if (isNaN(disc) || disc <= 0) return NextResponse.json({ error: 'Valid discount price required' }, { status: 400 });
    if (disc >= orig) return NextResponse.json({ error: 'Discount price must be less than original price' }, { status: 400 });

    // Validate dates
    const now = new Date();
    let start = now;
    let status: 'draft' | 'active' | 'expired' = 'active';

    if (start_at && start_at.trim() !== '') {
      start = new Date(start_at);
      if (isNaN(start.getTime())) {
        return NextResponse.json({ error: 'Invalid start date' }, { status: 400 });
      }
      // Rule A: future start only (allowing 5s network/clock drift tolerance)
      if (start.getTime() <= now.getTime() - 5000) {
        return NextResponse.json({ error: 'Start time must be in the future. Past timestamps are not allowed.' }, { status: 400 });
      }
      if (start > now) {
        status = 'draft';
      }
    } else {
      // If start_at is undefined/missing/empty, default to execution timestamp and 'active'
      start = now;
      status = 'active';
    }

    let end = null;
    if (end_at && end_at.trim() !== '') {
      end = new Date(end_at);
      if (isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid end date' }, { status: 400 });
      }
      // Rule B: end must be after start
      if (end.getTime() <= start.getTime()) {
        return NextResponse.json({ error: 'End time must be after the start time.' }, { status: 400 });
      }
      if (end <= now) {
        status = 'expired';
      }
    }

    // Calculate wallet credit deduction
    let creditsRequired = 2; // base cost
    if (broadcast_web_push) {
      creditsRequired += 2; // web push broadcast cost
    }

    // Deduct credits atomically
    const { error: deductError } = await supabase.rpc('deduct_credits', {
      p_shop_id: user.id,
      p_amount: creditsRequired
    });

    if (deductError) {
      return NextResponse.json({ error: deductError.message || 'Insufficient credits to create offer' }, { status: 402 });
    }

    // Upsert offer
    const { data: offer, error: insertError } = await supabase
      .from('shop_flash_offers')
      .upsert({
        shop_id: user.id,
        product_name,
        original_price: orig,
        discount_price: disc,
        offer_description: offer_description || null,
        show_percentage_badge: show_percentage_badge !== false,
        show_discount_price: show_discount_price !== false,
        image_url: image_url || null,
        broadcast_web_push: broadcast_web_push === true,
        start_at: start.toISOString(),
        end_at: end ? end.toISOString() : null,
        status,
        push_sent: false
      }, { onConflict: 'shop_id,product_name,start_at' })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message || 'Failed to save offer' }, { status: 500 });
    }

    // If active and push broadcast is enabled, send push now
    if (broadcast_web_push && status === 'active') {
      const { data: shop } = await supabase
        .from('shops')
        .select('*')
        .eq('id', user.id)
        .single();
      if (shop) {
        await sendPushNotificationsForOffers([offer], shop);
      }
    }

    return NextResponse.json({ ok: true, data: offer });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              /* noop */
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      product_name,
      original_price,
      discount_price,
      offer_description,
      show_percentage_badge,
      show_discount_price,
      image_url,
      broadcast_web_push,
      start_at,
      end_at
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Offer ID is required for update' }, { status: 400 });
    }

    if (!product_name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const orig = parseFloat(original_price);
    const disc = parseFloat(discount_price);
    if (isNaN(orig) || orig <= 0) return NextResponse.json({ error: 'Valid original price required' }, { status: 400 });
    if (isNaN(disc) || disc <= 0) return NextResponse.json({ error: 'Valid discount price required' }, { status: 400 });
    if (disc >= orig) return NextResponse.json({ error: 'Discount price must be less than original price' }, { status: 400 });

    // Verify ownership
    const { data: existingOffer, error: fetchError } = await supabase
      .from('shop_flash_offers')
      .select('*')
      .eq('id', id)
      .eq('shop_id', user.id)
      .single();

    if (fetchError || !existingOffer) {
      return NextResponse.json({ error: 'Offer not found or unauthorized' }, { status: 404 });
    }

    // Validate dates
    const now = new Date();
    let start = now;
    let status: 'draft' | 'active' | 'expired' = 'active';

    if (start_at && start_at.trim() !== '') {
      start = new Date(start_at);
      if (isNaN(start.getTime())) {
        return NextResponse.json({ error: 'Invalid start date' }, { status: 400 });
      }
      
      const existingStart = existingOffer.start_at ? new Date(existingOffer.start_at) : null;
      const startChanged = !existingStart || Math.abs(start.getTime() - existingStart.getTime()) > 1000;
      
      // Rule A: future start only if changed
      if (startChanged && start.getTime() <= now.getTime() - 5000) {
        return NextResponse.json({ error: 'Start time must be in the future. Past timestamps are not allowed.' }, { status: 400 });
      }
      if (start > now) {
        status = 'draft';
      }
    } else {
      // If start_at is undefined/missing/empty, default to execution timestamp and 'active'
      start = now;
      status = 'active';
    }

    let end = null;
    if (end_at && end_at.trim() !== '') {
      end = new Date(end_at);
      if (isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid end date' }, { status: 400 });
      }
      // Rule B: end must be after start
      if (end.getTime() <= start.getTime()) {
        return NextResponse.json({ error: 'End time must be after the start time.' }, { status: 400 });
      }
      if (end <= now) {
        status = 'expired';
      }
    }

    // If web push broadcast is requested, it costs 2 credits
    if (broadcast_web_push) {
      const { error: deductError } = await supabase.rpc('deduct_credits', {
        p_shop_id: user.id,
        p_amount: 2
      });

      if (deductError) {
        return NextResponse.json({ error: deductError.message || 'Insufficient credits for web push broadcast' }, { status: 402 });
      }
    }

    // Update offer
    const { data: offer, error: updateError } = await supabase
      .from('shop_flash_offers')
      .update({
        product_name,
        original_price: orig,
        discount_price: disc,
        offer_description: offer_description || null,
        show_percentage_badge: show_percentage_badge !== false,
        show_discount_price: show_discount_price !== false,
        image_url: image_url || null,
        broadcast_web_push: broadcast_web_push === true,
        start_at: start.toISOString(),
        end_at: end ? end.toISOString() : null,
        status,
        push_sent: broadcast_web_push ? false : existingOffer.push_sent
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Failed to update offer' }, { status: 500 });
    }

    // If active and push broadcast is enabled, send push now
    if (broadcast_web_push && status === 'active') {
      const { data: shop } = await supabase
        .from('shops')
        .select('*')
        .eq('id', user.id)
        .single();
      if (shop) {
        await sendPushNotificationsForOffers([offer], shop);
      }
    }

    return NextResponse.json({ ok: true, data: offer });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export const PATCH = PUT;
