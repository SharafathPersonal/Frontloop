/**
 * TRUE ATTENDLY BROADCAST — Campaign Dispatcher API
 *
 * ARCHITECTURE NOTE — WHY TWO SUPABASE CLIENTS:
 *
 * `userClient`  — Built from the cookie-based session. Valid ONLY during the
 *                 synchronous request window (before NextResponse is returned).
 *                 Used for auth, shop/wallet reads, campaign INSERT, and ledger
 *                 pre-population because RLS must enforce the shop_id boundary.
 *
 * `adminClient` — Built from SUPABASE_SERVICE_ROLE_KEY. Bypasses RLS.
 *                 Used EXCLUSIVELY inside the waitUntil() background callback
 *                 because the cookie store is destroyed the moment the HTTP
 *                 response is sent — making the userClient permanently invalid
 *                 for any async work that outlives the request. This is the
 *                 root cause of the "permanent Processing / empty ledger" bug.
 */

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';

export const maxDuration = 60; // Enforce 60-second execution cushion
export const dynamic = 'force-dynamic';

import type { BroadcastPayload, Shop, Wallet, CustomerTag } from '@/types/broadcast';

interface CustomerRecord {
  customer_name: string;
  whatsapp_number: string;
  tags: CustomerTag[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Resolve Spintax variations: {A|B|C} → random choice */
const resolveSpintax = (text: string): string =>
  text.replace(/\{([^{}]+)\}/g, (_match, contents: string) => {
    const choices = contents.split('|');
    return choices[Math.floor(Math.random() * choices.length)];
  });

const buildMessage = (
  body: string,
  customerName: string,
  shopName: string,
  templateParams?: Record<string, string>,
): string => {
  let text = body;
  
  // 1. Replace name placeholders first to protect them from being cleared by templateParams loop
  const nameVal = customerName || 'Customer';
  text = text.replace(/\{\{1\}\}/g, nameVal);
  text = text.replace(/\{\{name\}\}/gi, nameVal);
  text = text.replace(/\{name\}/gi, nameVal);

  // 2. Replace shop name placeholders
  const shopVal = shopName || 'Attendly Shop';
  text = text.replace(/\{\{2\}\}/g, shopVal);
  text = text.replace(/\{\{shop_name\}\}/gi, shopVal);
  text = text.replace(/\{shop_name\}/gi, shopVal);

  // 3. Replace other template params
  if (templateParams) {
    Object.keys(templateParams).forEach((key) => {
      if (key === '1' || key === '2' || key.toLowerCase() === 'name' || key.toLowerCase() === 'shop_name') return;
      const val = templateParams[key] ?? '';
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    });
  }
  return resolveSpintax(text);
};

/**
 * Helper to parse and flatten any customer tags representation into string[]
 */
function parseTags(tagsField: any): string[] {
  if (!tagsField) return [];
  
  if (Array.isArray(tagsField)) {
    return tagsField.flatMap(val => parseTags(val));
  }

  if (typeof tagsField === 'string') {
    const trimmed = tagsField.trim();
    
    // Postgres array format e.g. {New,VIP} or {"New","VIP"}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const content = trimmed.substring(1, trimmed.length - 1);
      return content.split(',').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }

    // Stringified JSON array e.g. ["New", "VIP"]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.flatMap(val => parseTags(val));
        }
      } catch (e) {
        // ignore and fallback
      }
    }
    
    // Comma-separated list
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }

    // Single tag with potential quotes
    return [trimmed.replace(/^["']|["']$/g, '')];
  }

  // If it's an object, try to serialize/deserialize it to handle JSON fields
  if (typeof tagsField === 'object') {
    try {
      const str = JSON.stringify(tagsField);
      if (str.startsWith('[') && str.endsWith(']')) {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) {
          return parsed.flatMap(val => parseTags(val));
        }
      }
    } catch (e) {}
  }

  return [];
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------


export async function POST(req: Request) {
  // ── 1. Build the user (cookie-session) Supabase client ──────────────────
  const cookieStore = await cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            /* noop — read-only context after response is sent */
          }
        },
      },
    },
  );

  // ── 2. Build the admin (service-role) Supabase client ───────────────────
  //    This client bypasses RLS and is safe to use inside waitUntil() after
  //    the HTTP response has been delivered (when cookies are gone).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // ── 3. Auth + payload validation ─────────────────────────────────────
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await req.json()) as BroadcastPayload;

    const targetSource = payload.targetSource || 'TAGS';

    if (targetSource === 'TAGS' && (!payload.targetTags || payload.targetTags.length === 0)) {
      return NextResponse.json(
        { ok: false, error: 'No target audience tags provided' },
        { status: 400 },
      );
    }
    
    if (targetSource === 'CSV' && (!payload.csvData || payload.csvData.length === 0)) {
      return NextResponse.json(
        { ok: false, error: 'No CSV data provided' },
        { status: 400 },
      );
    }

    // ── 4. Load shop profile ─────────────────────────────────────────────
    const { data: shop, error: shopError } = await userClient
      .from('shops')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (shopError || !shop) {
      return NextResponse.json({ ok: false, error: 'Shop profile not found' }, { status: 404 });
    }

    let {
      meta_access_token,
      meta_phone_number_id,
      meta_template_name,
      whatsapp_mode,
      anti_ban_delay,
      qr_express_status,
    } = shop as Shop;

    if (!whatsapp_mode || whatsapp_mode === 'NONE') {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Please configure a WhatsApp Connection Mode (Meta API or QR Express) in Settings.',
        },
        { status: 400 },
      );
    }

    if (whatsapp_mode === 'META_API') {
      const { data: metaConfig } = await userClient
        .from('meta_configs')
        .select('meta_access_token')
        .eq('shop_id', user.id)
        .maybeSingle();

      if (metaConfig?.meta_access_token) {
        meta_access_token = metaConfig.meta_access_token;
      }

      if (!meta_access_token || !meta_phone_number_id || !meta_template_name) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Meta Cloud API credentials are not fully configured in shop settings.',
          },
          { status: 400 },
        );
      }
    }

    if (whatsapp_mode === 'QR_EXPRESS' && qr_express_status === 'disconnected') {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Your WhatsApp device is disconnected. Please reconnect in Settings to resume broadcasts.',
        },
        { status: 400 },
      );
    }

    // ── 5. Resolve recipients (case-insensitive tag match) ───────────────
    let recipients: CustomerRecord[] = [];
    
    if (targetSource === 'TAGS') {
      const { data: allContacts, error: contactsError } = await userClient
        .from('customers_master')
        .select('customer_name, whatsapp_number, tags')
        .eq('shop_id', user.id);

      if (contactsError) {
        return NextResponse.json({ ok: false, error: 'Failed to load contacts' }, { status: 500 });
      }

      let targetTags: string[] = [];
      if (Array.isArray(payload.targetTags)) {
        targetTags = payload.targetTags;
      } else if (typeof payload.targetTags === 'string') {
        targetTags = (payload.targetTags as string).split(',').map(t => t.trim()).filter(Boolean);
      }
      const targetTagsLower = targetTags.map((t) => t.toLowerCase().trim());

      recipients = (allContacts ?? []).filter((c) => {
        const parsedTags = parseTags(c.tags);
        return parsedTags.some((tag: string) => targetTagsLower.includes(tag.toLowerCase().trim()));
      });
    } else if (targetSource === 'QR_LEADS') {
      const { data: qrLeads, error: qrError } = await userClient
        .from('customers_master')
        .select('customer_name, whatsapp_number, tags, serial_number')
        .eq('shop_id', user.id)
        .contains('tags', ['IN_STORE_QR_LEAD']);
        
      if (qrError) {
        return NextResponse.json({ ok: false, error: 'Failed to load QR Leads' }, { status: 500 });
      }
      
      recipients = (qrLeads ?? []).map(lead => ({
        customer_name: lead.serial_number ? `C${lead.serial_number}` : (lead.customer_name || 'Customer'),
        whatsapp_number: lead.whatsapp_number,
        tags: ['IN_STORE_QR_LEAD']
      }));
    } else if (targetSource === 'CSV' && payload.csvData) {
      recipients = payload.csvData.map(row => ({
        customer_name: row.name || 'Customer',
        whatsapp_number: row.phone,
        tags: ['CSV_IMPORT']
      }));
    }

    // ── 6. STRICT EMPTY GUARD — fail fast, record campaign as failed ──────
    if (recipients.length === 0) {
      const failureReason = `No contacts found for target source: ${targetSource}`;

      const { data: newCampaign } = await userClient
        .from('campaigns')
        .insert({
          shop_id: user.id,
          title: payload.campaign.title,
          message_body: payload.campaign.message_body,
          image_url: payload.campaign.image_url || null,
          status: 'failed',
          total_recipients: 0,
          total_sent: 0,
          total_failed: 0,
          dispatch_mode: whatsapp_mode,
        })
        .select()
        .single();

      if (newCampaign) {
        const campaignId = newCampaign.id;
        await userClient
          .from('campaigns')
          .update({ 
            status: 'failed', 
            total_failed: 1,
            failure_reason: 'No contacts found matching the selected target for this shop.' 
          })
          .eq('id', campaignId);
      }

      return NextResponse.json({ ok: false, error: failureReason }, { status: 400 });
    }

    // ── 7. Wallet / credit check ─────────────────────────────────────────
    const { data: configData } = await userClient
      .from('system_settings')
      .select('value')
      .eq('key', 'whatsapp_credit_cost')
      .maybeSingle();
      
    const whatsappCreditCost = configData?.value ? Number(configData.value) : 1.0;

    const { data: walletRow, error: walletError } = await userClient
      .from('wallets')
      .select('credits_remaining')
      .eq('shop_id', user.id)
      .maybeSingle();

    if (walletError || !walletRow) {
      return NextResponse.json({ ok: false, error: 'Wallet not found' }, { status: 404 });
    }

    const { credits_remaining } = walletRow as Wallet;
    const requiredCredits = recipients.length * whatsappCreditCost;

    if (credits_remaining < requiredCredits) {
      return NextResponse.json(
        {
          ok: false,
          error: `Insufficient credits. Need ${requiredCredits.toFixed(2)}, have ${Number(credits_remaining).toFixed(2)}.`,
        },
        { status: 402 },
      );
    }

    // ── 8. Idempotency guard ─────────────────────────────────────────────
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: duplicate } = await userClient
      .from('campaigns')
      .select('id')
      .eq('shop_id', user.id)
      .eq('title', payload.campaign.title)
      .eq('total_recipients', recipients.length)
      .eq('status', 'processing')
      .gte('created_at', fiveMinsAgo)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        { ok: false, error: 'An identical campaign is already being processed.' },
        { status: 409 },
      );
    }

    // ── 9. Create campaign row (status: processing) ──────────────────────
    const campaignTitle = targetSource === 'TAGS' 
      ? `${payload.campaign.title} [Tags: ${payload.targetTags?.join(', ') || ''}]`
      : `${payload.campaign.title} [Source: ${targetSource}]`;

    // Pre-replace constant template variables (except name) for the DB campaign log
    let dbMessageBody = payload.campaign.message_body;
    if (payload.templateParams) {
      const params = payload.templateParams;
      Object.keys(params).forEach((key) => {
        if (key === '1' || key.toLowerCase() === 'name') return;
        const val = params[key] ?? '';
        dbMessageBody = dbMessageBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
      });
    }

    const { data: campaign, error: campaignInsertError } = await userClient
      .from('campaigns')
      .insert({
        shop_id: user.id,
        title: campaignTitle,
        message_body: dbMessageBody,
        image_url: payload.campaign.image_url || null,
        status: 'processing',
        total_recipients: recipients.length,
        total_sent: 0,
        total_failed: 0,
        dispatch_mode: whatsapp_mode,
      })
      .select()
      .single();

    if (campaignInsertError || !campaign) {
      return NextResponse.json({ ok: false, error: 'Failed to create campaign record.' }, { status: 500 });
    }

    const campaignId: string = campaign.id;

    // ── 10. PRE-POPULATE ledger with 'pending_dispatch' rows ─────────────
    //   This ensures the analytics view NEVER shows an empty ledger, even
    //   before the first message is processed.
    const now = Date.now();
    const initialLogs = recipients.map((r, idx) => {
      const phone = r.whatsapp_number.split('@')[0];
      return {
        campaign_id: campaignId,
        // Unique placeholder ID; will be overwritten on send
        meta_message_id: `pre_${campaignId}_${phone}_${now}_${idx}`,
        recipient_phone: phone,
        status: 'pending_dispatch',
        customer_name: r.customer_name || 'Customer',
        shop_name: shop?.shop_name || 'Attendly Shop',
        image_url: payload.campaign.image_url || null,
      };
    });

    const { error: preInsertError } = await adminClient
      .from('message_logs')
      .insert(initialLogs);

    if (preInsertError) {
      // Non-fatal: continue dispatch even if pre-population partially fails,
      // but log so we can investigate.
      console.error('[Campaign Dispatcher] Ledger pre-population error:', preInsertError);
    }

    // ── 11. Snapshot data needed inside the background worker ────────────
    //   We capture everything NOW (while the request is live) so the
    //   background callback is a pure closure with no live dependencies on
    //   the dying userClient or the cookie store.
    const shopId = user.id;
    const shopNameSnapshot = shop?.shop_name || 'Attendly Shop';
    const recipientsSnapshot = [...recipients];
    const templateParamsSnapshot = payload.templateParams ?? {};
    const messageBodySnapshot = payload.campaign.message_body;
    const templateNameSnapshot = payload.campaign.template_name ?? meta_template_name ?? '';
    const antiBanDelaySeconds = Math.max(30, Math.min(60, anti_ban_delay ?? 45));
    const creditCostSnapshot = whatsappCreditCost;

    // ── 12. Background dispatch ──────────────────────────────────────────
    if (whatsapp_mode === 'QR_EXPRESS') {
      // ── QR EXPRESS: anti-ban throttled queue (decoupled delegation to Render server) ──────────────────────────
      const renderServerUrl = process.env.NEXT_PUBLIC_RENDER_SERVER_URL || 'http://localhost:3001';

      waitUntil(
        (async () => {
          let successCount = 0;
          let failedCount = 0;
          let loopErrorCaptured = '';

          try {
            // ── PRE-LOOP: active WebSocket connection stream re-verification ──
            // Preflight check
            const statusRes = await fetch(`${renderServerUrl}/api/whatsapp/status?shop_id=${shopId}`);
            const statusData = await statusRes.json().catch(() => ({}));
            
            if (statusData.status !== 'CONNECTED') {
              // Socket not connected. Bootstrapping connect...
              const connectRes = await fetch(`${renderServerUrl}/api/whatsapp/connect?shop_id=${shopId}`);
              const connectText = await connectRes.text();
              if (connectText !== 'CONNECTED') {
                throw new Error("WhatsApp phone is completely disconnected or offline. Handshake failed.");
              }
            }

            for (const recipient of recipientsSnapshot) {
              const formattedPhone = recipient.whatsapp_number.split('@')[0];
              const messageText = buildMessage(
                messageBodySnapshot,
                recipient.customer_name || formattedPhone || 'Customer',
                shopNameSnapshot,
                templateParamsSnapshot,
              );

              try {
                // Update ledger log status to 'processing' before dispatching
                await adminClient
                  .from('message_logs')
                  .update({ status: 'processing' })
                  .eq('campaign_id', campaignId)
                  .eq('recipient_phone', formattedPhone)
                  .eq('status', 'pending_dispatch');

                // ── API relay call via HTTP POST to dedicated Render engine instance ──
                const response = await withTimeout(
                  fetch(`${renderServerUrl}/api/whatsapp/send-message`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
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
                  throw new Error(`Render socket API returned no message JID/id`);
                }

                // Credit deducted ONLY after confirmed receipt from WhatsApp
                const { error: deductError } = await adminClient.rpc('deduct_credits', {
                  p_shop_id: shopId,
                  p_amount: creditCostSnapshot,
                });

                if (deductError) {
                  throw new Error(`Credit deduction failed: ${deductError.message}`);
                }

                successCount++;

                // Ledger: processing → delivered (confirmed by WA servers)
                await adminClient
                  .from('message_logs')
                  .update({ meta_message_id: confirmedMsgId, status: 'delivered' })
                  .eq('campaign_id', campaignId)
                  .eq('recipient_phone', formattedPhone)
                  .eq('status', 'processing');

                // Increment campaign sent + delivered counters
                await adminClient.rpc('increment_campaign_sent', {
                  campaign_row_id: campaignId,
                  quantity: 1,
                });
                await adminClient.rpc('increment_campaign_metric', {
                  campaign_row_id: campaignId,
                  metric_name: 'delivered',
                  quantity: 1,
                });

              } catch (perContactError: any) {
                console.error(`[QR Express] Failed for ${formattedPhone}:`, perContactError);
                failedCount++;

                const contactErrMsg = perContactError instanceof Error ? perContactError.message : String(perContactError);

                // Update campaigns table failure_reason with this exception message
                try {
                  await adminClient
                    .from('campaigns')
                    .update({ failure_reason: contactErrMsg })
                    .eq('id', campaignId);
                } catch (campaignErr) {
                  console.error('[QR Express] Failed to update campaigns table failure_reason:', campaignErr);
                }

                // Log per-contact error to system_logs for premium transparency
                try {
                  await adminClient.from('system_logs').insert({
                    shop_id: shopId,
                    campaign_id: campaignId,
                    error_type: 'WHATSAPP_TRANSMISSION_ERROR',
                    failure_reason: `Recipient ${formattedPhone} failed: ${contactErrMsg}`,
                    meta_data: { recipient_phone: formattedPhone }
                  });
                } catch (logErr) {
                  console.error('[QR Express] Failed to write per-contact log to system_logs:', logErr);
                }

                // Ledger: update processing or pending_dispatch to failed (no credit deducted)
                await adminClient
                  .from('message_logs')
                  .update({
                    meta_message_id: `failed_${campaignId}_${formattedPhone}_${Date.now()}`,
                    status: 'failed',
                  })
                  .eq('campaign_id', campaignId)
                  .eq('recipient_phone', formattedPhone)
                  .in('status', ['pending_dispatch', 'processing']);

                await adminClient.rpc('increment_campaign_metric', {
                  campaign_row_id: campaignId,
                  metric_name: 'failed',
                  quantity: 1,
                });
              }

              // Anti-ban delay: bounded random in [30 s, 60 s]
              const baseMs     = antiBanDelaySeconds * 1_000;
              const jitterMs   = Math.floor(Math.random() * 10_000) - 5_000; // ±5 s
              const throttleMs = Math.max(30_000, Math.min(60_000, baseMs + jitterMs));
              await delay(throttleMs);
            }
          } catch (loopError: any) {
            console.error('[QR Express] Unexpected loop-level or preflight error:', loopError);
            failedCount = recipientsSnapshot.length - successCount;
            loopErrorCaptured = loopError instanceof Error ? loopError.message : String(loopError);

            // Write global runtime failure to system_logs
            try {
              await adminClient.from('system_logs').insert({
                shop_id: shopId,
                campaign_id: campaignId,
                error_type: 'WHATSAPP_SOCKET_ERROR',
                failure_reason: loopErrorCaptured,
                meta_data: { success_count: successCount, failed_count: failedCount }
              });
            } catch (logErr) {
              console.error('[QR Express] Failed to write to system_logs:', logErr);
            }

            // Update campaigns table with failure reason
            try {
              await adminClient
                .from('campaigns')
                .update({ failure_reason: loopErrorCaptured })
                .eq('id', campaignId);
            } catch (campaignErr) {
              console.error('[QR Express] Failed to update campaigns table:', campaignErr);
            }
          } finally {
            try {
              // Clean up any stuck pending_dispatch or processing rows
              await adminClient
                .from('message_logs')
                .update({
                  meta_message_id: `failed_incomplete_${campaignId}_${Date.now()}`,
                  status: 'failed',
                })
                .eq('campaign_id', campaignId)
                .in('status', ['pending_dispatch', 'processing']);
            } catch (err) {
              console.error('[QR Express] Failed to clean up stuck pending/processing logs:', err);
            }

            // ── GUARANTEED STATUS TRANSITION ──────────────────────────────
            const finalStatus = successCount > 0 ? 'completed' : 'failed';

            try {
              const updatePayload: any = {
                status: finalStatus,
                total_failed: failedCount,
              };
              if (loopErrorCaptured) {
                updatePayload.failure_reason = loopErrorCaptured;
              }
              await adminClient
                .from('campaigns')
                .update(updatePayload)
                .eq('id', campaignId);
            } catch (err) {
              console.error('[QR Express] Failed to update campaign status:', err);
            }

            console.log(
              `[QR Express] Campaign ${campaignId} finished — ` +
              `sent=${successCount} failed=${failedCount} status=${finalStatus}`,
            );
          }
        })(),
      );

      return NextResponse.json(
        {
          ok: true,
          data: {
            status: 'queued',
            mode: 'QR_EXPRESS',
            campaign_id: campaignId,
            total_recipients: recipients.length,
            estimated_time_minutes: Math.ceil(
              (recipients.length * antiBanDelaySeconds) / 60,
            ),
          },
        },
        { status: 202 },
      );
    } else {
      // ── META API: sequential HTTPS dispatch ───────────────────────────
      waitUntil(
        (async () => {
          let successCount = 0;
          let failedCount = 0;
          let loopErrorCaptured = '';

          try {
            for (const recipient of recipientsSnapshot) {
              const formattedPhone = recipient.whatsapp_number.split('@')[0];
              const nameVal = recipient.customer_name || 'Customer';

              // Build Meta API template components
              const parameters: { type: string; text: string }[] = [];
              if (Object.keys(templateParamsSnapshot).length > 0) {
                Object.keys(templateParamsSnapshot)
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .forEach((key) => {
                    let val = templateParamsSnapshot[key] ?? '';
                    val = val.replace(/\{\{1\}\}/g, nameVal);
                    val = val.replace(/\{\{name\}\}/gi, nameVal);
                    val = val.replace(/\{name\}/gi, nameVal);
                    parameters.push({ type: 'text', text: val });
                  });
              } else {
                let text = messageBodySnapshot;
                text = text.replace(/\{\{1\}\}/g, nameVal);
                text = text.replace(/\{\{name\}\}/gi, nameVal);
                text = text.replace(/\{name\}/gi, nameVal);
                parameters.push({
                  type: 'text',
                  text,
                });
              }

              try {
                // ── REAL Meta API call — 12 s hard timeout ─────────────
                const response = await withTimeout(
                  fetch(
                    `https://graph.facebook.com/v20.0/${meta_phone_number_id}/messages`,
                    {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${meta_access_token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: formattedPhone,
                        type: 'template',
                        template: {
                          name: templateNameSnapshot,
                          language: { code: 'en_US' },
                          components: parameters.length > 0 ? [{ type: 'body', parameters }] : [],
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

                const responseData  = await response.json();
                // Validate confirmed message ID from Meta — only credit on success
                const confirmedMsgId: string | undefined = responseData.messages?.[0]?.id;

                if (!confirmedMsgId) {
                  throw new Error(`Meta API returned no message ID for ${formattedPhone}`);
                }

                // Deduct credit ONLY after confirmed Meta message ID received
                const { error: deductError } = await adminClient.rpc('deduct_credits', {
                  p_shop_id: shopId,
                  p_amount: creditCostSnapshot,
                });

                if (deductError) {
                  throw new Error(`Credit deduction failed: ${deductError.message}`);
                }

                successCount++;

                // Ledger: pending_dispatch → sent (Meta webhook upgrades to delivered/read)
                await adminClient
                  .from('message_logs')
                  .update({ meta_message_id: confirmedMsgId, status: 'sent' })
                  .eq('campaign_id', campaignId)
                  .eq('recipient_phone', formattedPhone)
                  .eq('status', 'pending_dispatch');

                await adminClient.rpc('increment_campaign_sent', {
                  campaign_row_id: campaignId,
                  quantity: 1,
                });

              } catch (perContactError: any) {
                console.error(`[Meta API] Failed for ${formattedPhone}:`, perContactError);
                failedCount++;

                const contactErrMsg = perContactError instanceof Error ? perContactError.message : String(perContactError);

                // Log per-contact error to system_logs for premium transparency
                try {
                  await adminClient.from('system_logs').insert({
                    shop_id: shopId,
                    campaign_id: campaignId,
                    error_type: 'META_API_TRANSMISSION_ERROR',
                    failure_reason: `Recipient ${formattedPhone} failed: ${contactErrMsg}`,
                    meta_data: { recipient_phone: formattedPhone }
                  });
                } catch (logErr) {
                  console.error('[Meta API] Failed to write per-contact log to system_logs:', logErr);
                }

                // Ledger: pending_dispatch → failed (no credit deducted)
                await adminClient
                  .from('message_logs')
                  .update({
                    meta_message_id: `meta_failed_${campaignId}_${formattedPhone}_${Date.now()}`,
                    status: 'failed',
                  })
                  .eq('campaign_id', campaignId)
                  .eq('recipient_phone', formattedPhone)
                  .eq('status', 'pending_dispatch');

                await adminClient.rpc('increment_campaign_metric', {
                  campaign_row_id: campaignId,
                  metric_name: 'failed',
                  quantity: 1,
                });
              }
              // Rate limit for Meta API to prevent spam blocks (approx 100-200ms per message)
              await delay(200);
            }
          } catch (loopError: any) {
            console.error('[Meta API] Unexpected loop-level error:', loopError);
            failedCount = recipientsSnapshot.length - successCount;
            loopErrorCaptured = loopError instanceof Error ? loopError.message : String(loopError);

            // Write global runtime failure to system_logs
            try {
              await adminClient.from('system_logs').insert({
                shop_id: shopId,
                campaign_id: campaignId,
                error_type: 'META_API_ERROR',
                failure_reason: loopErrorCaptured,
                meta_data: { success_count: successCount, failed_count: failedCount }
              });
            } catch (logErr) {
              console.error('[Meta API] Failed to write to system_logs:', logErr);
            }

            // Update campaigns table with failure reason
            try {
              await adminClient
                .from('campaigns')
                .update({ failure_reason: loopErrorCaptured })
                .eq('id', campaignId);
            } catch (campaignErr) {
              console.error('[Meta API] Failed to update campaigns table:', campaignErr);
            }
          } finally {
            try {
              // Clean up any stuck pending_dispatch rows
              await adminClient
                .from('message_logs')
                .update({
                  meta_message_id: `failed_incomplete_${campaignId}_${Date.now()}`,
                  status: 'failed',
                })
                .eq('campaign_id', campaignId)
                .eq('status', 'pending_dispatch');
            } catch (err) {
              console.error('[Meta API] Failed to clean up stuck pending logs:', err);
            }

            // ── GUARANTEED STATUS TRANSITION ──────────────────────────────
            const finalStatus = successCount > 0 ? 'completed' : 'failed';

            try {
              const updatePayload: any = {
                status: finalStatus,
                total_failed: failedCount,
              };
              if (loopErrorCaptured) {
                updatePayload.failure_reason = loopErrorCaptured;
              }
              await adminClient
                .from('campaigns')
                .update(updatePayload)
                .eq('id', campaignId);
            } catch (err) {
              console.error('[Meta API] Failed to update campaign status:', err);
            }

            console.log(
              `[Meta API] Campaign ${campaignId} finished — ` +
              `sent=${successCount} failed=${failedCount} status=${finalStatus}`,
            );
          }
        })(),
      );

      return NextResponse.json(
        {
          ok: true,
          data: {
            status: 'queued',
            mode: 'META_API',
            campaign_id: campaignId,
            total_recipients: requiredCredits,
            estimated_time_minutes: 1,
          },
        },
        { status: 202 },
      );
    }
  } catch (err: unknown) {
    console.error('[Campaign Dispatcher] Unhandled top-level error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Internal Server Error',
      },
      { status: 500 },
    );
  }
}
