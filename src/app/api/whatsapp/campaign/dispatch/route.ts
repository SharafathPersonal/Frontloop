import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch { /* noop */ }
        },
      },
    },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { campaignId, templateName, targetSource } = await req.json();

    if (!campaignId || !templateName || !targetSource) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get shop metadata
    const { data: shopInfo } = await adminSupabase
      .from('shops')
      .select('meta_access_token, meta_phone_number_id')
      .eq('id', user.id)
      .single();

    if (!shopInfo || !shopInfo.meta_access_token || !shopInfo.meta_phone_number_id) {
      return NextResponse.json({ error: 'Meta API credentials not configured' }, { status: 400 });
    }

    // Determine target numbers
    let targetNumbers: string[] = [];

    if (targetSource === 'QR_LEADS') {
      const { data: qrLeads } = await adminSupabase
        .from('customers_master')
        .select('whatsapp_number')
        .eq('shop_id', user.id)
        .contains('tags', ['IN_STORE_QR_LEAD']);
        
      if (qrLeads) {
        targetNumbers = qrLeads.map(l => l.whatsapp_number);
      }
    } else {
      // In a real flow, targetSource='CSV' might have pre-inserted the leads into `message_logs` as pending,
      // or numbers might be passed in the payload. We'll stub this for the architecture spec.
      return NextResponse.json({ error: 'CSV source requires pre-parsed arrays or different flow' }, { status: 400 });
    }

    if (targetNumbers.length === 0) {
      return NextResponse.json({ error: 'No valid targets found' }, { status: 400 });
    }

    // Rate-limited asynchronous queue processor (Promise.all chunks)
    const CHUNK_SIZE = 25;
    let totalSent = 0;
    
    // Set campaign status to processing
    await adminSupabase.from('campaigns').update({ status: 'processing', total_recipients: targetNumbers.length }).eq('id', campaignId);

    const chunkArray = (arr: string[], size: number) => {
      return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
      );
    };

    const numberChunks = chunkArray(targetNumbers, CHUNK_SIZE);
    
    // In a true production app, this would be a background worker (like Inngest or BullMQ).
    // Here we chunk it asynchronously in the Next.js edge route.
    for (const chunk of numberChunks) {
      const sendPromises = chunk.map(async (phone) => {
        try {
          const res = await axios.post(
            `https://graph.facebook.com/v20.0/${shopInfo.meta_phone_number_id}/messages`,
            {
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: phone,
              type: "template",
              template: {
                name: templateName,
                language: { code: "en_US" } // or derived dynamically
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${shopInfo.meta_access_token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (res.data?.messages?.[0]?.id) {
             const metaMessageId = res.data.messages[0].id;
             // Log to campaign history dynamically
             await adminSupabase.from('message_logs').insert({
               campaign_id: campaignId,
               meta_message_id: metaMessageId,
               recipient_phone: phone,
               status: 'sent'
             });
             return true;
          }
        } catch (err: any) {
           console.error(`Failed to send to ${phone}:`, err.response?.data || err.message);
           return false;
        }
      });
      
      const results = await Promise.all(sendPromises);
      totalSent += results.filter(r => r).length;
      
      // Artificial delay between chunks to respect Meta Cloud API rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Finalize campaign stats
    await adminSupabase.from('campaigns').update({ 
      status: 'completed', 
      total_sent: totalSent 
    }).eq('id', campaignId);

    return NextResponse.json({ ok: true, totalSent });

  } catch (err: any) {
    console.error('[CAMPAIGN_DISPATCH_ERROR]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
