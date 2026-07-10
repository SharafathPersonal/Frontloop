import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
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
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* noop */ }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get Shop's Meta Connection Mode
    const { data: shop } = await supabase
      .from('shops')
      .select('whatsapp_mode')
      .eq('id', user.id)
      .single();

    if (!shop || shop.whatsapp_mode !== 'META_API') {
      return NextResponse.json({ 
        success: false, 
        error: "Your workspace is not configured for Meta API. Please switch to Meta Official API in Settings." 
      }, { status: 400 });
    }

    // 1b. Get Shop's Meta Credentials from meta_configs
    const { data: metaConfig, error: configError } = await supabase
      .from('meta_configs')
      .select('meta_access_token, meta_business_id')
      .eq('shop_id', user.id)
      .single();

    if (!metaConfig?.meta_access_token || !metaConfig?.meta_business_id) {
      console.error("[META_SYNC_ERROR] Missing token or WABA ID in meta_configs for shop:", user.id);
      return NextResponse.json({ 
        success: false, 
        error: "Your Facebook connection is active, but your WhatsApp Business Account ID or Access Token could not be retrieved from the database. Please re-authenticate via Facebook in Settings." 
      }, { status: 400 });
    }

    // 2. Fetch all templates from Meta
    const metaUrl = `https://graph.facebook.com/v20.0/${metaConfig.meta_business_id}/message_templates?fields=name,status,rejected_reason&limit=100`;
    
    const metaRes = await fetch(metaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${metaConfig.meta_access_token}`
      },
    });

    const metaData = await metaRes.json();

    if (!metaRes.ok || metaData.error) {
      const errMsg = metaData.error?.error_user_msg || metaData.error?.error_user_title || metaData.error?.message || 'Failed to fetch templates from Meta';
      console.error('Meta API Sync Error:', metaData.error);
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    if (!metaData.data || !Array.isArray(metaData.data)) {
        return NextResponse.json({ error: 'Invalid response from Meta API' }, { status: 500 });
    }

    // 3. Update local database matching by shop_id and template_name
    const updates = metaData.data.map((metaTemplate: any) => {
        let dbStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
        const metaEvent = metaTemplate.status;
        
        if (metaEvent === 'APPROVED') {
          dbStatus = 'APPROVED';
        } else if (['REJECTED', 'PAUSED', 'DISABLED'].includes(metaEvent)) {
          dbStatus = 'REJECTED';
        }

        return supabase
            .from('message_templates')
            .update({
                status: dbStatus,
                rejection_reason: metaTemplate.rejected_reason || null,
                meta_template_id: metaTemplate.id,
                updated_at: new Date().toISOString()
            })
            .eq('template_name', metaTemplate.name)
            .eq('shop_id', user.id);
    });

    await Promise.allSettled(updates);

    return NextResponse.json({ ok: true, message: `Synced ${metaData.data.length} templates` });

  } catch (error: any) {
    console.error('GET /api/templates/sync error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
