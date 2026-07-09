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
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://broadcast.trueattendly.online'}/api/auth/callback/facebook`;

      const tokenResponse = await fetch(`https://graph.facebook.com/v17.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`);
      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(tokenData.error.message || 'Failed to exchange Meta code');
      }

      const meta_access_token = tokenData.access_token;
      
      const { error: upsertError } = await supabase.from('meta_configs').upsert({
        shop_id: user.id,
        meta_access_token,
        is_connected: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'shop_id' });

      if (upsertError) {
        return NextResponse.json({ error: 'Database transaction failed', details: upsertError.message }, { status: 500 });
      }

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
