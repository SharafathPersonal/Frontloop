import 'server-only';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signJwt, type SessionClaims } from './jwt';

export async function setSessionCookie(claims: SessionClaims) {
  const token = await signJwt(claims);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

/**
 * Overwrites rather than `cookies().delete()`: delete() omits `Secure`, and browsers
 * ignore any `__Host-` Set-Cookie without it, so the session would survive logout.
 */
export async function clearSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
