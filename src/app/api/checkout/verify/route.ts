import 'server-only';
import { NextRequest } from 'next/server';
import { requireTenantApi } from '@/server/auth/dal';
import { getEnv } from '@/server/env';
import { BusinessTenant } from '@/server/models/BusinessTenant';
import { connectDB } from '@/server/db';
import { PLAN_CONFIG, type PlanKey } from '../route';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const sessionOrRes = await requireTenantApi(['owner']);
  if (sessionOrRes instanceof Response) return sessionOrRes;

  const tenantId = sessionOrRes.tenantId;

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const orderId = body.orderId;
  if (!orderId) {
    return Response.json({ error: 'orderId is required' }, { status: 400 });
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

  const cashfreeBaseUrl =
    env.NODE_ENV === 'production'
      ? `https://api.cashfree.com/pg/orders/${orderId}`
      : `https://sandbox.cashfree.com/pg/orders/${orderId}`;

  try {
    const cfRes = await fetch(cashfreeBaseUrl, {
      method: 'GET',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': apiVersion,
      },
      signal: AbortSignal.timeout(10000),
    });

    const orderData = await cfRes.json();
    if (!cfRes.ok) {
      return Response.json(
        { error: orderData?.message || 'Failed to verify order' },
        { status: cfRes.status },
      );
    }

    if (orderData.order_status === 'PAID') {
      const orderTags = orderData.order_tags || {};
      const plan = (orderTags.plan as PlanKey) || 'starter';
      const quota = PLAN_CONFIG[plan]?.replyQuota || 1000;

      await connectDB();

      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30); // 30-day billing cycle

      await BusinessTenant.updateOne(
        { _id: tenantId },
        {
          $set: {
            'subscription.plan': plan,
            'subscription.status': 'active',
            'subscription.currentPeriodEnd': periodEnd,
            'subscription.replyQuota': quota,
          },
        },
      );

      return Response.json({
        ok: true,
        orderStatus: 'PAID',
        plan,
        quota,
        currentPeriodEnd: periodEnd.toISOString(),
      });
    }

    return Response.json({
      ok: false,
      orderStatus: orderData.order_status,
      message: 'Payment has not been completed yet',
    });
  } catch (err: unknown) {
    console.error('[Cashfree Verification Error]', err);
    return Response.json({ error: 'Failed to communicate with Cashfree' }, { status: 504 });
  }
}
