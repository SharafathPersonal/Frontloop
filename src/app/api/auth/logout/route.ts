import type { NextRequest } from 'next/server';
import { clearSessionCookie } from '@/server/auth/session';
import { isSameOrigin, jsonError } from '@/server/http';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError('Forbidden', 403);
  await clearSessionCookie();
  return Response.json({ ok: true });
}
