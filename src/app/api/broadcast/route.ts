import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { BroadcastPayload, Shop, Wallet } from '@/types/broadcast';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    
    // 1. Initialize Supabase Server Client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore if called from context where cookies can't be set
            }
          },
        },
      }
    );

    // 2. Tenant Validation
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await req.json()) as BroadcastPayload;
    
    if (!payload.recipients || payload.recipients.length === 0) {
      return NextResponse.json({ ok: false, error: 'No recipients provided' }, { status: 400 });
    }

    // 3. Fetch Shop and Meta Credentials
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', user.id)
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ ok: false, error: 'Shop profile not found' }, { status: 404 });
    }

    const {
      meta_access_token,
      meta_phone_number_id,
      meta_template_name,
    } = shop as Shop;

    if (!meta_access_token || !meta_phone_number_id || !meta_template_name) {
      return NextResponse.json(
        { ok: false, error: 'Meta Cloud API credentials are not fully configured in shop settings.' },
        { status: 400 }
      );
    }

    // 4. Pre-Flight Credit Check
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('credits_remaining')
      .eq('shop_id', user.id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ ok: false, error: 'Wallet not found' }, { status: 404 });
    }

    const { credits_remaining } = wallet as Wallet;
    const requiredCredits = payload.recipients.length;

    if (credits_remaining < requiredCredits) {
      return NextResponse.json(
        { ok: false, error: `Insufficient credits. You need ${requiredCredits} credits but have ${credits_remaining}.` },
        { status: 402 }
      );
    }

    // 5. Create Campaign Record (Status: processing)
    const { data: campaign, error: campaignInsertError } = await supabase
      .from('campaigns')
      .insert({
        shop_id: user.id,
        title: payload.campaign.title,
        message_body: payload.campaign.message_body,
        image_url: payload.campaign.image_url || null,
        status: 'processing',
        total_recipients: requiredCredits,
      })
      .select()
      .single();

    if (campaignInsertError || !campaign) {
      return NextResponse.json({ ok: false, error: 'Failed to initialize campaign.' }, { status: 500 });
    }

    // 6. Meta API Dispatch Loop
    let successCount = 0;
    
    // We run the requests in parallel, but you might want to batch/throttle them for a true production system
    const dispatchPromises = payload.recipients.map(async (recipient) => {
      // Format number (strip +, spaces, etc.)
      const formattedPhone = recipient.phone.replace(/\D/g, '');
      
      const customParam = payload.campaign.message_body.replace('{name}', recipient.name || 'Customer');

      try {
        const response = await fetch(
          `https://graph.facebook.com/v20.0/${meta_phone_number_id}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${meta_access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: formattedPhone,
              type: 'template',
              template: {
                name: meta_template_name,
                language: { code: 'en_US' },
                components: [
                  {
                    type: 'body',
                    parameters: [
                      {
                        type: 'text',
                        text: customParam,
                      },
                    ],
                  },
                ],
              },
            }),
          }
        );

        if (response.ok) {
          successCount++;
        } else {
          // Log specific meta errors to your backend monitoring
          const errData = await response.json().catch(() => null);
          console.error(`Meta API Error for ${formattedPhone}:`, errData);
        }
      } catch (err) {
        console.error(`Network Error calling Meta API for ${formattedPhone}:`, err);
      }
    });

    await Promise.all(dispatchPromises);

    // 7. Wallet Ledger Balance Settlement & Campaign Update
    if (successCount > 0) {
      // Deduct credits via atomic rpc if defined, otherwise via standard update
      const { error: deductError } = await supabase.rpc('deduct_credits', {
        p_shop_id: user.id,
        p_amount: successCount,
      });

      if (deductError) {
        // Fallback to basic update if RPC fails
        await supabase
          .from('wallets')
          .update({
            credits_remaining: credits_remaining - successCount,
            updated_at: new Date().toISOString(),
          })
          .eq('shop_id', user.id);
      }
    }

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({
        status: successCount > 0 ? 'completed' : 'pending', // Could be 'failed' if successCount is 0 and we tried
        total_recipients: successCount, // Optional: update to reflect actual successes
      })
      .eq('id', campaign.id);

    return NextResponse.json({
      ok: true,
      data: {
        attempted: requiredCredits,
        successful: successCount,
      },
    });

  } catch (err: any) {
    console.error('Broadcast Route Error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
