import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { pathname } = request.nextUrl;

  // 1. Server-side route protection for /dashboard/*
  if (pathname.startsWith('/dashboard')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // 2. Server-side route protection for /admin/* sub-routes (excluding main /admin login page)
  if (pathname.startsWith('/admin/')) {
    const adminSession = request.cookies.get('admin_session')?.value;
    const secureToken = process.env.ADMIN_SECURE_TOKEN;

    if (!adminSession || (secureToken && adminSession !== secureToken)) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
