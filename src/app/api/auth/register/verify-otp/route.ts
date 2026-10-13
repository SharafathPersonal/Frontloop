import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/server/db';
import { TENANT_CATEGORIES } from '@/server/models/BusinessTenant';
import { verifyOtp } from '@/server/auth/otp';
import { createOwnerWorkspace, type PendingRegistration } from '@/server/auth/workspace';
import { setSessionCookie } from '@/server/auth/session';
import { rateLimit } from '@/server/rate-limit';
import { clientIp, isSameOrigin, jsonError } from '@/server/http';
import { OtpCodeSchema } from '@/lib/password-policy';

export const runtime = 'nodejs';

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  code: OtpCodeSchema,
});

// Re-validated after decryption: the payload is ours, but never trusted blindly.
const Pending = z.object({
  businessName: z.string().min(2).max(120),
  category: z.enum(TENANT_CATEGORIES),
  passwordHash: z.string().startsWith('$2'),
});

const INVALID_CODE = 'Invalid or expired code. Check your latest email or request a new code.';

/** Step 2 of signup: verify the emailed code, then create the workspace and sign in. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError('Forbidden', 403);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError('Enter the 6-digit code.', 400);
  const { email, code } = parsed.data;

  await connectDB();
  if (!(await rateLimit(`otp:verify:ip:${clientIp(req)}`, 20, 15 * 60))) {
    return jsonError('Too many attempts. Try again in 15 minutes.', 429);
  }

  const verified = await verifyOtp<PendingRegistration>({ email, purpose: 'register', code });
  if (!verified.ok) return jsonError(INVALID_CODE, 400);

  const pending = Pending.safeParse(verified.payload);
  if (!pending.success) return jsonError('This sign-up request is no longer valid. Please start again.', 400);

  const created = await createOwnerWorkspace({ email, ...pending.data });
  if (!created.ok) return jsonError('An account with this email already exists.', 409);

  await setSessionCookie({ sub: created.userId, tid: created.tenantId, role: 'owner', sv: 0 });
  return Response.json({ ok: true, redirect: '/dashboard' }, { status: 201 });
}
