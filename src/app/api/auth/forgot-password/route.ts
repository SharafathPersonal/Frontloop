import { after, type NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/server/db';
import { User } from '@/server/models/User';
import { generateAndSendOtp, OTP_RESEND_COOLDOWN_SECONDS, OTP_TTL_MINUTES } from '@/server/auth/otp';
import { isEmailConfigured } from '@/server/email/mailer';
import { rateLimit } from '@/server/rate-limit';
import { clientIp, isSameOrigin, jsonError } from '@/server/http';

export const runtime = 'nodejs';

const Body = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254) });

const GENERIC_RESPONSE = {
  ok: true,
  message: 'If an account exists with this email, an OTP has been sent.',
  resendAfter: OTP_RESEND_COOLDOWN_SECONDS,
  expiresInMinutes: OTP_TTL_MINUTES,
};

/**
 * Requests a password reset code. Enumeration-safe: the response, status and
 * timing are the same whether or not the account exists. The only work done
 * before responding (rate limits plus one indexed lookup) is identical for both,
 * and the slow SMTP send happens in after(), off the response path.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError('Forbidden', 403);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Enter a valid email address.', 400);
  const { email } = parsed.data;

  if (!isEmailConfigured()) {
    return jsonError('Password reset is temporarily unavailable. Please contact support.', 503);
  }

  await connectDB();
  const [ipOk, emailOk] = await Promise.all([
    rateLimit(`otp:reset:ip:${clientIp(req)}`, 10, 60 * 60),
    rateLimit(`otp:reset:email:${email}`, 3, 15 * 60),
  ]);
  if (!ipOk || !emailOk) return jsonError('Too many reset requests. Try again later.', 429);

  const user = await User.findOne({ email }).select('disabled').lean();

  after(async () => {
    if (!user || user.disabled) return;
    try {
      // A cooldown refusal is deliberately silent: reporting it would reveal that the account exists.
      await generateAndSendOtp({ email, purpose: 'reset_password' });
    } catch (err) {
      console.error('[Reset OTP] Email delivery failed', err instanceof Error ? err.message : err);
    }
  });

  return Response.json(GENERIC_RESPONSE);
}
