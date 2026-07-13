import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import axios from 'axios';
import crypto from 'crypto';

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN || 'trueattendly_secure_webhook_token';

// ── GATE 1: ACTIVE IN-MEMORY DE-DUPLICATION CACHE ────────────────────────────
const processedMessageIds = new Map<string, number>();

const isInMemoryDuplicate = (messageId: string): boolean => {
  if (!messageId) return false;
  const now = Date.now();
  
  // Clean up older keys (TTL: 5 minutes)
  for (const [id, timestamp] of processedMessageIds.entries()) {
    if (now - timestamp > 5 * 60 * 1000) {
      processedMessageIds.delete(id);
    }
  }
  
  if (processedMessageIds.has(messageId)) {
    return true;
  }
  processedMessageIds.set(messageId, now);
  return false;
};

const extractMetaText = (msg: any): string => {
  if (!msg) return "";
  
  if (msg?.type === 'text' && msg?.text?.body) {
    return msg.text.body;
  }
  if (msg?.type === 'image' && msg?.image?.caption) {
    return msg.image.caption;
  }
  if (msg?.type === 'video' && msg?.video?.caption) {
    return msg.video.caption;
  }
  if (msg?.type === 'document' && msg?.document?.caption) {
    return msg.document.caption;
  }
  
  // Fallbacks for nested media captions
  const m = msg?.message || msg;
  if (m?.imageMessage?.caption) return m.imageMessage.caption;
  if (m?.videoMessage?.caption) return m.videoMessage.caption;
  if (m?.documentMessage?.caption) return m.documentMessage.caption;

  if (msg?.type === 'interactive') {
    const interactive = msg?.interactive;
    if (interactive?.type === 'button_reply' && interactive?.button_reply?.title) {
      return interactive.button_reply.title;
    }
    if (interactive?.type === 'button_reply' && interactive?.button_reply?.id) {
      return interactive.button_reply.id;
    }
    if (interactive?.type === 'list_reply' && interactive?.list_reply?.title) {
      return interactive.list_reply.title;
    }
    if (interactive?.type === 'list_reply' && interactive?.list_reply?.id) {
      return interactive.list_reply.id;
    }
  }
  if (msg?.type === 'button' && msg?.button?.text) {
    return msg.button.text;
  }
  
  return "";
};

const sanitizeText = (text: string): string => {
  if (!text) return "";
  
  // Remove markdown formatting: *, _, ~
  let clean = String(text).replace(/[\*\_~]/g, '');
  
  // Remove emojis using unicode regex
  clean = clean.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
  
  // Replace multiple spaces/tabs/newlines with a single space
  clean = clean.replace(/\s+/g, ' ');
  
  return clean.toLowerCase().trim();
};

// ============================================================
// 1. META WEBHOOK VERIFICATION (App Review / Setup)
// ============================================================
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ============================================================
// 2. INBOUND MESSAGE STATUS TRACKING & PROCESSING
// ============================================================
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    if (!signature) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = process.env.META_APP_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

    if (signature !== digest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    const allowedKeywordsSanitized = [
      "add me to broadcast",
      "true attendly connect",
      "addmetobroadcast",
      "trueattendlyconnect"
    ];

    let hasMessages = false;
    let hasValidMessage = false;

    if (payload.object === 'whatsapp_business_account' && payload.entry) {
      for (const entry of payload.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            const changeValue = change.value;

            // Block Status/Read Receipts immediately
            if (changeValue?.statuses) {
              continue;
            }

            if (changeValue?.messages && Array.isArray(changeValue.messages)) {
              hasMessages = true;
              for (const msg of changeValue.messages) {
                const messageId = msg.id;

                // 🚦 GATE 1: IMMEDIATE SYNC BOUNDARY (IN-MEMORY CACHE)
                if (messageId && isInMemoryDuplicate(messageId)) {
                  console.log(`[GATE 1] Meta Message ${messageId} already processed (in-memory).`);
                  continue;
                }

                // 🚦 GATE 2: RIGOROUS INGRESS & SENDER SCOPE FILTER
                if (msg.group_id || msg.participant || msg.context?.group_id || changeValue.metadata?.group_id) {
                  console.log(`[GATE 2] Blocking non-individual context in Meta webhook for msg: ${messageId}`);
                  continue;
                }

                // 🚦 GATE 3: SENDER JID MASK VALIDATION
                const from = msg.from || '';
                const senderJid = from.includes('@') ? from : `${from}@s.whatsapp.net`;
                if (!/^\d+@s\.whatsapp\.net$/.test(senderJid) && !/^\d+@lid$/.test(senderJid)) {
                  console.log(`[GATE 3] Blocking non-individual JID format in Meta webhook: ${senderJid}`);
                  continue;
                }

                // 🚦 GATE 4: MARKOV-SAFE MEDIA & CAPTION INTENT GATEWAY
                const rawText = extractMetaText(msg);
                const cleanText = sanitizeText(rawText);

                // Strict type gating: check for text shapes only for digital bill matching pattern
                const isBillMatch = (msg?.type === 'text' && msg?.text?.body)
                  ? /(?:✨\s*)?Get\s*my\s*Bill\s+/i.test(msg.text.body)
                  : false;
                
                const isExactMatch = allowedKeywordsSanitized.some(k => k === cleanText);
                if (!isExactMatch && !isBillMatch) {
                  console.log(`[GATE 4] Meta message ${messageId} rejected due to non-matching keyword: "${cleanText}"`);
                  continue;
                }

                hasValidMessage = true;
              }
            }
          }
        }
      }
    }

    // If there were messages in this payload but none of them passed the validations, block early.
    if (hasMessages && !hasValidMessage) {
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // Execute business logic asynchronously in the background
    processWebhookPayload(payload).catch(err => {
      console.error('[BACKGROUND_WEBHOOK_ERROR]', err);
    });

    // Immediate 200 OK Response
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('[META_WEBHOOK_ERROR]', error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processWebhookPayload(payload: any) {
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const allowedKeywordsSanitized = [
    "add me to broadcast",
    "true attendly connect",
    "addmetobroadcast",
    "trueattendlyconnect"
  ];

  if (payload.object === 'whatsapp_business_account' && payload.entry) {
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        
        // Parse template status updates
        if (change.field === 'message_template_status_update' && change.value) {
          const templateName = change.value.message_template_name;
          const wabaId = entry.id; // Use WABA ID to scope to the correct shop
          const metaEvent = change.value.event;
          const rejectionReason = change.value.reason || null;
          const metaTemplateId = change.value.message_template_id;

          let dbStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
          if (metaEvent === 'APPROVED') {
            dbStatus = 'APPROVED';
          } else if (['REJECTED', 'PAUSED', 'DISABLED'].includes(metaEvent)) {
            dbStatus = 'REJECTED';
          }

          // Scope update by shop via meta_configs WABA ID
          const { data: metaConfigRow } = await adminSupabase
            .from('meta_configs')
            .select('shop_id')
            .eq('meta_business_id', wabaId)
            .maybeSingle();

          if (metaConfigRow?.shop_id) {
            const updatePayload: Record<string, string | null> = {
              status: dbStatus,
              rejection_reason: rejectionReason,
              updated_at: new Date().toISOString(),
            };
            if (metaTemplateId) updatePayload.meta_template_id = String(metaTemplateId);

            await adminSupabase
              .from('message_templates')
              .update(updatePayload)
              .eq('template_name', templateName)
              .eq('shop_id', metaConfigRow.shop_id); // SCOPED BY SHOP
          }
        }
        
        // Parse status updates (sent -> delivered -> read)
        if (change.value && change.value.statuses) {
          for (const status of change.value.statuses) {
            const messageId = status.id;
            const deliveryStatus = status.status; // 'delivered', 'read', 'failed'

            // Resolve campaign mapping via message_logs
            const { data: logData } = await adminSupabase
              .from('message_logs')
              .select('campaign_id, status')
              .eq('meta_message_id', messageId)
              .maybeSingle();

            if (!logData?.campaign_id) continue;
            const campaignId = logData.campaign_id;

            // Prevent duplicate increments if status already matched
            if (logData.status === deliveryStatus) continue;

            // Update individual node status in message_logs
            await adminSupabase
              .from('message_logs')
              .update({ status: deliveryStatus })
              .eq('meta_message_id', messageId);

            // Increment Campaign Aggregates atomically via RPC
            if (deliveryStatus === 'delivered' || deliveryStatus === 'read' || deliveryStatus === 'failed') {
              await adminSupabase.rpc('increment_campaign_metric', { 
                campaign_row_id: campaignId, 
                metric_name: deliveryStatus, 
                quantity: 1 
              });
            }
          }
        }

        // Parse INBOUND messages (e.g. "Add me to Broadcast" QR Lead capture & "Get my Bill" digital bill engine)
        if (change.value && change.value.messages) {
          const wabaId = entry.id;
          const phoneNumberId = change.value.metadata?.phone_number_id;

          const { data: metaConfigRow } = await adminSupabase
            .from('meta_configs')
            .select('shop_id, meta_access_token')
            .eq('meta_business_id', wabaId)
            .maybeSingle();

          if (metaConfigRow?.shop_id) {
            const shopId = metaConfigRow.shop_id;

            for (const msg of change.value.messages) {
              const msgId = msg.id;

              // 🚦 GATE 1: IMMEDIATE SYNC BOUNDARY (IN-MEMORY CACHE)
              if (msgId && isInMemoryDuplicate(msgId)) {
                console.log(`[GATE 1] Meta Message ${msgId} already processed (in-memory). Aborting.`);
                continue;
              }

              // 🚦 GATE 2: RIGOROUS INGRESS & SENDER SCOPE FILTER
              if (msg.group_id || msg.participant || msg.context?.group_id || change.value.metadata?.group_id) {
                console.log(`[GATE 2] Blocking non-individual context in background process.`);
                continue;
              }

              // 🚦 GATE 3: SENDER JID MASK VALIDATION
              const from = msg.from || '';
              const senderJid = from.includes('@') ? from : `${from}@s.whatsapp.net`;
              if (!/^\d+@s\.whatsapp\.net$/.test(senderJid) && !/^\d+@lid$/.test(senderJid)) {
                console.log(`[GATE 3] Blocking non-individual JID in background process: ${senderJid}`);
                continue;
              }

              // 🚦 GATE 6: ADVANCED LID-TO-MSISDN FOOTPRINT RESOLUTION
              let customerPhone = msg.from || '';
              const waId = change.value.contacts && change.value.contacts[0] ? change.value.contacts[0].wa_id : null;
              
              if (waId) {
                const waIdClean = waId.replace(/\D/g, '');
                const fromClean = (msg.from || '').replace(/\D/g, '');
                
                // LID format: 15 digits starting with '1'
                const isWaIdLid = waIdClean.length === 15 && waIdClean.startsWith('1');
                
                if (isWaIdLid && fromClean && fromClean.length >= 10 && fromClean.length <= 15) {
                  customerPhone = fromClean;
                  console.log(`[GATE 6] Resolved LID ${waId} to MSISDN ${customerPhone} via payload metadata`);
                } else {
                  customerPhone = waIdClean || fromClean;
                }
              }

              if (customerPhone.length === 10) {
                customerPhone = '91' + customerPhone;
              }

              // Block LID format (15 digits starting with '1') to prevent DB poisoning
              const isFinalLid = customerPhone.length === 15 && customerPhone.startsWith('1');
              if (isFinalLid || customerPhone.length < 10 || customerPhone.length > 15) {
                console.warn(`[GATE 6 WARNING] Could not resolve LID to standard MSISDN: ${customerPhone}. Aborting.`);
                continue;
              }

              // 🚦 GATE 4: MARKOV-SAFE MEDIA & CAPTION INTENT GATEWAY
              const rawText = extractMetaText(msg);
              const cleanText = sanitizeText(rawText);

              // Strict type gating: check for text shapes only for digital bill matching pattern
              const isBillMatch = (msg?.type === 'text' && msg?.text?.body)
                ? /(?:✨\s*)?Get\s*my\s*Bill\s+/i.test(msg.text.body)
                : false;
              
              const isExactMatch = allowedKeywordsSanitized.some(k => k === cleanText);
              if (!isExactMatch && !isBillMatch) {
                console.log(`[GATE 4] Background process: keyword mismatch: "${cleanText}"`);
                continue;
              }

              // ── NEW PATHWAY: DIGITAL BILL CHECKOUT ──
              if (isBillMatch) {
                let invoiceNumber = '';
                const match = rawText.match(/(?:✨\s*)?Get\s*my\s*Bill\s+([A-Za-z0-9_-]+)/i);
                if (match) {
                  invoiceNumber = match[1].trim();
                }

                if (!invoiceNumber) {
                  console.log('[Digital Bill] Regex match failed to parse invoice number from text:', rawText);
                  continue;
                }

                // 🚦 GATE 5: ATOMIC DB DEDUPLICATION (THE TRANS-LOCK) for digital bills
                if (msgId) {
                  try {
                    const { error: commitError } = await adminSupabase.from('whatsapp_sessions').insert({
                      shop_id: shopId,
                      session_key: `bill_dedup_${msgId}`,
                      session_value: { created_at: new Date().toISOString() },
                      updated_at: new Date().toISOString()
                    });

                    if (commitError) {
                      if (commitError.code === '23505') {
                        console.log(`[GATE 5] Meta Message ${msgId} already processed for digital bill. Aborting.`);
                        continue;
                      }
                      throw commitError;
                    }
                  } catch (dbErr: any) {
                    if (dbErr && (dbErr.code === '23505' || dbErr.message?.includes('23505'))) {
                      console.log(`[GATE 5] Meta Message ${msgId} already processed for digital bill (caught). Aborting.`);
                      continue;
                    }
                    console.error(`[GATE 5] DB error during digital bill de-duplication:`, dbErr);
                    continue;
                  }
                }

                // Bind matching shop_id constraints onto the lookup execution
                const { data: invoiceData, error: invoiceErr } = await adminSupabase
                  .from('digital_invoices')
                  .select('*')
                  .eq('invoice_number', invoiceNumber)
                  .eq('shop_id', shopId)
                  .maybeSingle();

                const invoice = invoiceData;

                if (invoiceErr || !invoice) {
                  console.error(`[Digital Bill] Invoice ${invoiceNumber} not found or query error:`, invoiceErr);
                  continue;
                }

                // 2. Perform a secure database upsert on the core contacts mapping table atomically using RPC
                const dbPhone = `${customerPhone}@s.whatsapp.net`;
                const customerName = invoice.customer_name || 'Valued Customer';

                try {
                  const { error: upsertError } = await adminSupabase.rpc('upsert_customer_lead_tags', {
                    p_shop_id: shopId,
                    p_customer_name: customerName,
                    p_whatsapp_number: dbPhone,
                    p_tag: 'DIGITAL_BILL'
                  });

                  if (upsertError) {
                    console.error('[Digital Bill] Failed atomic contact upsert:', upsertError);
                  }
                } catch (upsertErr) {
                  console.error('[Digital Bill] Exception caught during atomic contact upsert (lock/timeout safety):', upsertErr);
                }

                // 3. Atomically update digital_invoices to map the customer_phone and switch status to delivered
                try {
                  const { error: invoiceUpdateErr } = await adminSupabase
                    .from('digital_invoices')
                    .update({
                      customer_phone: customerPhone,
                      status: 'delivered'
                    })
                    .eq('id', invoice.id);

                  if (invoiceUpdateErr) {
                    console.error('[Digital Bill] Failed to update invoice status:', invoiceUpdateErr);
                    continue;
                  }
                } catch (updateErr) {
                  console.error('[Digital Bill] Exception caught during digital bill invoice update (lock/timeout safety):', updateErr);
                  continue;
                }

                // 4. System Permanent Access Token Dispatch
                const { data: shopInfo } = await adminSupabase
                  .from('shops')
                  .select('shop_name, meta_access_token, meta_phone_number_id')
                  .eq('id', shopId)
                  .single();

                if (shopInfo) {
                  const shopName = shopInfo.shop_name || 'Our Store';
                  const metaAccessToken = shopInfo.meta_access_token;
                  const phoneNumberIdToSend = shopInfo.meta_phone_number_id || phoneNumberId;

                  if (metaAccessToken && phoneNumberIdToSend) {
                    try {
                      // Generate dynamic hmac signature for the invoice PDF link
                      const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
                      const signature = crypto.createHmac('sha256', secret).update(invoiceNumber).digest('hex');
                      const signedPdfUrl = `${invoice.pdf_url}?sig=${signature}`;

                      // Send inline document object so that PDF renders as interactive, clickable asset
                      await axios.post(
                        `https://graph.facebook.com/v20.0/${phoneNumberIdToSend}/messages`,
                        {
                          messaging_product: "whatsapp",
                          recipient_type: "individual",
                          to: customerPhone,
                          type: "document",
                          document: {
                            link: signedPdfUrl,
                            filename: `invoice-${invoiceNumber}.pdf`,
                            caption: `Hello ${customerName}, here is your digital bill of ₹${Number(invoice.total_amount).toFixed(2)} from ${shopName}.`
                          }
                        },
                        {
                          headers: {
                            'Authorization': `Bearer ${metaAccessToken}`,
                            'Content-Type': 'application/json'
                          }
                        }
                      );
                      console.log(`[Digital Bill] Outbound dispatch success for invoice ${invoiceNumber} to ${customerPhone}`);
                    } catch (sendError: any) {
                      console.error(`[Digital Bill] Failed to dispatch outbound message:`, sendError?.response?.data || sendError.message);
                      // In case of Meta sending exception, update invoice status to failed
                      await adminSupabase
                        .from('digital_invoices')
                        .update({ status: 'failed' })
                        .eq('id', invoice.id);
                    }
                  } else {
                    console.error('[Digital Bill] Missing meta_access_token or meta_phone_number_id for shopId:', shopId);
                  }
                }
                
                // Done processing this message as a digital bill, skip welcome flow
                continue;
              }

              // 🚦 GATE 5: ATOMIC DB DEDUPLICATION (THE TRANS-LOCK)
              if (msgId) {
                try {
                  const { error: commitError } = await adminSupabase.from('whatsapp_sessions').insert({
                    shop_id: shopId,
                    session_key: `msg_dedup_${msgId}`,
                    session_value: { created_at: new Date().toISOString() },
                    updated_at: new Date().toISOString()
                  });

                  if (commitError) {
                    if (commitError.code === '23505') {
                      console.log(`[GATE 5] Meta Message ${msgId} already processed (DB constraint 23505). Aborting.`);
                      continue;
                    }
                    throw commitError;
                  }
                } catch (dbErr: any) {
                  if (dbErr && (dbErr.code === '23505' || dbErr.message?.includes('23505'))) {
                    console.log(`[GATE 5] Meta Message ${msgId} already processed (caught DB constraint 23505). Aborting.`);
                    continue;
                  }
                  console.error(`[GATE 5] DB insertion error during de-duplication:`, dbErr);
                  continue;
                }
              }

              // 🚦 GATE 7: COOLDOWN PRE-FLIGHT MERCHANT BALANCE CHECKS
              const cooldownKey = `cooldown_${customerPhone}`;
              const { data: cooldownSession } = await adminSupabase
                .from('whatsapp_sessions')
                .select('updated_at')
                .eq('shop_id', shopId)
                .eq('session_key', cooldownKey)
                .maybeSingle();

              if (cooldownSession) {
                const lastInteraction = new Date(cooldownSession.updated_at).getTime();
                const now = Date.now();
                if (now - lastInteraction < 24 * 60 * 60 * 1000) {
                  console.log(`[GATE 7 COOLDOWN] outreach already sent within 24h for ${customerPhone}. Aborting quietly.`);
                  continue;
                }
              }

              const { data: existingContact } = await adminSupabase
                .from('customers_master')
                .select('id')
                .eq('shop_id', shopId)
                .eq('whatsapp_number', customerPhone)
                .maybeSingle();

              const pushName = change.value.contacts?.[0]?.profile?.name || 'QR Walk-in Lead';

              if (existingContact) {
                // Update cooldown session
                await adminSupabase.from('whatsapp_sessions').upsert({
                  shop_id: shopId,
                  session_key: cooldownKey,
                  session_value: { last_sent: new Date().toISOString() },
                  updated_at: new Date().toISOString()
                }, { onConflict: 'shop_id, session_key' });

                // Send "Already Connected" notification once
                if (metaConfigRow.meta_access_token && phoneNumberId) {
                  const { data: shopInfo } = await adminSupabase
                    .from('shops')
                    .select('shop_name')
                    .eq('id', shopId)
                    .maybeSingle();
                  
                  const shopName = shopInfo?.shop_name || 'Our Store';
                  const alreadyConnectedMsg = `Your number is already saved / You are already connected to ${shopName}!`;
                  
                  try {
                    await axios.post(
                      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
                      {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: customerPhone,
                        type: "text",
                        text: { body: alreadyConnectedMsg }
                      },
                      {
                        headers: {
                          'Authorization': `Bearer ${metaConfigRow.meta_access_token}`,
                          'Content-Type': 'application/json'
                        }
                      }
                    );
                  } catch (sendError) {
                    console.error(`[GATE 7 ERROR] Failed to send duplicate contact response:`, sendError);
                  }
                }
                console.log(`[GATE 7] Customer ${customerPhone} already connected. Notice sent. Exiting.`);
                continue;
              }

              // Solvent wallet balance checks
              const { data: wallet } = await adminSupabase
                .from('wallets')
                .select('credits_remaining')
                .eq('shop_id', shopId)
                .maybeSingle();

              const creditsRemaining = wallet ? Number(wallet.credits_remaining) : 0;

              const { data: settingData } = await adminSupabase
                .from('system_settings')
                .select('value')
                .eq('key', 'qr_leads_credit_cost')
                .maybeSingle();
              const qrCost = settingData && settingData.value ? Number(settingData.value) : 10;

              if (creditsRemaining < qrCost) {
                console.log(`[GATE 7 WALLET INSOLVENCY] Pre-flight insolvency for shop ${shopId}. Registering missed lead.`);
                try {
                  await adminSupabase.from('customers_master').insert({
                    shop_id: shopId,
                    customer_name: pushName,
                    whatsapp_number: customerPhone,
                    tags: ['MISSED_LEAD'],
                    source: 'QR_SCAN',
                    loyalty_credits: 0
                  });
                } catch (insertError) {
                  console.error(`[GATE 7 ERROR] Missed lead insert failed:`, insertError);
                }
                continue;
              }

              // 🚦 GATE 8: ATOMIC LEAD INSERTION & DEFERRED WALLET BILLING
              try {
                // 1. Insert customer lead first
                const { error: insertError } = await adminSupabase.from('customers_master').insert({
                  shop_id: shopId,
                  customer_name: pushName,
                  whatsapp_number: customerPhone,
                  tags: ['IN_STORE_QR_LEAD'],
                  source: 'QR_SCAN',
                  loyalty_credits: 5
                });

                if (insertError) {
                  if (insertError.code === '23505') {
                    console.log(`[GATE 8] Lead insertion collision for ${customerPhone}. Aborting.`);
                    continue;
                  }
                  throw insertError;
                }
                console.log(`[GATE 8] Lead registered in customers_master first for ${customerPhone}`);

                // 2. Wallet billing deduction via RPC
                const { error: deductError } = await adminSupabase.rpc('deduct_credits', { 
                  p_shop_id: shopId, 
                  p_amount: qrCost 
                });

                if (deductError) {
                  throw deductError;
                }

                console.log(`[GATE 8] Charged ${qrCost} credits from shop ${shopId}`);

                // 3. Increment counters
                await adminSupabase.rpc('increment_credits_used', { p_shop_id: shopId });

                try {
                  await adminSupabase.rpc('increment_qr_analytics', { p_shop_id: shopId, p_credits: qrCost });
                } catch (analyticsError) {
                  console.error("[GATE 8 WARNING] Failed to update QR analytics stats:", analyticsError);
                }

                // Update cooldown session so new leads are also rate-limited
                await adminSupabase.from('whatsapp_sessions').upsert({
                  shop_id: shopId,
                  session_key: cooldownKey,
                  session_value: { last_sent: new Date().toISOString() },
                  updated_at: new Date().toISOString()
                }, { onConflict: 'shop_id, session_key' });

              } catch (billingOrInsertError) {
                console.error(`[GATE 8 FAULT] Downgrading lead for ${customerPhone}:`, billingOrInsertError);
                
                // Downgrade tag to MISSED_LEAD and reset credits
                try {
                  await adminSupabase
                    .from('customers_master')
                    .update({ tags: ['MISSED_LEAD'], loyalty_credits: 0 })
                    .eq('shop_id', shopId)
                    .eq('whatsapp_number', customerPhone);
                } catch (updateError) {
                  console.error(`[GATE 8] Failed to downgrade lead tag for ${customerPhone}:`, updateError);
                }
                continue;
              }

              // 🚦 GATE 9: COMPLIANT AUTOMATED DELIVERY DISPATCH
              if (metaConfigRow.meta_access_token && phoneNumberId) {
                const { data: shopInfo } = await adminSupabase
                  .from('shops')
                  .select('shop_name, owner_phone')
                  .eq('id', shopId)
                  .single();

                const merchantName = shopInfo?.shop_name || 'Merchant Shop Name';
                const merchantPhone = shopInfo?.owner_phone ? shopInfo.owner_phone.replace(/\D/g, '') : phoneNumberId;

                const promoCopy = `Welcome to ${merchantName}! 🎁 \n\nSave our number right now to get exclusive, real-time weekly offers directly on WhatsApp. \n\n👇 Click the contact card below to save us instantly!`;
                
                try {
                  await axios.post(
                    `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
                    {
                      messaging_product: "whatsapp",
                      recipient_type: "individual",
                      to: customerPhone,
                      type: "text",
                      text: { body: promoCopy }
                    },
                    {
                      headers: {
                        'Authorization': `Bearer ${metaConfigRow.meta_access_token}`,
                        'Content-Type': 'application/json'
                      }
                    }
                  );

                  await new Promise(resolve => setTimeout(resolve, 500));

                  await axios.post(
                    `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
                    {
                      messaging_product: "whatsapp",
                      recipient_type: "individual",
                      to: customerPhone,
                      type: "contacts",
                      contacts: [{
                        name: {
                          formatted_name: merchantName,
                          first_name: merchantName
                        },
                        phones: [{
                          phone: `+${merchantPhone}`,
                          type: "CELL",
                          wa_id: merchantPhone
                        }]
                      }]
                    },
                    {
                      headers: {
                        'Authorization': `Bearer ${metaConfigRow.meta_access_token}`,
                        'Content-Type': 'application/json'
                      }
                    }
                  );
                  console.log(`[GATE 9] Welcome sequence successfully dispatched to ${customerPhone}`);
                } catch (sendError) {
                  console.error(`[GATE 9 ERROR] Failed to send welcome flow:`, sendError);
                }
              }
            }
          }
        }
      }
    }
  }
}
