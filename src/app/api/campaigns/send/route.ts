import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { getWhatsAppSocket } from '@/lib/whatsapp-bridge';
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

    // 2. Fetch Shop & Check Mode
    const { data: shop, error: shopError } = await supabase.from('shops').select('*').eq('id', user.id).maybeSingle();
    if (shopError || !shop) {
      return NextResponse.json({ ok: false, error: 'Shop profile not found' }, { status: 404 });
    }

    const { meta_access_token, meta_phone_number_id, meta_template_name, whatsapp_mode, anti_ban_delay, qr_express_status } = shop as Shop;
    
    if (!whatsapp_mode || whatsapp_mode === 'NONE') {
      return NextResponse.json({ ok: false, error: 'Please configure a WhatsApp Connection Mode (Meta API or QR Express) in Settings.' }, { status: 400 });
    }

    if (whatsapp_mode === 'META_API') {
      if (!meta_access_token || !meta_phone_number_id || !meta_template_name) {
        return NextResponse.json({ ok: false, error: 'Meta Cloud API credentials are not fully configured in shop settings.' }, { status: 400 });
      }
    }

    if (whatsapp_mode === 'QR_EXPRESS') {
      if (qr_express_status === 'disconnected') {
        return NextResponse.json({ ok: false, error: 'Your WhatsApp device is disconnected. Please reconnect your device in Settings to resume broadcasts.' }, { status: 400 });
      }
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
        title: `${payload.campaign.title} [Tags: ${payload.targetTags.join(', ')}]`,
        message_body: payload.campaign.message_body,
        image_url: payload.campaign.image_url || null,
        status: 'processing',
        total_recipients: requiredCredits,
        dispatch_mode: whatsapp_mode,
      })
      .select()
      .single();

    if (campaignInsertError || !campaign) {
      return NextResponse.json({ ok: false, error: 'Failed to initialize campaign.' }, { status: 500 });
    }

    // 6. Helper Functions for Async Processing
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: Message dispatch took longer than 10 seconds')), timeoutMs)
        ),
      ]);
    };

    // 7. Branch Dispatch Logic based on Mode
    if (whatsapp_mode === 'QR_EXPRESS') {
      
      // BACKGROUND PROCESSING QUEUE FOR QR EXPRESS
      // We process this in a Next.js waitUntil() block to prevent early garbage collection or Vercel timeouts.
      waitUntil((async () => {
        let successCount = 0;
        let failedCount = 0;
        
        try {
          for (const recipient of recipients) {
            let cleanPhone = recipient.whatsapp_number.replace(/\D/g, '');
            if (cleanPhone.length === 10) {
              cleanPhone = '91' + cleanPhone;
            }
            if (cleanPhone.length < 11 || cleanPhone.length > 15) {
              failedCount++;
              await supabase.from('message_logs').insert({
                campaign_id: campaign.id,
                meta_message_id: `qr_express_fail_invalid_phone_${Date.now()}_${cleanPhone || 'unknown'}`,
                recipient_phone: cleanPhone || 'unknown',
                status: 'failed'
              });
              await supabase.rpc('increment_campaign_metric', { campaign_row_id: campaign.id, metric_name: 'failed', quantity: 1 });
              continue;
            }
            const formattedPhone = cleanPhone;
            
            // Apply Template Params
            let messageText = payload.campaign.message_body;
            if (payload.templateParams) {
               Object.keys(payload.templateParams).forEach(key => {
                 messageText = messageText.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), payload.templateParams![key]);
               });
            }
            messageText = messageText.replace(/\{name\}/gi, recipient.customer_name || 'Customer');
            
            // Resolve Spintax {Option A|Option B} variations
            const resolveSpintax = (text: string) => {
              return text.replace(/\{([^{}]+)\}/g, (match, contents) => {
                const choices = contents.split('|');
                return choices[Math.floor(Math.random() * choices.length)];
              });
            };
            messageText = resolveSpintax(messageText);

            try {
              // Retrieve active Baileys socket instance from session manager using user.id
              const sock = await getWhatsAppSocket(user.id, supabase);
              if (!sock) {
                throw new Error('Baileys socket session could not be established');
              }

              // Wrap message sending attempt in a 10-second timeout window
              await withTimeout((async () => {
                const jid = `${formattedPhone}@s.whatsapp.net`;
                await sock.sendMessage(jid, { text: messageText });
              })(), 10000);

              const { error: deductError } = await supabase.rpc('deduct_credits', { p_shop_id: user.id, p_amount: 1 });
              if (!deductError) {
                successCount++;
                await supabase.from('message_logs').insert({
                  campaign_id: campaign.id,
                  meta_message_id: `qr_express_${Date.now()}_${formattedPhone}`,
                  recipient_phone: formattedPhone,
                  status: 'sent'
                });
                await supabase.rpc('increment_campaign_sent', { campaign_row_id: campaign.id, quantity: 1 });
              } else {
                failedCount++;
                await supabase.from('message_logs').insert({
                  campaign_id: campaign.id,
                  meta_message_id: `qr_express_fail_deduct_${Date.now()}_${formattedPhone}`,
                  recipient_phone: formattedPhone,
                  status: 'failed'
                });
                await supabase.rpc('increment_campaign_metric', { campaign_row_id: campaign.id, metric_name: 'failed', quantity: 1 });
              }
            } catch (e) {
              console.error('[QR Express Loop Error]:', e);
              failedCount++;
              await supabase.from('message_logs').insert({
                campaign_id: campaign.id,
                meta_message_id: `qr_express_fail_err_${Date.now()}_${formattedPhone}`,
                recipient_phone: formattedPhone,
                status: 'failed'
              });
              await supabase.rpc('increment_campaign_metric', { campaign_row_id: campaign.id, metric_name: 'failed', quantity: 1 });
            }
            
            // Ultra-Safe Anti-Ban Throttling with bounded jitter (strictly in [30s, 60s])
            const safeDelay = Math.max(30, Math.min(60, anti_ban_delay || 45));
            const delayBase = safeDelay * 1000;
            const jitter = Math.floor(Math.random() * 10000) - 5000; // +/- 5 seconds
            const finalDelay = Math.max(30000, Math.min(60000, delayBase + jitter));
            await delay(finalDelay);
          }

          // Complete the campaign status update
          await supabase.from('campaigns').update({
            status: successCount > 0 || failedCount === 0 ? 'completed' : 'failed',
          }).eq('id', campaign.id);

        } catch (globalError) {
          console.error('[Global Campaign Error for QR_EXPRESS]:', globalError);
          await supabase.from('campaigns').update({
            status: 'failed',
          }).eq('id', campaign.id);
        }
      })());

      return NextResponse.json({ 
        ok: true, 
        data: { 
          status: 'queued', 
          mode: 'QR_EXPRESS',
          campaign_id: campaign.id,
          estimated_time_minutes: Math.ceil(recipients.length * (anti_ban_delay || 45) / 60)
        } 
      }, { status: 202 }); // 202 Accepted

    } else {
      
      // SEQUENTIAL META API DISPATCH (Avoids connection pool exhaustion)
      // Runs asynchronously in Next.js waitUntil() to redirect UI instantly.
      waitUntil((async () => {
        let successCount = 0;
        let failedCount = 0;

        try {
          for (const recipient of recipients) {
            const formattedPhone = recipient.whatsapp_number.replace(/\D/g, '');
            
            const parameters: { type: string; text: string }[] = [];
            if (payload.templateParams && Object.keys(payload.templateParams).length > 0) {
              const sortedKeys = Object.keys(payload.templateParams).sort((a,b) => parseInt(a)-parseInt(b));
              sortedKeys.forEach(key => {
                 let val = payload.templateParams![key];
                 if (val.includes('{name}')) val = val.replace('{name}', recipient.customer_name || 'Customer');
                 parameters.push({ type: 'text', text: val });
              });
            } else {
              const customParam = payload.campaign.message_body.replace('{name}', recipient.customer_name || 'Customer');
              parameters.push({ type: 'text', text: customParam });
            }

            const templateToUse = payload.campaign.template_name || meta_template_name;

            try {
              const response = await withTimeout(
                fetch(
                  `https://graph.facebook.com/v20.0/${meta_phone_number_id}/messages`,
                  {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${meta_access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      messaging_product: 'whatsapp',
                      to: formattedPhone,
                      type: 'template',
                      template: {
                        name: templateToUse,
                        language: { code: 'en_US' },
                        components: parameters.length > 0 ? [{ type: 'body', parameters }] : [],
                      },
                    }),
                  }
                ),
                10000
              );
              
              if (response.status === 200) {
                const responseData = await response.json();
                const messageId = responseData.messages?.[0]?.id;
                
                const { error: deductError } = await supabase.rpc('deduct_credits', { p_shop_id: user.id, p_amount: 1 });
                if (!deductError) {
                  successCount++;
                  if (messageId) {
                    await supabase.from('message_logs').insert({
                      campaign_id: campaign.id,
                      meta_message_id: messageId,
                      recipient_phone: formattedPhone,
                      status: 'sent'
                    });
                  }
                  await supabase.rpc('increment_campaign_sent', { campaign_row_id: campaign.id, quantity: 1 });
                } else {
                  failedCount++;
                  await supabase.from('message_logs').insert({
                    campaign_id: campaign.id,
                    meta_message_id: `meta_fail_deduct_${Date.now()}_${formattedPhone}`,
                    recipient_phone: formattedPhone,
                    status: 'failed'
                  });
                  await supabase.rpc('increment_campaign_metric', { campaign_row_id: campaign.id, metric_name: 'failed', quantity: 1 });
                }
              } else {
                failedCount++;
                await supabase.from('message_logs').insert({
                  campaign_id: campaign.id,
                  meta_message_id: `meta_fail_status_${Date.now()}_${formattedPhone}`,
                  recipient_phone: formattedPhone,
                  status: 'failed'
                });
                await supabase.rpc('increment_campaign_metric', { campaign_row_id: campaign.id, metric_name: 'failed', quantity: 1 });
              }
            } catch (err) {
              console.error('[Meta API Loop Error]:', err);
              failedCount++;
              await supabase.from('message_logs').insert({
                campaign_id: campaign.id,
                meta_message_id: `meta_fail_err_${Date.now()}_${formattedPhone}`,
                recipient_phone: formattedPhone,
                status: 'failed'
              });
              await supabase.rpc('increment_campaign_metric', { campaign_row_id: campaign.id, metric_name: 'failed', quantity: 1 });
            }
          }

          await supabase.from('campaigns').update({
            status: successCount > 0 || failedCount === 0 ? 'completed' : 'failed',
          }).eq('id', campaign.id);

        } catch (globalError) {
          console.error('[Global Campaign Error for META_API]:', globalError);
          await supabase.from('campaigns').update({
            status: 'failed',
          }).eq('id', campaign.id);
        }
      })());

      return NextResponse.json({
        ok: true,
        data: {
          status: 'queued',
          mode: 'META_API',
          campaign_id: campaign.id,
          estimated_time_minutes: 1
        }
      }, { status: 202 }); // 202 Accepted
    }

  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

