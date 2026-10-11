import 'server-only';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTenantApi } from '@/server/auth/dal';
import { connectDB } from '@/server/db';
import { isSameOrigin, jsonError } from '@/server/http';
import { forTenant } from '@/server/repos/tenant';
import { User } from '@/server/models/User';
import { getCashfreeConfig, newOrderId, type CashfreeConfig } from '@/server/billing';
import { PLAN_CONFIG, isPlanKey } from '@/lib/plans';

export const dynamic = 'force-dynamic';

const Body = z.object({ plan: z.string().refine(isPlanKey) });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError('Forbidden', 403);

  const sessionOrRes = await requireTenantApi(['owner']);
  if (sessionOrRes instanceof Response) return sessionOrRes;
  const { tenantId, userId } = sessionOrRes;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isPlanKey(parsed.data.plan)) return jsonError('Invalid subscription plan selected', 400);
  const plan = parsed.data.plan;

  let config: CashfreeConfig;
  try {
    config = getCashfreeConfig();
  } catch {
    return jsonError('Cashfree billing is not configured in this environment.', 503);
  }

  await connectDB();
  const [tenant, owner] = await Promise.all([
    forTenant(tenantId).getTenant(),
    User.findOne({ _id: userId }).select('email').lean(),
  ]);
  if (!tenant || !owner) return jsonError('Tenant not found', 404);

  const orderId = newOrderId();
  const planInfo = PLAN_CONFIG[plan];

  const orderPayload = {
    order_id: orderId,
    order_amount: planInfo.priceINR,
    order_currency: 'INR',
    customer_details: {
      customer_id: tenantId,
      customer_name: tenant.name,
      customer_email: owner.email,
      customer_phone: tenant.whatsapp?.displayPhoneNumber?.replace(/\D/g, '').slice(-10) || '9999999999',
    },
    order_meta: {
      return_url: `${req.nextUrl.origin}/dashboard/settings?order_id={order_id}`,
      notify_url: `${req.nextUrl.origin}/api/webhook/cashfree`,
      payment_methods: 'cc,dc,upi,nb',
    },
    order_tags: { tenantId, plan },
  };

  try {
    const cfRes = await fetch(config.ordersUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': config.appId,
        'x-client-secret': config.secretKey,
        'x-api-version': config.apiVersion,
      },
      body: JSON.stringify(orderPayload),
      signal: AbortSignal.timeout(10000),
    });

    const cfData = await cfRes.json().catch(() => null);
    if (!cfRes.ok || !cfData?.payment_session_id) {
      console.error('[Cashfree Checkout] Order creation failed', cfRes.status, cfData?.message);
      return jsonError('Failed to create payment order', 502);
    }

    return Response.json({
      orderId: cfData.order_id,
      paymentSessionId: cfData.payment_session_id,
      orderStatus: cfData.order_status,
      mode: config.mode,
    });
  } catch (err: unknown) {
    console.error('[Cashfree Checkout] Network failure', err instanceof Error ? err.message : err);
    return jsonError('Payment gateway communication timed out', 504);
  }
}
