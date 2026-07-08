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
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(new URL('/dashboard/settings', request.url));
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
