import 'server-only';
import { NextRequest } from 'next/server';
import { requireTenantApi } from '@/server/auth/dal';
import { getEnv } from '@/server/env';
import { BusinessTenant } from '@/server/models/BusinessTenant';
import { connectDB } from '@/server/db';

export const dynamic = 'force-dynamic';

export const PLAN_CONFIG = {
  starter: {
    name: 'Starter Plan',
    priceINR: 1499,
    replyQuota: 1000,
  },
  growth: {
    name: 'Growth Plan',
    priceINR: 3499,
    replyQuota: 3000,
  },
  pro: {
    name: 'Pro Plan',
    priceINR: 7999,
    replyQuota: 10000,
  },
} as const;

export type PlanKey = keyof typeof PLAN_CONFIG;

export async function POST(req: NextRequest) {
  const sessionOrRes = await requireTenantApi(['owner']);
  if (sessionOrRes instanceof Response) return sessionOrRes;

  const tenantId = sessionOrRes.tenantId;

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const plan = body.plan as PlanKey;
  if (!plan || !PLAN_CONFIG[plan]) {
    return Response.json({ error: 'Invalid subscription plan selected' }, { status: 400 });
  }

  await connectDB();
  const tenant = await BusinessTenant.findById(tenantId).lean();
  if (!tenant) {
    return Response.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const env = getEnv();
  const appId = env.CASHFREE_APP_ID;
  const secretKey = env.CASHFREE_SECRET_KEY;
  const apiVersion = env.CASHFREE_API_VERSION;

  if (!appId || !secretKey) {
    return Response.json(
      { error: 'Cashfree billing is not configured in this environment.' },
      { status: 503 },
    );
  }

  const orderId = `SUB_${tenantId.slice(-6)}_${Date.now()}`;
  const planInfo = PLAN_CONFIG[plan];
  const orderAmount = planInfo.priceINR;

  const cashfreeBaseUrl =
    env.NODE_ENV === 'production'
      ? 'https://api.cashfree.com/pg/orders'
      : 'https://sandbox.cashfree.com/pg/orders';

  const orderPayload = {
    order_id: orderId,
    order_amount: orderAmount,
    order_currency: 'INR',
    customer_details: {
      customer_id: tenantId,
      customer_name: tenant.name,
      customer_email: 'billing@' + tenant.slug + '.attendly.in',
      customer_phone: '9999999999',
    },
    order_meta: {
      return_url: `${req.nextUrl.origin}/dashboard/settings?order_id={order_id}`,
      notify_url: `${req.nextUrl.origin}/api/webhook/cashfree`,
      payment_methods: 'cc,dc,upi,nb',
    },
    order_tags: {
      tenantId,
      plan,
      replyQuota: String(planInfo.replyQuota),
    },
  };

  try {
    const cfRes = await fetch(cashfreeBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': apiVersion,
      },
      body: JSON.stringify(orderPayload),
      signal: AbortSignal.timeout(10000),
    });

    const cfData = await cfRes.json();

    if (!cfRes.ok) {
      console.error('[Cashfree Checkout Error]', cfData);
      return Response.json(
        { error: cfData?.message || 'Failed to create payment order' },
        { status: cfRes.status },
      );
    }

    return Response.json({
      orderId: cfData.order_id,
      paymentSessionId: cfData.payment_session_id,
      orderStatus: cfData.order_status,
    });
  } catch (err: unknown) {
    console.error('[Cashfree Network Failure]', err);
    return Response.json({ error: 'Payment gateway communication timed out' }, { status: 504 });
  }
}
