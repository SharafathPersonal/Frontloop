import type { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { z } from 'zod';
import { connectDB } from '@/server/db';
import { User } from '@/server/models/User';
import { BusinessTenant, TENANT_CATEGORIES } from '@/server/models/BusinessTenant';
import { KnowledgeBase } from '@/server/models/KnowledgeBase';
import { hashPassword } from '@/server/auth/password';
import { setSessionCookie } from '@/server/auth/session';
import { rateLimit } from '@/server/rate-limit';
import { clientIp, isSameOrigin, jsonError } from '@/server/http';
import { TRIAL_CONFIG, trialEndsAt } from '@/lib/plans';

export const runtime = 'nodejs';

const Body = z.object({
  businessName: z.string().trim().min(2).max(120),
  category: z.enum(TENANT_CATEGORIES),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200),
});

const slugify = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'business'}-${randomBytes(3).toString('hex')}`;

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError('Forbidden', 403);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid input.', 400);
  const { businessName, category, email, password } = parsed.data;

  await connectDB();

  if (!(await rateLimit(`register:${clientIp(req)}`, 5, 60 * 60))) {
    return jsonError('Too many sign-up attempts. Try again later.', 429);
  }

  if (await User.exists({ email })) return jsonError('An account with this email already exists.', 409);

  // Pre-assigned ids let the three writes reference each other. Writes are
  // sequential with compensating deletes, so this works on standalone Mongo too.
  const userId = new Types.ObjectId();
  const tenantId = new Types.ObjectId();
  const passwordHash = await hashPassword(password);

  try {
    await BusinessTenant.create({
      _id: tenantId,
      name: businessName,
      slug: slugify(businessName),
      category,
      ownerId: userId,
      // The reply worker's quota reservation stops replies once this date passes.
      subscription: { plan: 'trial', status: 'trialing', replyQuota: TRIAL_CONFIG.replyQuota, currentPeriodEnd: trialEndsAt() },
    });
    await User.create({ _id: userId, email, passwordHash, role: 'owner', tenantId });
    await KnowledgeBase.create({ tenantId });
  } catch (err) {
    await Promise.allSettled([
      KnowledgeBase.deleteOne({ tenantId }),
      User.deleteOne({ _id: userId }),
      BusinessTenant.deleteOne({ _id: tenantId }),
    ]);
    if ((err as { code?: number }).code === 11000) return jsonError('An account with this email already exists.', 409);
    throw err;
  }

  await setSessionCookie({ sub: String(userId), tid: String(tenantId), role: 'owner', sv: 0 });
  return Response.json({ ok: true }, { status: 201 });
}
