import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import axios from 'axios';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'trueattendly_secure_webhook_token';

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
// 2. INBOUND MESSAGE STATUS TRACKING
// ============================================================
import crypto from 'crypto';

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

    // Isolated admin client to bypass RLS for background webhook updates securely
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
              const updatePayload: any = {
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

              // 1. Resolve campaign mapping via message_logs
              const { data: logData } = await adminSupabase
                .from('message_logs')
                .select('campaign_id, status')
                .eq('meta_message_id', messageId)
                .maybeSingle();

              if (!logData?.campaign_id) continue;
              const campaignId = logData.campaign_id;

              // Prevent duplicate increments if status already matched (e.g. read event firing twice)
              if (logData.status === deliveryStatus) continue;

              // 2. Update individual node status in message_logs
              await adminSupabase
                .from('message_logs')
                .update({ status: deliveryStatus })
                .eq('meta_message_id', messageId);

              // 3. Increment Campaign Aggregates atomically via RPC
              if (deliveryStatus === 'delivered' || deliveryStatus === 'read' || deliveryStatus === 'failed') {
                await adminSupabase.rpc('increment_campaign_metric', { 
                  campaign_row_id: campaignId, 
                  metric_name: deliveryStatus, 
                  quantity: 1 
                });
              }
            }
          }

          // Parse INBOUND messages (e.g. "Add me to Broadcast" QR Lead capture)
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
                if (msg.type !== 'text') continue;

                const messageText = msg.text?.body || '';
                if (messageText.trim().toLowerCase() === 'add me to broadcast') {
                  const customerPhone = msg.from;
                  const pushName = change.value.contacts?.[0]?.profile?.name || 'QR Walk-in Lead';

                  try {
                    // 1. Check wallet and fetch shop details
                    const { data: walletData } = await adminSupabase
                      .from('wallets')
                      .select('credits_remaining')
                      .eq('shop_id', shopId)
                      .single();

                    const { data: shopInfo } = await adminSupabase
                      .from('shops')
                      .select('shop_name, owner_phone')
                      .eq('id', shopId)
                      .single();

                    // Fetch dynamic QR cost
                    const { data: settingData } = await adminSupabase
                      .from('system_settings')
                      .select('value')
                      .eq('key', 'qr_leads_credit_cost')
                      .maybeSingle();
                    const qrCost = settingData && settingData.value ? Number(settingData.value) : 10;

                    const hasCredits = walletData && walletData.credits_remaining >= qrCost;
                    const tagToAssign = hasCredits ? 'IN_STORE_QR_LEAD' : 'MISSED_LEAD';

                    // 2. Save Contact
                    try {
                      const { data: existingContact } = await adminSupabase
                        .from('customers_master')
                        .select('id, tags, loyalty_credits')
                        .eq('shop_id', shopId)
                        .eq('whatsapp_number', customerPhone)
                        .maybeSingle();

                      let tagsArray = [tagToAssign];
                      if (existingContact) {
                        tagsArray = Array.from(new Set([...(existingContact.tags || []).filter((t: string) => t !== 'VIP_InStore'), tagToAssign]));
                        // Update existing contact
                        await adminSupabase.from('customers_master').update({ 
                          tags: tagsArray, 
                          source: 'QR_SCAN',
                          loyalty_credits: existingContact.loyalty_credits ? existingContact.loyalty_credits + 5 : 5
                        }).eq('id', existingContact.id);
                      } else {
                        await adminSupabase.from('customers_master').insert({
                          shop_id: shopId,
                          customer_name: pushName,
                          whatsapp_number: customerPhone,
                          tags: tagsArray,
                          source: 'QR_SCAN',
                          loyalty_credits: 5
                        });
                        
                        // Increment credits_used for a NEW unique lead
                        await adminSupabase.rpc('increment_credits_used', { p_shop_id: shopId });
                      }
                    } catch (dbError) {
                      console.error("🚨 [DB ERROR] Failed to save contact to the isolated QR tag:", dbError);
                    }

                    if (hasCredits) {
                      // 3. Deduct credits
                      await adminSupabase.rpc('deduct_credits', { p_shop_id: shopId, p_amount: qrCost });
                      
                      // 4. Update Analytics
                      await adminSupabase.rpc('increment_qr_analytics', { p_shop_id: shopId, p_credits: qrCost });

                      // 5. Send Automated Response Sequence via Meta API
                      if (metaConfigRow.meta_access_token && phoneNumberId && shopInfo) {
                         const merchantName = shopInfo.shop_name || 'Merchant Shop Name';
                         const merchantPhone = shopInfo.owner_phone ? shopInfo.owner_phone.replace(/\D/g, '') : phoneNumberId;

                         // ELEMENT 1: Loyalty Promotional Copy
                         const promoCopy = `Welcome to ${merchantName}! 🎁 Please save our number right now to receive exclusive, real-time weekly offers directly on WhatsApp.`;
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

                         // Small delay to ensure sequential delivery
                         await new Promise(resolve => setTimeout(resolve, 500));

                         // ELEMENT 2: Interactive Contact Card (vCard payload)
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
                      }
                    }
                  } catch (err) {
                    console.error('[META QR LEAD ERROR]', err);
                  }
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    // Return 200 even on error to prevent Meta from disabling the webhook via retries
    console.error('[META_WEBHOOK_ERROR]', error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
