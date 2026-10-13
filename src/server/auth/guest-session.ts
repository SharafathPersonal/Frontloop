import 'server-only';
import { randomBytes } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getEnv } from '../env';

/**
 * Web chat guest sessions. Deliberately separate from staff sessions: a distinct
 * audience means a guest token can never pass verifyJwt() for the dashboard, and
 * a dashboard token can never act as a guest.
 */
const ISSUER = 'frontloop';
const AUDIENCE = 'frontloop-web-chat';
export const GUEST_SESSION_TTL_SECONDS = 24 * 60 * 60;

const OBJECT_ID = /^[a-f0-9]{24}$/;

export type GuestSession = {
  leadId: string;
  tenantId: string;
  /** Random per-session id; web history and AI context are scoped to it, not to the (unverified) phone. */
  sessionId: string;
  name: string;
  role: 'web_guest';
};

const key = () => new TextEncoder().encode(getEnv().AUTH_SECRET);

/** One cookie per tenant so a visitor can chat with several businesses. HttpOnly: page scripts never see the token. */
export const guestCookieName = (tenantId: string) =>
  `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}flchat_${tenantId}`;

export const newGuestSessionId = () => randomBytes(16).toString('hex');

export async function setGuestSessionCookie(session: Omit<GuestSession, 'role'>): Promise<void> {
  const token = await new SignJWT({ tid: session.tenantId, sid: session.sessionId, name: session.name, role: 'web_guest' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.leadId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${GUEST_SESSION_TTL_SECONDS}s`)
    .sign(key());

  (await cookies()).set(guestCookieName(session.tenantId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: GUEST_SESSION_TTL_SECONDS,
  });
}

/** Overwrite with Secure (not delete()), for the same `__Host-` reason as staff logout. */
export async function clearGuestSessionCookie(tenantId: string): Promise<void> {
  (await cookies()).set(guestCookieName(tenantId), '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/** Valid guest session for exactly this tenant, or null. Never throws for bad tokens. */
export async function readGuestSession(tenantId: string): Promise<GuestSession | null> {
  if (!OBJECT_ID.test(tenantId)) return null;
  const token = (await cookies()).get(guestCookieName(tenantId))?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE });
    const { sub, tid, sid, name, role } = payload;
    if (
      role !== 'web_guest' ||
      tid !== tenantId ||
      typeof sub !== 'string' ||
      !OBJECT_ID.test(sub) ||
      typeof sid !== 'string' ||
      typeof name !== 'string'
    ) {
      return null;
    }
    return { leadId: sub, tenantId, sessionId: sid, name, role: 'web_guest' };
  } catch {
    return null;
  }
}
