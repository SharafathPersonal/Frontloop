import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/server/db';
import { User } from '@/server/models/User';
import { verifyPasswordOrDummy } from '@/server/auth/password';
import { setSessionCookie } from '@/server/auth/session';
import { rateLimit } from '@/server/rate-limit';
import { clientIp, isSameOrigin, jsonError } from '@/server/http';

export const runtime = 'nodejs';

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError('Forbidden', 403);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError('Invalid email or password.', 400);
  const { email, password } = parsed.data;

  await connectDB();

  if (!(await rateLimit(`login:${clientIp(req)}:${email}`, 5, 15 * 60))) {
    return jsonError('Too many sign-in attempts. Try again in 15 minutes.', 429);
  }

  const user = await User.findOne({ email }).select('+passwordHash tenantId role sessionVersion disabled');
  const valid = await verifyPasswordOrDummy(password, user?.passwordHash);

  if (!user || !valid || user.disabled) return jsonError('Invalid email or password.', 401);

  await setSessionCookie({
    sub: String(user._id),
    tid: user.tenantId ? String(user.tenantId) : null,
    role: user.role,
    sv: user.sessionVersion,
  });
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

  return Response.json({ ok: true });
}
