import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from '../models/User';

// Pure module (no next/headers, no DB) so the proxy can import it.

export type SessionClaims = { sub: string; tid: string | null; role: UserRole; sv: number };

export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-session' : 'session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const ISSUER = 'frontloop';
const AUDIENCE = 'frontloop-web';

let cachedKey: Uint8Array | null = null;

function secretKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET must be set and at least 32 characters');
  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

export function signJwt(claims: SessionClaims): Promise<string> {
  return new SignJWT({ tid: claims.tid, role: claims.role, sv: claims.sv })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

/** Signature + expiry check only. Returns null on any failure — never throws for bad tokens. */
export async function verifyJwt(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload.sub !== 'string' || typeof payload.sv !== 'number' || typeof payload.role !== 'string') {
      return null;
    }
    return {
      sub: payload.sub,
      tid: typeof payload.tid === 'string' ? payload.tid : null,
      role: payload.role as UserRole,
      sv: payload.sv,
    };
  } catch {
    return null;
  }
}
