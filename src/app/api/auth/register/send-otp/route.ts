import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/server/db';
import { User } from '@/server/models/User';
import { TENANT_CATEGORIES } from '@/server/models/BusinessTenant';
import { hashPassword } from '@/server/auth/password';
import { generateAndSendOtp, OTP_RESEND_COOLDOWN_SECONDS, OTP_TTL_MINUTES } from '@/server/auth/otp';
import { isEmailConfigured } from '@/server/email/mailer';
import type { PendingRegistration } from '@/server/auth/workspace';
import { rateLimit } from '@/server/rate-limit';
import { clientIp, isSameOrigin, jsonError } from '@/server/http';
import { PasswordSchema } from '@/lib/password-policy';

export const runtime = 'nodejs';

const Body = z
  .object({
    businessName: z.string().trim().min(2, 'Business name must be at least 2 characters.').max(120),
    category: z.enum(TENANT_CATEGORIES, 'Select your business type.'),
    email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((b) => b.password === b.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });

/** Step 1 of signup: validate details and email a verification code. Nothing is created yet. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError('Forbidden', 403);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid input.', 400);
  const { businessName, category, email, password } = parsed.data;

  if (!isEmailConfigured()) {
    return jsonError('Sign-up is temporarily unavailable. Please contact support.', 503);
  }

  await connectDB();
  const [ipOk, emailOk] = await Promise.all([
    rateLimit(`otp:register:ip:${clientIp(req)}`, 5, 60 * 60),
    rateLimit(`otp:register:email:${email}`, 3, 15 * 60),
  ]);
  if (!ipOk || !emailOk) return jsonError('Too many verification requests. Try again later.', 429);

  if (await User.exists({ email })) return jsonError('An account with this email already exists.', 409);

  // Hash now so the plaintext password is never stored, even encrypted.
  const payload: PendingRegistration = { businessName, category, passwordHash: await hashPassword(password) };

  try {
    const issued = await generateAndSendOtp({ email, purpose: 'register', payload });
    if (!issued.ok) {
      return Response.json(
        { error: `Please wait ${issued.retryAfterSeconds}s before requesting another code.`, retryAfter: issued.retryAfterSeconds },
        { status: 429 },
      );
    }
  } catch (err) {
    console.error('[Register OTP] Email delivery failed', err instanceof Error ? err.message : err);
    return jsonError('We could not send the verification email. Please try again shortly.', 502);
  }

  return Response.json({ ok: true, resendAfter: OTP_RESEND_COOLDOWN_SECONDS, expiresInMinutes: OTP_TTL_MINUTES });
}
