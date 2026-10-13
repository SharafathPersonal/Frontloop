import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/server/db';
import { rateLimit } from '@/server/rate-limit';
import { clientIp, isSameOrigin, jsonError } from '@/server/http';
import { getPublicTenant } from '@/server/repos/public-tenant';
import { startWebChatLead } from '@/server/web-chat';
import { clearGuestSessionCookie, newGuestSessionId, setGuestSessionCookie } from '@/server/auth/guest-session';
import { normalizeIndianMobile } from '@/lib/phone';

export const runtime = 'nodejs';

const TenantId = z.string().regex(/^[a-f0-9]{24}$/);

const Body = z.object({
  tenantId: TenantId,
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(50, 'Name must be at most 50 characters.'),
  phone: z.string().max(20).transform((v, ctx) => {
    const phone = normalizeIndianMobile(v);
    if (!phone) ctx.addIssue({ code: 'custom', message: 'Enter a valid 10-digit mobile number.' });
    return phone ?? '';
  }),
});

/** Lead gate: creates (or reuses) the lead and starts a 24-hour guest chat session. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError('Forbidden', 403);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid details.', 400);
  const { tenantId, name, phone } = parsed.data;

  await connectDB();
  if (!(await rateLimit(`chat:session:ip:${clientIp(req)}`, 10, 60 * 60))) {
    return jsonError('Too many chats started from this network. Try again later.', 429);
  }

  const tenant = await getPublicTenant(tenantId);
  if (!tenant) return jsonError('This front desk does not exist.', 404);
  if (!tenant.live) return jsonError('This front desk is not taking chats right now.', 503);

  const leadId = await startWebChatLead(tenantId, name, phone);
  await setGuestSessionCookie({ leadId, tenantId, sessionId: newGuestSessionId(), name });
  return Response.json({ ok: true, name }, { status: 201 });
}

/** "End chat": forgets the guest session on this device. */
export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError('Forbidden', 403);
  const tenantId = TenantId.safeParse(req.nextUrl.searchParams.get('tenantId'));
  if (!tenantId.success) return jsonError('Invalid front desk.', 400);
  await clearGuestSessionCookie(tenantId.data);
  return Response.json({ ok: true });
}
