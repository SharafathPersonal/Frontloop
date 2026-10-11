import 'server-only';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTenantApi } from '@/server/auth/dal';
import { isSameOrigin, jsonError } from '@/server/http';
import {
  ORDER_ID_PATTERN,
  OrderTagsSchema,
  fulfilPaidOrder,
  getCashfreeConfig,
  type CashfreeConfig,
} from '@/server/billing';

export const dynamic = 'force-dynamic';

const Body = z.object({ orderId: z.string().regex(ORDER_ID_PATTERN) });

const CashfreeOrder = z.object({
  order_id: z.string(),
  order_status: z.string(),
  order_amount: z.number(),
  order_currency: z.string(),
  order_tags: OrderTagsSchema.nullish(),
});

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError('Forbidden', 403);

  const sessionOrRes = await requireTenantApi(['owner']);
  if (sessionOrRes instanceof Response) return sessionOrRes;
  const { tenantId } = sessionOrRes;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError('A valid orderId is required', 400);
  const { orderId } = parsed.data;

  let config: CashfreeConfig;
  try {
    config = getCashfreeConfig();
  } catch {
    return jsonError('Cashfree billing is not configured in this environment.', 503);
  }

  let order: z.infer<typeof CashfreeOrder>;
  try {
    const cfRes = await fetch(`${config.ordersUrl}/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        'x-client-id': config.appId,
        'x-client-secret': config.secretKey,
        'x-api-version': config.apiVersion,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (cfRes.status === 404) return jsonError('Order not found', 404);

    const cfData = await cfRes.json().catch(() => null);
    const orderParsed = CashfreeOrder.safeParse(cfData);
    if (!cfRes.ok || !orderParsed.success) {
      console.error('[Cashfree Verify] Unexpected order response', cfRes.status, cfData?.message);
      return jsonError('Failed to verify order', 502);
    }
    order = orderParsed.data;
  } catch (err: unknown) {
    console.error('[Cashfree Verify] Network failure', err instanceof Error ? err.message : err);
    return jsonError('Failed to communicate with Cashfree', 504);
  }

  // Tenant binding: an order paid by (or for) another tenant can never upgrade this one.
  if (order.order_id !== orderId || order.order_tags?.tenantId !== tenantId) {
    return jsonError('Order not found', 404);
  }

  if (order.order_status !== 'PAID') {
    return Response.json({
      ok: false,
      orderStatus: order.order_status,
      message: 'Payment has not been completed yet',
    });
  }

  const result = await fulfilPaidOrder({
    orderId: order.order_id,
    tenantId,
    plan: order.order_tags.plan,
    amount: order.order_amount,
    currency: order.order_currency,
    source: 'verify',
  });

  if (result.status === 'duplicate') return jsonError('This payment was already applied', 409);
  if (result.status === 'rejected') {
    console.error(`[Cashfree Verify] Rejected order ${orderId}: ${result.reason}`);
    return jsonError('This order cannot be applied to your account', 422);
  }

  return Response.json({
    ok: true,
    orderStatus: 'PAID',
    plan: result.plan,
    quota: result.quota,
    currentPeriodEnd: result.periodEnd.toISOString(),
  });
}
