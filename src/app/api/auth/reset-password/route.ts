import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/server/db';
import { User } from '@/server/models/User';
import { RateLimit } from '@/server/models/RateLimit';
import { verifyOtp } from '@/server/auth/otp';
import { hashPassword } from '@/server/auth/password';
import { clearSessionCookie } from '@/server/auth/session';
import { rateLimit } from '@/server/rate-limit';
import { clientIp, isSameOrigin, jsonError } from '@/server/http';
import { OtpCodeSchema, PasswordSchema } from '@/lib/password-policy';

export const runtime = 'nodejs';

const Body = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    code: OtpCodeSchema,
    newPassword: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((b) => b.newPassword === b.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Verifies the reset code and sets a new password. The hash change and the
 * sessionVersion bump are one atomic update, so every session issued before the
 * reset (including a stolen one) stops working at the same instant.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError('Forbidden', 403);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid input.', 400);
  const { email, code, newPassword } = parsed.data;

  await connectDB();
  if (!(await rateLimit(`otp:verify:ip:${clientIp(req)}`, 20, 15 * 60))) {
    return jsonError('Too many attempts. Try again in 15 minutes.', 429);
  }

  const INVALID = 'Invalid or expired code. Check your latest email or request a new code.';
  const verified = await verifyOtp({ email, purpose: 'reset_password', code });
  if (!verified.ok) return jsonError(INVALID, 400);

  const passwordHash = await hashPassword(newPassword);
  const updated = await User.updateOne({ email }, { $set: { passwordHash }, $inc: { sessionVersion: 1 } });
  if (updated.matchedCount === 0) return jsonError(INVALID, 400);

  // The owner just proved control of the inbox; lift any sign-in lockout their failed attempts caused.
  await RateLimit.deleteMany({ _id: { $regex: `^login:email:${escapeRegex(email)}:` } });

  await clearSessionCookie();
  return Response.json({ ok: true });
}
