import type { NextRequest } from 'next/server';
import { getSession } from '@/server/auth/dal';
import { clearSessionCookie } from '@/server/auth/session';
import { User } from '@/server/models/User';
import { isSameOrigin, jsonError } from '@/server/http';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError('Forbidden', 403);

  // Revoke server-side too: bumping sessionVersion invalidates every JWT already
  // issued to this user (all devices), so a copied token stops working at logout.
  const session = await getSession();
  if (session) await User.updateOne({ _id: session.userId }, { $inc: { sessionVersion: 1 } });

  await clearSessionCookie();
  return Response.json({ ok: true });
}
