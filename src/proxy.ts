import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifyJwt } from '@/server/auth/jwt';

/**
 * Optimistic gate only (JWT signature + expiry). Fails closed: a missing or
 * misconfigured AUTH_SECRET makes verifyJwt throw, which blocks the request.
 * The authoritative check (DB lookup, sessionVersion, role) lives in server/auth/dal.ts.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const claims = await verifyJwt(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (claims?.role !== 'platform_admin') return redirectToLogin(req, pathname);
  }

  if ((pathname === '/dashboard' || pathname.startsWith('/dashboard/')) && !claims) {
    return redirectToLogin(req, pathname);
  }

  return NextResponse.next();
}

function redirectToLogin(req: NextRequest, next: string) {
  const url = new URL('/auth/login', req.url);
  url.searchParams.set('next', next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
