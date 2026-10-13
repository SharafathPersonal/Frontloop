import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifyJwt } from '@/server/auth/jwt';

/**
 * Optimistic gate only (JWT signature + expiry). Fails closed: a missing or
 * misconfigured AUTH_SECRET makes verifyJwt throw, which blocks the request.
 * The authoritative check (DB lookup, sessionVersion, role) lives in server/auth/dal.ts.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const claims = await verifyJwt(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!claims) return redirectToLogin(req, pathname + search);
    // Signed in, wrong role: send tenants back to their own workspace.
    if (claims.role !== 'platform_admin') return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Role routing for /dashboard (platform admins -> /admin) is decided by the
  // database-backed requireTenant(), never by JWT claims here: redirecting on a
  // stale token role in both directions could loop.
  if ((pathname === '/dashboard' || pathname.startsWith('/dashboard/')) && !claims) {
    return redirectToLogin(req, pathname + search);
  }

  return NextResponse.next();
}

function redirectToLogin(req: NextRequest, redirect: string) {
  const url = new URL('/auth/login', req.url);
  url.searchParams.set('redirect', redirect);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
