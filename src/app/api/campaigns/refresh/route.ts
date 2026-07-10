import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
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
                cookieStore.set(name, value, options),
              );
            } catch {
              /* noop */
            }
          },
        },
      },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let campaignId: string | undefined;
    try {
      const body = await req.json();
      campaignId = body.campaignId;
    } catch (e) {
      // JSON body is optional
    }

    // Fetch messages that are not READ from message_logs
    let query = supabase
      .from('message_logs')
      .select('id, meta_message_id, recipient_phone, campaign_id, status')
      .eq('shop_id', user.id);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data: logs, error: logsError } = await query.neq('status', 'READ');

    if (logsError) {
      console.error('[Refresh API] Error fetching message logs:', logsError);
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json({ ok: true, updatedCount: 0 });
    }

    // Call Baileys express microservice sync status endpoint
    const renderServerUrl = process.env.NEXT_PUBLIC_RENDER_SERVER_URL || 'http://localhost:3001';
    
    const response = await fetch(`${renderServerUrl}/api/whatsapp/sync-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shop_id: user.id,
        messages: logs,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Refresh API] WhatsApp service error:', errText);
      return NextResponse.json({ error: `WhatsApp status sync failed: ${errText}` }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({ ok: true, updatedCount: data.updated?.length || 0 });

  } catch (error) {
    console.error('[Refresh API] Exception occurred:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
