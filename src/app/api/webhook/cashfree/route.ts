import 'server-only';
import { NextRequest } from 'next/server';
import { getEnv } from '@/server/env';
import { verifyCashfreeSignature } from '@/server/crypto';
import { connectDB } from '@/server/db';
import { BusinessTenant } from '@/server/models/BusinessTenant';
import { PLAN_CONFIG, type PlanKey } from '@/app/api/checkout/route';

export const dynamic = 'force-dynamic';

/**
 * Signature-verified Cashfree Webhook Handler
 * Updates BusinessTenant.subscription upon PAYMENT_SUCCESS_WEBHOOK
 */
export async function POST(req: NextRequest) {
  const env = getEnv();
  const secretKey = env.CASHFREE_SECRET_KEY;

  const rawBody = await req.text();
  const timestampHeader = req.headers.get('x-webhook-timestamp');
  const signatureHeader = req.headers.get('x-webhook-signature');

  // Constant-time signature verification
  if (secretKey) {
    const isValid = verifyCashfreeSignature(rawBody, timestampHeader, signatureHeader, secretKey);
    if (!isValid) {
      console.warn('[Cashfree Webhook] Invalid signature verification');
      return new Response('Unauthorized', { status: 401 });
    }
  }

  let event: {
    type?: string;
    data?: {
      order?: {
        order_id?: string;
        order_amount?: number;
        order_tags?: {
          tenantId?: string;
          plan?: string;
          replyQuota?: string;
        };
      };
      payment?: {
        payment_status?: string;
      };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // Idempotently process PAYMENT_SUCCESS_WEBHOOK
  if (
    event.type === 'PAYMENT_SUCCESS_WEBHOOK' ||
    event.data?.payment?.payment_status === 'SUCCESS'
  ) {
    const orderTags = event.data?.order?.order_tags;
    const tenantId = orderTags?.tenantId;
    const plan = (orderTags?.plan as PlanKey) || 'starter';

    if (tenantId) {
      await connectDB();
      const planInfo = PLAN_CONFIG[plan] || PLAN_CONFIG.starter;
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);

      await BusinessTenant.updateOne(
        { _id: tenantId },
        {
          $set: {
            'subscription.plan': plan,
            'subscription.status': 'active',
            'subscription.currentPeriodEnd': periodEnd,
            'subscription.replyQuota': planInfo.replyQuota,
          },
        },
      );
      console.log(`[Cashfree Webhook] Activated ${plan} subscription for tenant ${tenantId}`);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
