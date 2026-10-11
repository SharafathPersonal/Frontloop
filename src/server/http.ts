import 'server-only';
import type { NextRequest } from 'next/server';

/** CSRF guard for cookie-authenticated mutations in Route Handlers. */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  return origin !== null && origin === req.nextUrl.origin;
}

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export const jsonError = (error: string, status: number) => Response.json({ error }, { status });
