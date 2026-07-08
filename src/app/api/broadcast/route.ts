import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { BroadcastPayload, Shop, Wallet, CustomerTag } from '@/types/broadcast';

interface CustomerRecord { customer_name: string; whatsapp_number: string; tags: CustomerTag[]; }

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
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* noop in read-only context */ }
          },
        },
      }
    );

    // 1. Tenant Validation
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await req.json()) as BroadcastPayload;

    if (!payload.targetTags || payload.targetTags.length === 0) {
      return NextResponse.json({ ok: false, error: 'No target audience tags provided' }, { status: 400 });
    }

    // 2. Fetch Shop & Meta Credentials
    const { data: shop, error: shopError } = await supabase.from('shops').select('*').eq('id', user.id).maybeSingle();
    if (shopError || !shop) {
      return NextResponse.json({ ok: false, error: 'Shop profile not found' }, { status: 404 });
    }

    const { meta_access_token, meta_phone_number_id, meta_template_name } = shop as Shop;
    if (!meta_access_token || !meta_phone_number_id || !meta_template_name) {
      return NextResponse.json({ ok: false, error: 'Meta Cloud API credentials are not fully configured in shop settings.' }, { status: 400 });
    }

    // 3. Resolve Recipients from customers_master by targetTags (any overlap is fine)
    const { data: recipientsData, error: recipientsError } = await supabase
      .from('customers_master')
      .select('customer_name, whatsapp_number, tags')
      .eq('shop_id', user.id)
      .overlaps('tags', payload.targetTags);

    if (recipientsError) {
      return NextResponse.json({ ok: false, error: 'Failed to load recipients' }, { status: 500 });
    }

    const recipients: CustomerRecord[] = recipientsData ?? [];
    if (recipients.length === 0) {
      return NextResponse.json({ ok: false, error: 'No contacts found for selected tags.' }, { status: 400 });
    }

    // 4. Pre-Flight Credit Check
    const { data: wallet, error: walletError } = await supabase.from('wallets').select('credits_remaining').eq('shop_id', user.id).maybeSingle();
    if (walletError || !wallet) {
      return NextResponse.json({ ok: false, error: 'Wallet not found' }, { status: 404 });
    }

    const { credits_remaining } = wallet as Wallet;
    const requiredCredits = recipients.length;

    if (credits_remaining < requiredCredits) {
      return NextResponse.json(
        { ok: false, error: `Insufficient credits. Need ${requiredCredits}, have ${credits_remaining}.` },
        { status: 402 }
      );
    }

    // 4.5. Idempotency Key Security
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingCampaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('shop_id', user.id)
      .eq('title', payload.campaign.title)
      .eq('total_recipients', requiredCredits)
      .eq('status', 'processing')
      .gte('created_at', fiveMinsAgo)
      .maybeSingle();

    if (existingCampaign) {
      return NextResponse.json(
        { ok: false, error: 'Idempotency Conflict: An identical campaign is currently processing.' },
        { status: 409 }
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

    // 6. Meta API Dispatch Loop (Row-by-Row Execution)
    let successCount = 0;
    let failedCount = 0;

    const dispatchPromises = recipients.map(async (recipient) => {
      const formattedPhone = recipient.whatsapp_number.replace(/\D/g, '');
      const customParam = payload.campaign.message_body.replace('{name}', recipient.customer_name || 'Customer');

      try {
        const response = await fetch(
          `https://graph.facebook.com/v20.0/${meta_phone_number_id}/messages`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${meta_access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: formattedPhone,
              type: 'template',
              template: {
                name: meta_template_name,
                language: { code: 'en_US' },
                components: [{ type: 'body', parameters: [{ type: 'text', text: customParam }] }],
              },
            }),
          }
        );
        
        if (response.status === 200) {
          // Trigger atomic 1-credit deduction via RPC ONLY on success
          const { error: deductError } = await supabase.rpc('deduct_credits', { p_shop_id: user.id, p_amount: 1 });
          if (!deductError) {
            successCount++;
          } else {
            failedCount++; // Deduct failed, treat as failed delivery
          }
        } else {
          // Meta rejected it (rate limit, bad phone, etc)
          failedCount++;
        }
      } catch (err) {
        // Network or fetch failure — skip this recipient
        failedCount++;
      }
    });

    await Promise.all(dispatchPromises);

    // 7. Update Campaign Status
    await supabase.from('campaigns').update({
      status: successCount > 0 || failedCount === 0 ? 'completed' : 'failed',
      total_recipients: successCount,
    }).eq('id', campaign.id);

    return NextResponse.json({ ok: true, data: { attempted: requiredCredits, successful: successCount, failed: failedCount } });

  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
