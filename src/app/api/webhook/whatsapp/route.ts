import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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
            const metaEvent = change.value.event;
            let dbStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
            if (metaEvent === 'APPROVED') {
              dbStatus = 'APPROVED';
            } else if (metaEvent === 'REJECTED' || metaEvent === 'PAUSED' || metaEvent === 'DISABLED') {
              dbStatus = 'REJECTED';
            }

            await adminSupabase
              .from('message_templates')
              .update({ status: dbStatus })
              .eq('template_name', templateName);
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
