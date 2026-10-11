import 'server-only';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCashfreeSignature } from '@/server/crypto';
import { OrderTagsSchema, fulfilPaidOrder, getCashfreeConfig, type CashfreeConfig } from '@/server/billing';

export const dynamic = 'force-dynamic';

const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;

const PaymentSuccessEvent = z.object({
  type: z.literal('PAYMENT_SUCCESS_WEBHOOK'),
  data: z.object({
    order: z.object({
      order_id: z.string(),
      order_amount: z.number(),
      order_currency: z.string(),
      order_tags: OrderTagsSchema,
    }),
    payment: z.object({
      payment_status: z.literal('SUCCESS'),
    }),
  }),
});

/** Cashfree sends epoch milliseconds; tolerate seconds so a format change can't open a replay window. */
function isFresh(timestampHeader: string | null): boolean {
  const raw = Number(timestampHeader);
  if (!Number.isFinite(raw) || raw <= 0) return false;
  const ms = raw < 1e12 ? raw * 1000 : raw;
  return Math.abs(Date.now() - ms) <= MAX_WEBHOOK_AGE_MS;
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

/**
 * Signature-verified, replay-protected, idempotent Cashfree webhook.
 * Fails closed: no billing configuration means no request is ever processed.
 */
export async function POST(req: NextRequest) {
  let config: CashfreeConfig;
  try {
    config = getCashfreeConfig();
  } catch {
    return json({ error: 'Billing is not configured' }, 503);
  }

  const rawBody = await req.text();
  const timestampHeader = req.headers.get('x-webhook-timestamp');
  const signatureHeader = req.headers.get('x-webhook-signature');

  if (!verifyCashfreeSignature(rawBody, timestampHeader, signatureHeader, config.secretKey)) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!isFresh(timestampHeader)) {
    return json({ error: 'Stale webhook' }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Bad Request' }, 400);
  }

  // Other event types (failed, dropped, refunds) are acknowledged so Cashfree stops retrying.
  const event = PaymentSuccessEvent.safeParse(payload);
  if (!event.success) return json({ ok: true, ignored: true });

  const { order } = event.data.data;
  const result = await fulfilPaidOrder({
    orderId: order.order_id,
    tenantId: order.order_tags.tenantId,
    plan: order.order_tags.plan,
    amount: order.order_amount,
    currency: order.order_currency,
    source: 'webhook',
  });

  if (result.status === 'rejected') {
    // Permanent failure: 2xx so Cashfree does not retry an order that can never be applied.
    console.error(`[Cashfree Webhook] Rejected order ${order.order_id}: ${result.reason}`);
    return json({ ok: false, error: 'Order rejected' });
  }

  return json({ ok: true, status: result.status });
}
