import { requireTenant } from '@/server/auth/dal';
import { forTenant } from '@/server/repos/tenant';
import { PLAN_CONFIG } from '@/app/api/checkout/route';
import {
  Settings,
  CreditCard,
  MessageSquare,
  Shield,
  Phone,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const metadata = {
  title: 'Settings & Subscription — True Attendly',
};

export default async function SettingsPage() {
  const session = await requireTenant(['owner', 'staff']);
  const repo = forTenant(session.tenantId);
  const tenant = await repo.getTenant();

  const subscription = tenant?.subscription || {
    plan: 'trial',
    status: 'trialing',
    replyQuota: 300,
    repliesUsed: 0,
  };

  const whatsapp = tenant?.whatsapp || {
    status: 'disconnected',
  };

  const currentPlan = subscription.plan || 'trial';
  const repliesUsed = subscription.repliesUsed || 0;
  const replyQuota = subscription.replyQuota || 300;
  const percentUsed = Math.min(Math.round((repliesUsed / Math.max(replyQuota, 1)) * 100), 100);

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      {/* Header */}
      <div className="border-b border-[#E8E3DA] pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[#3E3B36] flex items-center gap-2">
          <Settings className="text-[#C4A896]" size={24} />
          Business Settings &amp; Subscription
        </h1>
        <p className="text-xs sm:text-sm text-[#8B8378] mt-1">
          Manage your WhatsApp Business connection, reply quotas, and monthly plan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscription & Quota Card */}
        <div className="bg-white rounded-2xl border border-[#E8E3DA] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E3DA] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3E3B36] flex items-center gap-2">
              <CreditCard size={15} className="text-[#C4A896]" />
              Active Subscription
            </h2>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                subscription.status === 'active'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {subscription.status}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-[#8B8378]">Current Tier</p>
            <p className="text-lg font-extrabold text-[#3E3B36] capitalize">
              {currentPlan} Plan
            </p>
          </div>

          {/* Quota Progress */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs text-[#3E3B36]">
              <span>Monthly Reply Usage</span>
              <span className="font-mono font-bold">
                {repliesUsed} / {replyQuota} replies
              </span>
            </div>
            <div className="w-full bg-[#F5F1EA] h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  percentUsed > 90 ? 'bg-rose-500' : 'bg-[#3E3B36]'
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <p className="text-[10px] text-[#8B8378]">
              {subscription.currentPeriodEnd
                ? `Current cycle resets on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                : '14-Day Free Evaluation Window'}
            </p>
          </div>

          {/* Upgrade Matrix Preview */}
          <div className="pt-4 border-t border-[#E8E3DA] space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#8B8378]">
              Available Subscription Upgrades
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded-xl">
                <p className="font-bold text-[#3E3B36]">Starter Plan</p>
                <p className="text-[11px] text-[#8B8378]">₹1,499 / mo</p>
                <p className="text-[10px] text-emerald-700 font-semibold mt-1">1,000 replies</p>
              </div>
              <div className="p-3 bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded-xl">
                <p className="font-bold text-[#3E3B36]">Growth Plan</p>
                <p className="text-[11px] text-[#8B8378]">₹3,499 / mo</p>
                <p className="text-[10px] text-emerald-700 font-semibold mt-1">3,000 replies</p>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Connection Card */}
        <div className="bg-white rounded-2xl border border-[#E8E3DA] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E3DA] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3E3B36] flex items-center gap-2">
              <Phone size={15} className="text-[#C4A896]" />
              WhatsApp Cloud Connectivity
            </h2>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                whatsapp.status === 'connected'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : whatsapp.status === 'error'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-stone-100 text-stone-700 border-stone-300'
              }`}
            >
              {whatsapp.status}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-[#8B8378]">
              Connected Phone Number ID:
            </p>
            <p className="font-mono bg-[#F5F1EA] p-2.5 rounded-lg text-[#3E3B36] font-semibold break-all">
              {whatsapp.phoneNumberId || 'Not connected yet'}
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-[#8B8378]">
              Display Phone Number:
            </p>
            <p className="font-mono bg-[#F5F1EA] p-2.5 rounded-lg text-[#3E3B36] font-semibold">
              {whatsapp.displayPhoneNumber || 'None specified'}
            </p>
          </div>

          <div className="pt-4 border-t border-[#E8E3DA] space-y-2">
            <p className="text-[11px] text-[#8B8378] leading-relaxed">
              Meta WhatsApp Business numbers are managed through the official Meta App dashboard. For dedicated onboarding or number migrations, contact our integration architects.
            </p>
            <a
              href="mailto:support@trueattendly.online"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C4A896] hover:text-[#3E3B36]"
            >
              Contact Onboarding Support <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
