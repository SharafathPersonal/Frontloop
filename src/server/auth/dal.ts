import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connectDB } from '../db';
import { User, type UserRole } from '../models/User';
import { SESSION_COOKIE, verifyJwt } from './jwt';

export type Session = { userId: string; tenantId: string | null; role: UserRole };
export type TenantSession = Session & { tenantId: string };

/**
 * Authoritative session check: JWT signature + a DB lookup, memoised per request.
 * Role and tenant come from the database, not the token, so demotions and
 * `sessionVersion` bumps take effect immediately.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const claims = await verifyJwt((await cookies()).get(SESSION_COOKIE)?.value);
  if (!claims) return null;

  await connectDB();
  const user = await User.findById(claims.sub).select('tenantId role sessionVersion disabled').lean();
  if (!user || user.disabled || user.sessionVersion !== claims.sv) return null;

  return {
    userId: String(user._id),
    tenantId: user.tenantId ? String(user.tenantId) : null,
    role: user.role,
  };
});

const TENANT_ROLES: UserRole[] = ['owner', 'staff'];

/** Server Components / Server Actions: redirects to login when unauthorised. */
export async function requireTenant(roles: UserRole[] = TENANT_ROLES): Promise<TenantSession> {
  const session = await getSession();
  if (!session?.tenantId || !roles.includes(session.role)) redirect('/auth/login');
  return session as TenantSession;
}

/** Route Handlers: returns a 401 Response instead of redirecting. */
export async function requireTenantApi(roles: UserRole[] = TENANT_ROLES): Promise<TenantSession | Response> {
  const session = await getSession();
  if (!session?.tenantId || !roles.includes(session.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session as TenantSession;
}

export async function requirePlatformAdmin(): Promise<Session> {
  const session = await getSession();
  if (session?.role !== 'platform_admin') redirect('/auth/login');
  return session;
}
