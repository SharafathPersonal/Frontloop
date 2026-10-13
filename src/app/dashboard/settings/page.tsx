import { requireTenant } from '@/server/auth/dal';
import { forTenant } from '@/server/repos/tenant';
import { Settings } from 'lucide-react';
import BillingSettingsClient from './billing-settings-client';
import WhatsAppSettingsClient from './whatsapp-settings-client';
import { TRIAL_CONFIG } from '@/lib/plans';

export const metadata = {
  title: 'Settings & Subscription | FrontLoop',
};

/** Outside the component so render stays pure; evaluated once per request. */
const hasEnded = (periodEnd: Date) => periodEnd.getTime() <= Date.now();

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string | string[] }>;
}) {
  const session = await requireTenant(['owner', 'staff']);
  const repo = forTenant(session.tenantId);
  const isOwner = session.role === 'owner';
  const [tenant, secret, { order_id: orderIdParam }] = await Promise.all([
    repo.getTenant(),
    isOwner ? repo.getWhatsAppSecret() : null,
    searchParams,
  ]);
  const returnedOrderId = typeof orderIdParam === 'string' && orderIdParam ? orderIdParam : null;
  const timeZone = tenant?.timezone || 'Asia/Kolkata';

  const subscription = tenant?.subscription;
  const currentPlan = subscription?.plan || 'trial';
  const periodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const isLapsed = periodEnd ? hasEnded(periodEnd) : false;
  const periodEndLabel = periodEnd?.toLocaleDateString('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const isTrial = currentPlan === 'trial';
  const periodLabel = periodEndLabel
    ? isTrial
      ? `Free trial ${isLapsed ? 'ended' : 'ends'} ${periodEndLabel}`
      : `${isLapsed ? 'Period ended' : 'Current period ends'} ${periodEndLabel}`
    : 'Free trial';

  const whatsapp = tenant?.whatsapp;

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      <div className="border-b border-[#E2E8F0] pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] flex items-center gap-2">
          <Settings className="text-[#047857]" size={24} aria-hidden="true" />
          Business Settings &amp; Subscription
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1">
          Manage your WhatsApp Business connection, reply quotas, and monthly plan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <BillingSettingsClient
          currentPlan={currentPlan}
          status={subscription?.status || 'trialing'}
          repliesUsed={subscription?.repliesUsed ?? 0}
          replyQuota={subscription?.replyQuota ?? TRIAL_CONFIG.replyQuota}
          periodLabel={periodLabel}
          isLapsed={isLapsed}
          canManageBilling={isOwner}
          returnedOrderId={returnedOrderId}
        />

        <WhatsAppSettingsClient
          status={whatsapp?.status ?? 'disconnected'}
          phoneNumberId={whatsapp?.phoneNumberId ?? null}
          wabaId={whatsapp?.wabaId ?? null}
          displayPhoneNumber={whatsapp?.displayPhoneNumber ?? null}
          lastError={whatsapp?.lastError?.message ?? null}
          hasStoredToken={Boolean(secret?.accessTokenEnc)}
          canManage={isOwner}
        />
      </div>
    </div>
  );
}
