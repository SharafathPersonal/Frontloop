/**
 * TRUE ATTENDLY BROADCAST — Campaign Recovery & Retry API
 */

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
// Deleted local Baileys imports - delegated to Render service

export const maxDuration = 60; // Enforce 60-second execution cushion
export const dynamic = 'force-dynamic';

declare global {
  var whatsappSock: any;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);

export async function POST(req: Request) {
  const cookieStore = await cookies();
  
  // ── User Client (cookies-based session) ───────────────────────────────────
  const userClient = createServerClient<any>(
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
              cookieStore.set(name, value, options),
            );
          } catch {
            /* noop */
          }
        },
      },
    },
  );

  // ── Admin Client (Service Role) ──────────────────────────────────────────
  const adminClient = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { campaign_id, recipient_ledger_id } = body;

    if (!campaign_id && !recipient_ledger_id) {
      return NextResponse.json(
        { ok: false, error: 'Either campaign_id or recipient_ledger_id must be provided.' },
        { status: 400 },
      );
    }

    const shopId = user.id;

    // Load shop profile
    const { data: shop, error: shopError } = await userClient
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .maybeSingle();

    if (shopError || !shop) {
      return NextResponse.json({ ok: false, error: 'Shop profile not found' }, { status: 404 });
    }

    let campaignId = campaign_id;
    let singleLedgerRow: any = null;

    if (recipient_ledger_id) {
      // Single message retry
      const { data: ledgerRow, error: ledgerError } = await userClient
        .from('message_logs')
        .select('*')
        .eq('id', recipient_ledger_id)
        .maybeSingle();

      if (ledgerError || !ledgerRow) {
        return NextResponse.json({ ok: false, error: 'Recipient ledger record not found' }, { status: 404 });
      }

      singleLedgerRow = ledgerRow;
      campaignId = ledgerRow.campaign_id;
    }

    // Load campaign
    const { data: campaign, error: campaignError } = await userClient
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('shop_id', shopId)
      .maybeSingle();

    if (campaignError || !campaign) {
      return NextResponse.json({ ok: false, error: 'Campaign record not found' }, { status: 404 });
    }

    if (campaign.failure_reason === null) {
      campaign.failure_reason = 'System re-validated connection state during manual retry';
      await adminClient
        .from('campaigns')
        .update({ failure_reason: 'System re-validated connection state during manual retry' })
        .eq('id', campaignId);
    }

    const dispatchMode = campaign.dispatch_mode;

    if (shop && dispatchMode === 'META_API') {
      const { data: metaConfig } = await userClient
        .from('meta_configs')
        .select('meta_access_token')
        .eq('shop_id', shopId)
        .maybeSingle();
      if (metaConfig?.meta_access_token) {
        shop.meta_access_token = metaConfig.meta_access_token;
      }
    }

    if (dispatchMode === 'QR_EXPRESS') {
      return NextResponse.json(
        {
          ok: false,
          error:
            'QR_EXPRESS connection mode is decommissioned. Please configure and use META_API.',
        },
        { status: 400 },
      );
    }

    // ── Wallet / Credit Check ────────────────────────────────────────────────
    const { data: walletRow } = await userClient
      .from('wallets')
      .select('credits_remaining')
      .eq('shop_id', shopId)
      .maybeSingle();

    const creditsRemaining = walletRow?.credits_remaining ?? 0;

    // ── Handle Single Retry ──────────────────────────────────────────────────
    if (recipient_ledger_id && singleLedgerRow) {
      if (creditsRemaining < 1) {
        return NextResponse.json(
          { ok: false, error: 'Insufficient credits to perform single message retry.' },
          { status: 402 },
        );
      }

      // Reset ledger row to processing
      await adminClient
        .from('message_logs')
        .update({ status: 'processing', meta_message_id: null })
        .eq('id', recipient_ledger_id);

      const formattedPhone = singleLedgerRow.recipient_phone.split('@')[0];
      const recipientJid = `${formattedPhone}@s.whatsapp.net`;

      // Get customer name
      const { data: customer } = await adminClient
        .from('customers_master')
        .select('customer_name')
        .eq('shop_id', shopId)
        .eq('whatsapp_number', formattedPhone)
        .maybeSingle();

      const customerName = customer?.customer_name ?? formattedPhone ?? 'Customer';
      const shopName = shop?.shop_name || 'Attendly Shop';
      let messageText = campaign.message_body;
      
      // Replace name placeholders
      messageText = messageText.replace(/\{\{1\}\}/g, customerName);
      messageText = messageText.replace(/\{\{name\}\}/gi, customerName);
      messageText = messageText.replace(/\{name\}/gi, customerName);

      // Replace shop name placeholders
      messageText = messageText.replace(/\{\{2\}\}/g, shopName);
      messageText = messageText.replace(/\{\{shop_name\}\}/gi, shopName);
      messageText = messageText.replace(/\{shop_name\}/gi, shopName);



      try {
        if (dispatchMode === 'QR_EXPRESS') {
          // Re-transmit via Render server API
          const renderServerUrl = process.env.NEXT_PUBLIC_RENDER_SERVER_URL || 'http://localhost:3001';
          const response = await withTimeout(
            fetch(`${renderServerUrl}/api/whatsapp/send-message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shop_id: shopId,
                to: formattedPhone,
                message: messageText,
                image_url: campaign.image_url || null,
              }),
            }),
            15_000,
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const responseData = await response.json();
          const sendReceipt = responseData.log;
          const confirmedMsgId = sendReceipt?.key?.id;

          if (!confirmedMsgId) {
            throw new Error('No valid message key returned by Render API for single retry');
          }

          // Deduct credit
          const { error: deductError } = await adminClient.rpc('deduct_credits', {
            p_shop_id: shopId,
            p_amount: 1,
          });

          if (deductError) {
            throw new Error(`Credit deduction failed: ${deductError.message}`);
          }

          // Update message log to delivered
          await adminClient
            .from('message_logs')
            .update({ meta_message_id: confirmedMsgId, status: 'delivered' })
            .eq('id', recipient_ledger_id);

          // Update campaign stats
          await adminClient.rpc('increment_campaign_sent', {
            campaign_row_id: campaignId,
            quantity: 1,
          });
          await adminClient.rpc('increment_campaign_metric', {
            campaign_row_id: campaignId,
            metric_name: 'delivered',
            quantity: 1,
          });
          await adminClient.rpc('increment_campaign_metric', {
            campaign_row_id: campaignId,
            metric_name: 'failed',
            quantity: -1,
          });

        } else if (dispatchMode === 'META_API') {
          // Re-transmit via Meta API
          const parameters = [{
            type: 'text',
            text: messageText,
          }];

          const response = await withTimeout(
            fetch(
              `https://graph.facebook.com/v20.0/${shop.meta_phone_number_id}/messages`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${shop.meta_access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: formattedPhone,
                  type: 'template',
                  template: {
                    name: campaign.template_name || shop.meta_template_name || '',
                    language: { code: 'en_US' },
                    components: [{ type: 'body', parameters }],
                  },
                }),
              },
            ),
            12_000,
          );

          if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Meta API HTTP ${response.status}: ${errBody.slice(0, 200)}`);
          }

          const responseData = await response.json();
          const confirmedMsgId = responseData.messages?.[0]?.id;

          if (!confirmedMsgId) {
            throw new Error('Meta API returned no message ID');
          }

          // Deduct credit
          const { error: deductError } = await adminClient.rpc('deduct_credits', {
            p_shop_id: shopId,
            p_amount: 1,
          });

          if (deductError) {
            throw new Error(`Credit deduction failed: ${deductError.message}`);
          }

          // Update message log to sent
          await adminClient
            .from('message_logs')
            .update({ meta_message_id: confirmedMsgId, status: 'sent' })
            .eq('id', recipient_ledger_id);

          // Update campaign stats
          await adminClient.rpc('increment_campaign_sent', {
            campaign_row_id: campaignId,
            quantity: 1,
          });
          await adminClient.rpc('increment_campaign_metric', {
            campaign_row_id: campaignId,
            metric_name: 'failed',
            quantity: -1,
          });
        }

        // Check if there are any remaining failed messages
        const { data: updatedCampaign } = await adminClient
          .from('campaigns')
          .select('total_failed')
          .eq('id', campaignId)
          .maybeSingle();

        const finalStatus = (updatedCampaign?.total_failed ?? 0) === 0 ? 'completed' : campaign.status;
        await adminClient
          .from('campaigns')
          .update({ status: finalStatus })
          .eq('id', campaignId);

        return NextResponse.json({ ok: true, message: 'Message successfully re-transmitted.' });

      } catch (err: any) {
        console.error('[Single Retry Error]', err);
        // Reset status back to failed
        await adminClient
          .from('message_logs')
          .update({ status: 'failed' })
          .eq('id', recipient_ledger_id);

        return NextResponse.json({ ok: false, error: err.message || 'Transmission failed.' }, { status: 500 });
      }
    }

    // ── Handle Bulk Retry ────────────────────────────────────────────────────
    // Fetch all rows from the recipient ledger for this campaign where status === 'failed'
    const { data: failedLogs, error: fetchFailedError } = await adminClient
      .from('message_logs')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'failed');

    if (fetchFailedError) {
      return NextResponse.json({ ok: false, error: 'Failed to retrieve failed recipients.' }, { status: 500 });
    }

    if (!failedLogs || failedLogs.length === 0) {
      return NextResponse.json({ ok: true, message: 'No failed messages found to retry.' });
    }

    if (creditsRemaining < failedLogs.length) {
      return NextResponse.json(
        {
          ok: false,
          error: `Insufficient credits to retry all failed messages. Need ${failedLogs.length}, have ${creditsRemaining}.`,
        },
        { status: 402 },
      );
    }

    // Set their status back to 'processing'
    const failedIds = failedLogs.map((log) => log.id);
    await adminClient
      .from('message_logs')
      .update({ status: 'processing', meta_message_id: null })
      .in('id', failedIds);

    // Update campaign state to processing and decrement failed count
    await adminClient
      .from('campaigns')
      .update({
        status: 'processing',
        total_failed: Math.max(0, (campaign.total_failed ?? 0) - failedLogs.length),
        failure_reason: null,
      })
      .eq('id', campaignId);

    // Asynchronously trigger worker thread
    waitUntil(
      (async () => {
        let successCount = 0;
        let failedCount = 0;

        try {
          for (const log of failedLogs) {
            const formattedPhone = log.recipient_phone.split('@')[0];
            const recipientJid = `${formattedPhone}@s.whatsapp.net`;

            // Get customer name
            const { data: customer } = await adminClient
              .from('customers_master')
              .select('customer_name')
              .eq('shop_id', shopId)
              .eq('whatsapp_number', formattedPhone)
              .maybeSingle();

            const customerName = customer?.customer_name ?? formattedPhone ?? 'Customer';
            const shopName = shop?.shop_name || 'Attendly Shop';
            let messageText = campaign.message_body;

            // Replace name placeholders
            messageText = messageText.replace(/\{\{1\}\}/g, customerName);
            messageText = messageText.replace(/\{\{name\}\}/gi, customerName);
            messageText = messageText.replace(/\{name\}/gi, customerName);

            // Replace shop name placeholders
            messageText = messageText.replace(/\{\{2\}\}/g, shopName);
            messageText = messageText.replace(/\{\{shop_name\}\}/gi, shopName);
            messageText = messageText.replace(/\{shop_name\}/gi, shopName);



            try {
              if (dispatchMode === 'QR_EXPRESS') {
                const renderServerUrl = process.env.NEXT_PUBLIC_RENDER_SERVER_URL || 'http://localhost:3001';
                
                // Send message via Render API
                const response = await withTimeout(
                  fetch(`${renderServerUrl}/api/whatsapp/send-message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      shop_id: shopId,
                      to: formattedPhone,
                      message: messageText,
                      image_url: campaign.image_url || null,
                    }),
                  }),
                  15_000,
                );

                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                const responseData = await response.json();
                const sendReceipt = responseData.log;
                const confirmedMsgId = sendReceipt?.key?.id;

                if (!confirmedMsgId) {
                  throw new Error('No valid message key returned by Render API');
                }

                // Deduct credit
                const { error: deductError } = await adminClient.rpc('deduct_credits', {
                  p_shop_id: shopId,
                  p_amount: 1,
                });

                if (deductError) {
                  throw new Error(`Credit deduction failed: ${deductError.message}`);
                }

                successCount++;

                // Ledger: processing -> delivered
                await adminClient
                  .from('message_logs')
                  .update({ meta_message_id: confirmedMsgId, status: 'delivered' })
                  .eq('id', log.id);

                // Increment metrics
                await adminClient.rpc('increment_campaign_sent', {
                  campaign_row_id: campaignId,
                  quantity: 1,
                });
                await adminClient.rpc('increment_campaign_metric', {
                  campaign_row_id: campaignId,
                  metric_name: 'delivered',
                  quantity: 1,
                });

              } else if (dispatchMode === 'META_API') {
                // Send via Meta API
                const parameters = [{
                  type: 'text',
                  text: messageText,
                }];

                const response = await withTimeout(
                  fetch(
                    `https://graph.facebook.com/v20.0/${shop.meta_phone_number_id}/messages`,
                    {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${shop.meta_access_token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: formattedPhone,
                        type: 'template',
                        template: {
                          name: campaign.template_name || shop.meta_template_name || '',
                          language: { code: 'en_US' },
                          components: [{ type: 'body', parameters }],
                        },
                      }),
                    },
                  ),
                  12_000,
                );

                if (!response.ok) {
                  const errBody = await response.text();
                  throw new Error(`Meta API HTTP ${response.status}: ${errBody.slice(0, 200)}`);
                }

                const responseData = await response.json();
                const confirmedMsgId = responseData.messages?.[0]?.id;

                if (!confirmedMsgId) {
                  throw new Error('Meta API returned no message ID');
                }

                // Deduct credit
                const { error: deductError } = await adminClient.rpc('deduct_credits', {
                  p_shop_id: shopId,
                  p_amount: 1,
                });

                if (deductError) {
                  throw new Error(`Credit deduction failed: ${deductError.message}`);
                }

                successCount++;

                // Ledger: processing -> sent
                await adminClient
                  .from('message_logs')
                  .update({ meta_message_id: confirmedMsgId, status: 'sent' })
                  .eq('id', log.id);

                // Increment metrics
                await adminClient.rpc('increment_campaign_sent', {
                  campaign_row_id: campaignId,
                  quantity: 1,
                });

              }

            } catch (errOnLog: any) {
              console.error(`[Bulk Retry Contact Error] FormattedPhone ${formattedPhone}:`, errOnLog);
              failedCount++;

              // Write per-contact error to system_logs
              try {
                await adminClient.from('system_logs').insert({
                  shop_id: shopId,
                  campaign_id: campaignId,
                  error_type: 'WHATSAPP_RETRY_TRANSMISSION_ERROR',
                  failure_reason: `Recipient ${formattedPhone} retry failed: ${errOnLog.message || String(errOnLog)}`,
                  meta_data: { recipient_phone: formattedPhone }
                });
              } catch {}

              // Ledger: processing -> failed
              await adminClient
                .from('message_logs')
                .update({
                  meta_message_id: `failed_retry_${campaignId}_${formattedPhone}_${Date.now()}`,
                  status: 'failed',
                })
                .eq('id', log.id);

              await adminClient.rpc('increment_campaign_metric', {
                campaign_row_id: campaignId,
                metric_name: 'failed',
                quantity: 1,
              });
            }

          }

        } catch (loopError: any) {
          console.error('[Bulk Retry Loop Error]', loopError);
        } finally {
          // Re-evaluate campaign status
          const { data: updatedCampaign } = await adminClient
            .from('campaigns')
            .select('total_failed')
            .eq('id', campaignId)
            .maybeSingle();

          const finalStatus = (updatedCampaign?.total_failed ?? 0) === 0 ? 'completed' : 'failed';
          await adminClient
            .from('campaigns')
            .update({ status: finalStatus })
            .eq('id', campaignId);
        }
      })(),
    );

    return NextResponse.json({ ok: true, message: 'Bulk retry process initiated successfully.' });

  } catch (err: any) {
    console.error('[Unified Retry API Error]', err);
    return NextResponse.json({ ok: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
