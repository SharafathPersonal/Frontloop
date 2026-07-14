import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@trueattendly.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* noop */ }
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfiguration: Missing service role key' }, { status: 500 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const {
      id,
      product_name,
      original_price,
      discount_price,
      offer_description,
      show_percentage_badge,
      show_discount_price,
      is_active,
      image_url,
      broadcast_web_push
    } = await req.json();

    if (!product_name || typeof original_price !== 'number' || typeof discount_price !== 'number') {
      return NextResponse.json({ error: 'Missing required offer parameters' }, { status: 400 });
    }

    // Fetch dynamic pricing settings
    const { data: settingsData } = await supabaseAdmin
      .from('system_settings')
      .select('key, value');

    const settingsMap = (settingsData || []).reduce((acc: any, row: any) => {
      acc[row.key] = Number(row.value);
      return acc;
    }, {});

    const baseCost = settingsMap['flash_offer_base_cost'] !== undefined ? settingsMap['flash_offer_base_cost'] : 2.0;
    const pushCost = settingsMap['flash_offer_push_cost'] !== undefined ? settingsMap['flash_offer_push_cost'] : 2.0;

    const isInsertion = !id;
    let requiredCredits = 0;
    if (isInsertion) {
      requiredCredits = broadcast_web_push ? (baseCost + pushCost) : baseCost;
    } else {
      requiredCredits = broadcast_web_push ? pushCost : 0;
    }

    if (requiredCredits > 0) {
      // 1. Check merchant balance
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('credits_remaining')
        .eq('shop_id', user.id)
        .single();

      if (walletError || !wallet || wallet.credits_remaining < requiredCredits) {
        return NextResponse.json(
          { error: `Insufficient credits for transaction. Required: ${requiredCredits} credits.` },
          { status: 403 }
        );
      }

      // 2. Deduct requiredCredits
      const { error: deductError } = await supabaseAdmin.rpc('deduct_credits', {
        p_shop_id: user.id,
        p_amount: requiredCredits
      });

      if (deductError) {
        return NextResponse.json(
          { error: `Insufficient credits for transaction. Required: ${requiredCredits} credits.` },
          { status: 403 }
        );
      }
    }

    // 3. Execute insertion/update
    try {
      let result;
      if (id) {
        const { data, error } = await supabaseAdmin
          .from('shop_flash_offers')
          .update({
            product_name: product_name.trim(),
            original_price,
            discount_price,
            offer_description: offer_description ? offer_description.trim() : null,
            show_percentage_badge: !!show_percentage_badge,
            show_discount_price: !!show_discount_price,
            is_active: is_active !== undefined ? !!is_active : true,
            image_url: image_url ? image_url.trim() : null
          })
          .eq('id', id)
          .eq('shop_id', user.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabaseAdmin
          .from('shop_flash_offers')
          .insert({
            shop_id: user.id,
            product_name: product_name.trim(),
            original_price,
            discount_price,
            offer_description: offer_description ? offer_description.trim() : null,
            show_percentage_badge: !!show_percentage_badge,
            show_discount_price: !!show_discount_price,
            is_active: is_active !== undefined ? !!is_active : true,
            image_url: image_url ? image_url.trim() : null
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      // 4. Handle Web Push Broadcast if requested
      if (broadcast_web_push && result) {
        // Fetch active push subscriptions for the shop
        const { data: subscriptions } = await supabaseAdmin
          .from('push_subscriptions')
          .select('*')
          .eq('shop_id', user.id);

        const countVal = subscriptions?.length || 0;

        // Update push_sent_count on the saved offer
        if (countVal > 0 && subscriptions) {
          const newSentCount = (result.push_sent_count || 0) + countVal;
          const { data: updatedResult, error: updateErr } = await supabaseAdmin
            .from('shop_flash_offers')
            .update({
              push_sent_count: newSentCount
            })
            .eq('id', result.id)
            .select()
            .single();

          if (!updateErr && updatedResult) {
            result = updatedResult;
          }
          
          // Get shop slug for proper URL routing
          const { data: shopData } = await supabaseAdmin.from('shops').select('slug').eq('id', user.id).single();
          const shopSlug = shopData?.slug || '';
          
          const clickUrl = `/api/offers/click?offerId=${result.id}&url=${encodeURIComponent(`/offers/${shopSlug}`)}`;
          
          const payloadStr = JSON.stringify({
            title: `⚡ ${result.product_name}`,
            body: result.offer_description || `Grab it now for just ₹${result.discount_price}!`,
            icon: result.image_url || '/icon.png',
            data: {
              url: clickUrl
            }
          });

          // Dispatch payloads in parallel
          const pushPromises = subscriptions.map(sub => {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            };
            return webpush.sendNotification(pushSubscription, payloadStr).catch(err => {
              if (err.statusCode === 410 || err.statusCode === 404) {
                // Subscription has expired or is no longer valid, delete it
                return supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
              }
              console.error('Push error:', err);
            });
          });
          
          // Await to ensure Vercel serverless function doesn't exit before dispatch
          await Promise.allSettled(pushPromises);
        }
      }

      return NextResponse.json({ ok: true, data: result });

    } catch (mutationError: any) {
      // Rollback deduction if insertion/update failed
      if (requiredCredits > 0) {
        await supabaseAdmin.rpc('increment', {
          row_id: user.id,
          value: requiredCredits
        });
      }
      return NextResponse.json(
        { error: mutationError.message || 'Failed to persist offer.' },
        { status: 500 }
      );
    }

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
