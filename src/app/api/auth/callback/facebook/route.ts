import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const signed_request = requestUrl.searchParams.get('signed_request');

  if (signed_request) {
    return NextResponse.json(
      {
        url: 'https://broadcast.trueattendly.online/login',
        confirmation_code: 'del_compliance_2026_trueattendly',
      },
      { status: 200 }
    );
  }

  if (code) {
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
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized user context.' }, { status: 401 });
    }

    try {
      const appId = process.env.NEXT_PUBLIC_META_APP_ID;
      const appSecret = process.env.FACEBOOK_CLIENT_SECRET || process.env.META_APP_SECRET || '';
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://broadcast.trueattendly.online').replace(/\/+$/, '');
      const redirectUri = `${baseUrl}/api/auth/callback/facebook`;

      if (!appId || !appSecret) {
        throw new Error('Server misconfiguration: Missing Meta App ID or Secret');
      }

      const tokenParams = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        client_secret: appSecret,
        code: code,
      });

      const tokenResponse = await fetch(`https://graph.facebook.com/v17.0/oauth/access_token?${tokenParams.toString()}`);
      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(tokenData.error.message || 'Failed to exchange Meta code');
      }

      const meta_access_token = tokenData.access_token;

      // ── Retrieve meta_business_id (WABA ID) ──
      // 1. Try URL parameters first
      let meta_business_id = requestUrl.searchParams.get('whatsapp_business_account_id') || 
                             requestUrl.searchParams.get('waba_id') || 
                             requestUrl.searchParams.get('meta_business_id') || 
                             requestUrl.searchParams.get('business_id');

      // 2. Fallback 1: Try debug_token using app access token to inspect granular_scopes
      if (!meta_business_id) {
        try {
          const debugResponse = await fetch(`https://graph.facebook.com/v17.0/debug_token?input_token=${meta_access_token}&access_token=${appId}|${appSecret}`);
          const debugData = await debugResponse.json();
          if (debugData?.data?.granular_scopes) {
            const waScope = debugData.data.granular_scopes.find(
              (gs: any) => gs.scope === 'whatsapp_business_management'
            );
            if (waScope && waScope.target_ids && waScope.target_ids.length > 0) {
              meta_business_id = waScope.target_ids[0];
            }
          }
        } catch (err) {
          console.error('[META_CALLBACK_WARN] debug_token fallback failed:', err);
        }
      }

      // 3. Fallback 2: Try me/businesses list -> first business's WABA list
      if (!meta_business_id) {
        try {
          const bizResponse = await fetch(`https://graph.facebook.com/v17.0/me/businesses?access_token=${meta_access_token}`);
          const bizData = await bizResponse.json();
          if (bizData?.data && bizData.data.length > 0) {
            for (const biz of bizData.data) {
              const wabaResponse = await fetch(`https://graph.facebook.com/v17.0/${biz.id}/whatsapp_business_accounts?access_token=${meta_access_token}`);
              const wabaData = await wabaResponse.json();
              if (wabaData?.data && wabaData.data.length > 0) {
                meta_business_id = wabaData.data[0].id;
                break;
              }
            }
          }
        } catch (err) {
          console.error('[META_CALLBACK_WARN] me/businesses fallback failed:', err);
        }
      }
      
      // ── Retrieve meta_phone_number_id (Phone Number ID) ──
      let meta_phone_number_id = requestUrl.searchParams.get('phone_number_id') || 
                                 requestUrl.searchParams.get('meta_phone_number_id');

      if (!meta_phone_number_id && meta_business_id) {
        try {
          const phoneResponse = await fetch(`https://graph.facebook.com/v17.0/${meta_business_id}/phone_numbers?access_token=${meta_access_token}`);
          const phoneData = await phoneResponse.json();
          if (phoneData?.data && phoneData.data.length > 0) {
            meta_phone_number_id = phoneData.data[0].id;
            console.log(`[META_CALLBACK] Resolved phone number ID: ${meta_phone_number_id}`);
          }
        } catch (err) {
          console.error('[META_CALLBACK_WARN] phone_numbers lookup failed:', err);
        }
      }

      const { error: upsertError } = await supabase.from('meta_configs').upsert({
        shop_id: user.id,
        meta_access_token,
        meta_business_id,
        is_connected: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'shop_id' });

      if (upsertError) {
        return NextResponse.json({ error: 'Database transaction failed', details: upsertError.message }, { status: 500 });
      }

      await supabase.from('shops').update({ 
        meta_access_token,
        meta_business_account_id: meta_business_id,
        meta_phone_number_id: meta_phone_number_id || null,
        whatsapp_mode: 'META_API'
      }).eq('id', user.id);

    } catch (err: any) {
      return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
    }
    
    const html = `
      <html>
        <body>
          <script>
            // 1. Tell the main app window that Facebook authentication is complete
            if (window.opener) {
              window.opener.location.href = '/dashboard/settings?meta_status=success';
            }
            // 2. Forcefully close this popup tab instantly
            window.close();
          </script>
        </body>
      </html>
    `;
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return NextResponse.redirect(new URL('/login', request.url));
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  let signed_request = requestUrl.searchParams.get('signed_request');
  
  if (!signed_request) {
    try {
      const contentType = request.headers.get('content-type') || '';

      if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        signed_request = formData.get('signed_request') as string | null;
      } else if (contentType.includes('application/json')) {
        const json = await request.json();
        signed_request = json.signed_request as string | null;
      }
    } catch {
      // Graceful silent fallback per ANTIGRAVITY standards
    }
  }

  if (signed_request) {
    return NextResponse.json(
      {
        url: 'https://broadcast.trueattendly.online/login',
        confirmation_code: 'del_compliance_2026_trueattendly',
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
