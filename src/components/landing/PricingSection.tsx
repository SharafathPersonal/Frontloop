import Link from 'next/link';
import { Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { PLAN_CONFIG } from '@/lib/plans';

const formatINR = (value: number) => value.toLocaleString('en-IN');

export function PricingSection() {
  const { starter, growth } = PLAN_CONFIG;

  return (
    <section id="pricing" className="py-24 bg-[#F8FAFC] border-t border-[#E2E8F0] text-[#0F172A] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#64748B] bg-[#F8FAFC] px-3.5 py-1.5 rounded-full border border-[#E2E8F0]">
            Transparent Done-For-You Pricing
          </span>
          <h2 className="serif-headline text-2xl sm:text-4xl text-[#0F172A] mt-4 tracking-tight">
            Stop Paying Salary For After-Hours Inquiries
          </h2>
          <p className="text-sm text-[#64748B] mt-3">
            Predictable flat-fee automation with zero per-message markups or surprise setup fees.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {/* Starter Plan */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl p-8 flex flex-col justify-between hover:border-[#0AAF76] transition-all shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] bg-[#F8FAFC] px-3 py-1 rounded-lg border border-[#E2E8F0]">
                  {starter.name}
                </span>
                <span className="text-xs text-[#64748B] font-medium">Boutique &amp; Single Clinic</span>
              </div>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-extrabold text-[#0F172A]">
                  ₹{formatINR(starter.priceINR)}
                </span>
                <span className="text-xs text-[#64748B]">/ month</span>
              </div>

              <p className="text-xs text-[#64748B] mt-2">
                Ideal for solo doctors, boutique salons, and neighborhood academies starting with WhatsApp automation.
              </p>

              <div className="mt-8 space-y-3.5 text-xs text-[#0F172A]">
                <div className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span><strong>1 Connected WhatsApp Business Number</strong></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span><strong>{formatINR(starter.replyQuota)} AI Conversations</strong> per month</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span>Complete Custom Knowledge Base (Services &amp; FAQs)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span>Bilingual Conversational Understanding (English &amp; Manglish)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span>1-Click Human Agent Takeover Mode</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span>Lead Pipeline Dashboard &amp; CSV Export</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E2E8F0]">
              <Link
                href="/auth/register"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#0F172A] py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-[#E2E8F0]"
              >
                Start 14-Day Free Evaluation
              </Link>
              <p className="text-[10px] text-[#64748B] text-center mt-2">No credit card required to start trial</p>
            </div>
          </div>

          {/* Growth Plan (Featured) */}
          <div className="bg-[#FFFFFF] border-2 border-[#0F172A] rounded-3xl p-8 flex flex-col justify-between relative shadow-md">
            <span className="absolute -top-3.5 right-8 bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
              Most Popular
            </span>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A] bg-[#F8FAFC] px-3 py-1 rounded-lg border border-[#E2E8F0]">
                  {growth.name}
                </span>
                <span className="text-xs text-[#64748B] font-medium">Multi-Doctor &amp; Busy Centers</span>
              </div>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-extrabold text-[#0F172A]">
                  ₹{formatINR(growth.priceINR)}
                </span>
                <span className="text-xs text-[#64748B]">/ month</span>
              </div>

              <p className="text-xs text-[#64748B] mt-2">
                For busy clinics, popular training institutes, and multi-chair studios handling heavy daily inquiry volumes.
              </p>

              <div className="mt-8 space-y-3.5 text-xs text-[#0F172A]">
                <div className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span><strong>1 Connected WhatsApp Business Number</strong></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span><strong>{formatINR(growth.replyQuota)} AI Conversations</strong> per month</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span>Priority Multi-Tier Engine (Gemini 1.5 + Groq LLaMA)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span>Automated Intent Classification (Booking / Pricing / Query)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span>Custom Brand Persona &amp; Tone Engineering</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span>Dedicated WhatsApp Onboarding &amp; Catalog Import Support</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E2E8F0]">
              <Link
                href="/auth/register"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#0AAF76] hover:bg-[#089163] text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
              >
                Get Started With Growth <ArrowRight size={14} />
              </Link>
              <p className="text-[10px] text-[#64748B] text-center mt-2">Done-for-you catalog setup included</p>
            </div>
          </div>
        </div>

        {/* Meta Cost Policy Disclosure */}
        <div className="mt-12 max-w-3xl mx-auto bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-4 flex items-center gap-3 text-xs text-[#64748B] shadow-sm">
          <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
          <span>
            <strong>Official Meta WhatsApp Cloud API Compliant:</strong> Replies within standard 24-hour customer service windows are included in your subscription. Zero hidden markups per inbound response.
          </span>
        </div>
      </div>
    </section>
  );
}
