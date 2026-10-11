'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CreditCard, Info, RotateCw } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { PLAN_CONFIG, isPlanKey, type PlanKey } from '@/lib/plans';

type CashfreeMode = 'sandbox' | 'production';

/** Cashfree v3 resolves `checkout()` with exactly one of these keys. */
interface CashfreeCheckoutResult {
  error?: { message?: string };
  redirect?: boolean;
  paymentDetails?: { paymentMessage?: string };
}

interface CashfreeInstance {
  checkout(options: {
    paymentSessionId: string;
    redirectTarget: '_self' | '_blank' | '_top' | '_modal';
  }): Promise<CashfreeCheckoutResult | undefined>;
}

declare global {
  interface Window {
    Cashfree?: (options: { mode: CashfreeMode }) => CashfreeInstance;
  }
}

const CASHFREE_SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';
const SUPPORT_MESSAGE = 'Online billing is not available yet. Contact support to upgrade.';
const PLAN_KEYS = Object.keys(PLAN_CONFIG) as PlanKey[];
const SHARED_FEATURES = [
  '1 WhatsApp Business number',
  'Knowledge base: services, FAQs & hours',
  'Human takeover & lead pipeline',
  'CSV lead export',
];
// The webhook usually lands within seconds of the modal closing; poll briefly before giving up.
const VERIFY_ATTEMPTS = 4;
const VERIFY_RETRY_MS = 2500;

let sdkPromise: Promise<NonNullable<Window['Cashfree']>> | null = null;

/** Injects the Cashfree v3 SDK once, on demand. A failed load can be retried. */
function loadCashfreeSdk(): Promise<NonNullable<Window['Cashfree']>> {
  if (window.Cashfree) return Promise.resolve(window.Cashfree);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CASHFREE_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.Cashfree) resolve(window.Cashfree);
      else reject(new Error('Cashfree SDK loaded without a Cashfree global'));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Cashfree SDK failed to load'));
    };
    document.head.appendChild(script);
  });
  sdkPromise.catch(() => {
    sdkPromise = null;
  });
  return sdkPromise;
}

interface CheckoutResponse {
  orderId: string;
  paymentSessionId: string;
  mode: CashfreeMode;
}

type VerifyResponse =
  | { ok: true; orderStatus: 'PAID'; plan: string; quota: number; currentPeriodEnd: string }
  | { ok: false; orderStatus: string; message: string };

type VerifyOutcome =
  | { kind: 'success'; message: string }
  | { kind: 'pending'; message: string }
  | { kind: 'error'; message: string };

const errorFrom = (data: unknown, fallback: string) =>
  data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : fallback;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function verifyOrder(orderId: string): Promise<VerifyOutcome> {
  for (let attempt = 1; ; attempt++) {
    let res: Response;
    let data: unknown;
    try {
      res = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      data = await res.json().catch(() => null);
    } catch {
      return { kind: 'error', message: 'Network error while confirming your payment. Refresh this page to retry.' };
    }

    // 409: the webhook (or an earlier verify) already applied this order.
    if (res.status === 409) return { kind: 'success', message: 'Payment confirmed. Your plan is active.' };
    if (!res.ok) {
      return {
        kind: 'error',
        message: errorFrom(data, 'We could not confirm this payment. Contact support if you were charged.'),
      };
    }

    const result = data as VerifyResponse;
    if (result.ok) {
      const planName = isPlanKey(result.plan) ? PLAN_CONFIG[result.plan].name : 'your new plan';
      return { kind: 'success', message: `Payment confirmed. You are now on the ${planName}.` };
    }
    if (result.orderStatus !== 'ACTIVE' || attempt >= VERIFY_ATTEMPTS) {
      return {
        kind: 'pending',
        message:
          result.orderStatus === 'ACTIVE'
            ? 'Payment is still processing. Your plan activates automatically once Cashfree confirms it.'
            : result.message || `Payment status: ${result.orderStatus}`,
      };
    }
    await wait(VERIFY_RETRY_MS);
  }
}

interface BillingSettingsProps {
  currentPlan: string;
  status: string;
  repliesUsed: number;
  replyQuota: number;
  periodLabel: string;
  isLapsed: boolean;
  canManageBilling: boolean;
  returnedOrderId: string | null;
}

export default function BillingSettingsClient({
  currentPlan,
  status,
  repliesUsed,
  replyQuota,
  periodLabel,
  isLapsed,
  canManageBilling,
  returnedOrderId,
}: BillingSettingsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);
  const [isVerifying, setIsVerifying] = useState(returnedOrderId !== null && canManageBilling);
  const verifiedRef = useRef(false);

  const percentUsed = Math.min(Math.round((repliesUsed / Math.max(replyQuota, 1)) * 100), 100);
  const currentPrice = isPlanKey(currentPlan) ? PLAN_CONFIG[currentPlan].priceINR : 0;
  const planLabel = isPlanKey(currentPlan) ? PLAN_CONFIG[currentPlan].name.replace(/ Plan$/, '') : 'Free Trial';
  const isActive = status === 'active' && !isLapsed;

  const confirmPayment = useCallback(
    async (orderId: string, fromRedirect: boolean) => {
      setIsVerifying(true);
      const outcome = await verifyOrder(orderId);
      setIsVerifying(false);
      showToast(outcome.message, outcome.kind === 'pending' ? 'info' : outcome.kind);
      if (fromRedirect) router.replace('/dashboard/settings');
      if (outcome.kind === 'success') router.refresh();
    },
    [router, showToast],
  );

  // Redirect-based payment methods come back with ?order_id= instead of resolving the modal.
  useEffect(() => {
    if (!returnedOrderId || !canManageBilling || verifiedRef.current) return;
    verifiedRef.current = true;
    void confirmPayment(returnedOrderId, true);
  }, [returnedOrderId, canManageBilling, confirmPayment]);

  const startCheckout = async (plan: PlanKey) => {
    setPendingPlan(plan);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(
          res.status === 503 ? SUPPORT_MESSAGE : errorFrom(data, 'Could not start checkout. Please try again.'),
          'error',
        );
        return;
      }

      const { orderId, paymentSessionId, mode } = data as CheckoutResponse;
      const cashfree = await loadCashfreeSdk();
      const result = await cashfree({ mode }).checkout({ paymentSessionId, redirectTarget: '_modal' });

      if (result?.error) {
        showToast(result.error.message || 'Payment was not completed.', 'error');
      } else if (result?.paymentDetails) {
        await confirmPayment(orderId, false);
      }
      // result.redirect: the browser is leaving for the bank page; the return URL verifies.
    } catch {
      showToast('Could not reach the payment gateway. Please try again.', 'error');
    } finally {
      setPendingPlan(null);
    }
  };

  const busy = pendingPlan !== null || isVerifying;

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
          <CreditCard size={15} className="text-[#0AAF76]" aria-hidden="true" />
          Plan &amp; Usage
        </h2>
        <span
          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
            isActive
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {isLapsed ? 'expired' : status.replace('_', ' ')}
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[#64748B]">Current plan</p>
          <p className="mt-1 inline-flex items-center gap-2">
            <span className="text-lg font-extrabold text-[#0F172A]">{planLabel}</span>
            {isPlanKey(currentPlan) && (
              <span className="text-[11px] text-[#64748B]">
                ₹{currentPrice.toLocaleString('en-IN')} / mo
              </span>
            )}
          </p>
        </div>
        <p className="text-[11px] text-[#64748B]">{periodLabel}</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-[#0F172A]">
          <span id="reply-usage-label">Monthly reply usage</span>
          <span className="font-mono font-bold">
            {repliesUsed.toLocaleString('en-IN')} / {replyQuota.toLocaleString('en-IN')} ({percentUsed}%)
          </span>
        </div>
        <div
          role="progressbar"
          aria-labelledby="reply-usage-label"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentUsed}
          className="w-full bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden"
        >
          <div
            className={`h-full rounded-full transition-all ${
              percentUsed >= 90 ? 'bg-rose-500' : percentUsed >= 75 ? 'bg-amber-500' : 'bg-[#0AAF76]'
            }`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      <div aria-live="polite">
        {isVerifying && (
          <p role="status" className="p-3 rounded-xl text-xs font-medium flex items-center gap-2 border bg-slate-50 text-[#0F172A] border-[#E2E8F0]">
            <RotateCw size={14} className="animate-spin shrink-0" aria-hidden="true" />
            Confirming your payment with Cashfree…
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Subscription plans</p>

        <ul className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3 gap-3 text-xs">
          {PLAN_KEYS.map((key) => {
            const plan = PLAN_CONFIG[key];
            const isCurrent = currentPlan === key;
            const isPending = pendingPlan === key;
            const action = isCurrent ? 'Renew' : plan.priceINR > currentPrice ? 'Upgrade' : 'Switch';
            return (
              <li
                key={key}
                className={`p-4 border rounded-xl flex flex-col gap-3 ${
                  isCurrent ? 'bg-white border-[#0F172A] ring-1 ring-[#0F172A]' : 'bg-[#F8FAFC]/50 border-[#E2E8F0]'
                }`}
              >
                <div>
                  <p className="font-bold text-[#0F172A]">{plan.name}</p>
                  <p className="mt-1">
                    <span className="text-base font-extrabold text-[#0F172A]">₹{plan.priceINR.toLocaleString('en-IN')}</span>
                    <span className="text-[11px] text-[#64748B]"> / month</span>
                  </p>
                </div>

                <ul className="space-y-1.5 text-[11px] text-[#0F172A]">
                  <li className="flex items-start gap-1.5 font-semibold">
                    <Check size={12} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                    {plan.replyQuota.toLocaleString('en-IN')} AI replies / month
                  </li>
                  {SHARED_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-1.5">
                      <Check size={12} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent && isActive ? (
                  <span className="mt-auto text-center text-[10px] font-bold uppercase tracking-wider text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg py-1.5">
                    Current plan
                  </span>
                ) : (
                  canManageBilling && (
                    <button
                      type="button"
                      onClick={() => startCheckout(key)}
                      disabled={busy}
                      aria-busy={isPending}
                      aria-label={`${action} to ${plan.name}, ₹${plan.priceINR.toLocaleString('en-IN')} per month`}
                      className="mt-auto inline-flex items-center justify-center gap-1.5 bg-[#047857] hover:bg-[#065F46] text-white rounded-lg py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending && <RotateCw size={12} className="animate-spin" aria-hidden="true" />}
                      {isPending ? 'Opening checkout…' : action}
                    </button>
                  )
                )}
              </li>
            );
          })}
        </ul>

        <p className="text-[10px] text-[#64748B] leading-relaxed">
          Plans are prepaid for 30 days. A new payment starts a fresh 30-day period immediately and resets your reply count; unused replies do not carry over.
        </p>

        {!canManageBilling && (
          <p className="text-[11px] text-[#64748B] flex items-center gap-1.5">
            <Info size={12} aria-hidden="true" />
            Only the account owner can change plans.
          </p>
        )}
      </div>
    </div>
  );
}
