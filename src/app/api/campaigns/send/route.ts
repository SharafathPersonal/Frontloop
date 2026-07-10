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
import { getWhatsAppSocket, isSocketLive, activeSessions } from '@/lib/whatsapp-bridge';
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

/** Apply {{1}} template params and {name} substitution to a message body */
const buildMessage = (
  body: string,
  customerName: string,
  templateParams?: Record<string, string>,
): string => {
  let text = body;
  if (templateParams) {
    Object.keys(templateParams).forEach((key) => {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), templateParams[key]);
    });
  }
  text = text.replace(/\{name\}/gi, customerName || 'Customer');
  return resolveSpintax(text);
};

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

    if (!payload.targetTags || payload.targetTags.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No target audience tags provided' },
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

    const {
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
    const { data: allContacts, error: contactsError } = await userClient
      .from('customers_master')
      .select('customer_name, whatsapp_number, tags')
      .eq('shop_id', user.id);

    if (contactsError) {
      return NextResponse.json({ ok: false, error: 'Failed to load contacts' }, { status: 500 });
    }

    const targetTagsLower = payload.targetTags.map((t) => t.toLowerCase().trim());

    const recipients: CustomerRecord[] = (allContacts ?? []).filter((c) => {
      if (!Array.isArray(c.tags)) return false;
      return c.tags.some((tag: string) => targetTagsLower.includes(tag.toLowerCase().trim()));
    });

    // ── 6. STRICT EMPTY GUARD — fail fast, record campaign as failed ──────
    if (recipients.length === 0) {
      const failureReason = `No contacts found with tag(s): ${payload.targetTags.join(', ')}`;

      await userClient.from('campaigns').insert({
        shop_id: user.id,
        title: payload.campaign.title,
        message_body: payload.campaign.message_body,
        image_url: payload.campaign.image_url || null,
        status: 'failed',
        total_recipients: 0,
        total_sent: 0,
        total_failed: 0,
        dispatch_mode: whatsapp_mode,
      });

      return NextResponse.json({ ok: false, error: failureReason }, { status: 400 });
    }

    // ── 7. Wallet / credit check ─────────────────────────────────────────
    const { data: walletRow, error: walletError } = await userClient
      .from('wallets')
      .select('credits_remaining')
      .eq('shop_id', user.id)
      .maybeSingle();

    if (walletError || !walletRow) {
      return NextResponse.json({ ok: false, error: 'Wallet not found' }, { status: 404 });
    }

    const { credits_remaining } = walletRow as Wallet;
    const requiredCredits = recipients.length;

    if (credits_remaining < requiredCredits) {
      return NextResponse.json(
        {
          ok: false,
          error: `Insufficient credits. Need ${requiredCredits}, have ${credits_remaining}.`,
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
      .eq('total_recipients', requiredCredits)
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
    const campaignTitle = `${payload.campaign.title} [Tags: ${payload.targetTags.join(', ')}]`;

    const { data: campaign, error: campaignInsertError } = await userClient
      .from('campaigns')
      .insert({
        shop_id: user.id,
        title: campaignTitle,
        message_body: payload.campaign.message_body,
        image_url: payload.campaign.image_url || null,
        status: 'processing',
        total_recipients: requiredCredits,
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
    const recipientsSnapshot = [...recipients];
    const templateParamsSnapshot = payload.templateParams ?? {};
    const messageBodySnapshot = payload.campaign.message_body;
    const templateNameSnapshot = payload.campaign.template_name ?? meta_template_name ?? '';
    const antiBanDelaySeconds = Math.max(30, Math.min(60, anti_ban_delay ?? 45));

    // ── 12. Background dispatch ──────────────────────────────────────────
    if (whatsapp_mode === 'QR_EXPRESS') {
      // ── QR EXPRESS: anti-ban throttled queue ──────────────────────────
      waitUntil(
        (async () => {
          let successCount = 0;
          let failedCount = 0;

          try {
            // ── PRE-LOOP: active WebSocket connection stream re-verification ──
            let sockPreflight: any = activeSessions.get(shopId);
            const isPreflightSocketDown = !sockPreflight || !sockPreflight.ws || sockPreflight.ws.isOpen !== true;
            if (isPreflightSocketDown) {
              console.log('[QR Express] Preflight: socket is dropped or idle. Silently re-authenticating connection within 2 seconds...');
              sockPreflight = await getWhatsAppSocket(shopId, adminClient, 2000);
            }
            
            const socketIsLive = sockPreflight != null && isSocketLive(shopId);
            if (!socketIsLive) {
              throw new Error("WhatsApp phone is completely disconnected or offline.");
            }

            for (const recipient of recipientsSnapshot) {
              const formattedPhone = recipient.whatsapp_number.split('@')[0];
              const recipientJid   = `${formattedPhone}@s.whatsapp.net`;
              const messageText    = buildMessage(
                messageBodySnapshot,
                recipient.customer_name,
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

                // Active WebSocket connection re-verification per contact
                let sock: any = activeSessions.get(shopId);
                const isSocketDown = !sock || !sock.ws || sock.ws.isOpen !== true;

                if (isSocketDown) {
                  console.log(`[QR Express] Mid-campaign: socket is dropped or idle for ${formattedPhone}. Silently re-authenticating within 2 seconds...`);
                  sock = await getWhatsAppSocket(shopId, adminClient, 2000);
                }

                if (!sock || !isSocketLive(shopId)) {
                  throw new Error('WhatsApp socket lost connection mid-campaign');
                }

                // ── REAL Baileys transmission — 12 s hard timeout ──────────
                const sendReceipt: any = await withTimeout(
                  sock.sendMessage(recipientJid, { text: messageText }),
                  12_000,
                );

                // Validate delivery receipt — Baileys returns a proto message stub
                const confirmedMsgId: string | undefined = sendReceipt?.key?.id ?? undefined;

                if (!confirmedMsgId) {
                  throw new Error(`No valid message key returned by Baileys for JID ${recipientJid}`);
                }

                // Credit deducted ONLY after confirmed receipt from WhatsApp
                const { error: deductError } = await adminClient.rpc('deduct_credits', {
                  p_shop_id: shopId,
                  p_amount: 1,
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

              } catch (perContactError) {
                console.error(`[QR Express] Failed for ${formattedPhone}:`, perContactError);
                failedCount++;

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
          } catch (loopError) {
            console.error('[QR Express] Unexpected loop-level or preflight error:', loopError);
            failedCount = recipientsSnapshot.length - successCount;
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
              await adminClient
                .from('campaigns')
                .update({
                  status: finalStatus,
                  total_failed: failedCount,
                })
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
            total_recipients: requiredCredits,
            estimated_time_minutes: Math.ceil(
              (requiredCredits * antiBanDelaySeconds) / 60,
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

          try {
            for (const recipient of recipientsSnapshot) {
              const formattedPhone = recipient.whatsapp_number.split('@')[0];

              // Build Meta API template components
              const parameters: { type: string; text: string }[] = [];
              if (Object.keys(templateParamsSnapshot).length > 0) {
                Object.keys(templateParamsSnapshot)
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .forEach((key) => {
                    let val = templateParamsSnapshot[key];
                    val = val.replace('{name}', recipient.customer_name || 'Customer');
                    parameters.push({ type: 'text', text: val });
                  });
              } else {
                parameters.push({
                  type: 'text',
                  text: messageBodySnapshot.replace('{name}', recipient.customer_name || 'Customer'),
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
                  p_amount: 1,
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

              } catch (perContactError) {
                console.error(`[Meta API] Failed for ${formattedPhone}:`, perContactError);
                failedCount++;

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
            }
          } catch (loopError) {
            console.error('[Meta API] Unexpected loop-level error:', loopError);
            failedCount = recipientsSnapshot.length - successCount;
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
              await adminClient
                .from('campaigns')
                .update({
                  status: finalStatus,
                  total_failed: failedCount,
                })
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
