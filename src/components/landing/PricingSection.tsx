import Link from 'next/link';
import { Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { PLAN_CONFIG, PLAN_FEATURES, PLAN_KEYS, TRIAL_CONFIG } from '@/lib/plans';

const formatINR = (value: number) => value.toLocaleString('en-IN');

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-[#F8FAFC] border-t border-[#E2E8F0] text-[#0F172A] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#64748B] bg-[#F8FAFC] px-3.5 py-1.5 rounded-full border border-[#E2E8F0]">
            Transparent Monthly Pricing
          </span>
          <h2 className="serif-headline text-2xl sm:text-4xl text-[#0F172A] mt-4 tracking-tight">
            Stop Paying Salary For After-Hours Inquiries
          </h2>
          <p className="text-sm text-[#64748B] mt-3">
            Flat monthly plans in INR with no setup fees. Every plan includes the full product; plans differ by how many
            AI replies you need. Start with a {TRIAL_CONFIG.days}-day free trial ({formatINR(TRIAL_CONFIG.replyQuota)}{' '}
            AI replies), no card required.
          </p>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {PLAN_KEYS.map((key) => {
            const plan = PLAN_CONFIG[key];
            return (
              <li
                key={key}
                className={`bg-[#FFFFFF] rounded-3xl p-7 flex flex-col justify-between relative ${
                  plan.featured
                    ? 'border-2 border-[#0F172A] shadow-md'
                    : 'border border-[#E2E8F0] hover:border-[#047857] transition-all shadow-sm'
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3.5 right-8 bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] bg-[#F8FAFC] px-3 py-1 rounded-lg border border-[#E2E8F0]">
                      {plan.name}
                    </h3>
                    <span className="text-xs text-[#64748B] font-medium">{plan.audience}</span>
                  </div>

                  <p className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold text-[#0F172A]">₹{formatINR(plan.priceINR)}</span>
                    <span className="text-xs text-[#64748B]">/ month</span>
                  </p>

                  <p className="text-xs text-[#64748B] mt-2">{plan.tagline}</p>

                  <ul className="mt-8 space-y-3.5 text-xs text-[#0F172A]">
                    <li className="flex items-start gap-2.5">
                      <Check size={16} className="text-[#047857] shrink-0" aria-hidden="true" />
                      <span>
                        <strong>{formatINR(plan.replyQuota)} AI Replies</strong> per month
                      </span>
                    </li>
                    {[...PLAN_FEATURES, ...plan.extras].map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check size={16} className="text-[#047857] shrink-0" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-[#E2E8F0]">
                  <Link
                    href="/auth/register"
                    className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      plan.featured
                        ? 'bg-[#047857] hover:bg-[#065F46] text-white shadow-sm'
                        : 'bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#0F172A] border border-[#E2E8F0]'
                    }`}
                  >
                    Start {TRIAL_CONFIG.days}-Day Free Trial {plan.featured && <ArrowRight size={14} aria-hidden="true" />}
                  </Link>
                  <p className="text-[10px] text-[#64748B] text-center mt-2">
                    Choose {plan.name} from Settings whenever you are ready
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Meta Cost Policy Disclosure */}
        <div className="mt-12 max-w-3xl mx-auto bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-4 flex items-center gap-3 text-xs text-[#64748B] shadow-sm">
          <ShieldCheck size={20} className="text-[#047857] shrink-0" aria-hidden="true" />
          <span>
            <strong>Official Meta WhatsApp Cloud API:</strong> Replies within WhatsApp&apos;s standard 24-hour customer
            service window are included in your subscription. Each automated AI reply counts once against your monthly
            allowance; staff replies from the dashboard do not.
          </span>
        </div>
      </div>
    </section>
  );
}
