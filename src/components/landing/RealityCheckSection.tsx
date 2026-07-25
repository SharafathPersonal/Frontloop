'use client';

import React from 'react';
import { XCircle, CheckCircle, X, Check } from 'lucide-react';

export function RealityCheckSection() {
  return (
    <section id="comparison" className="w-full py-24 px-6 bg-white scroll-reveal-section font-outfit">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16 gsap-reveal">
          <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
            The Reality Check
          </span>
          <h2 className="serif-headline text-3xl sm:text-4xl text-[#5C4033] mt-4 mb-4">
            Why Legacy Checkout is Hurting Your Retail Sales
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
            We compared traditional, paper-based billing layouts against the True Attendly digital broadcast pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto gsap-reveal">
          {/* Legacy checkout */}
          <div className="bg-[#FAF6F0] border border-red-200 rounded-2xl p-8 flex flex-col justify-between hover:shadow-lg transition-all">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center border border-red-100 shrink-0">
                  <XCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">The Daily Retail Struggle</h3>
                  <p className="text-[9px] text-red-500 font-semibold uppercase tracking-widest mt-0.5">
                    High Costs and Friction
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Merchants waste fortunes on expensive thermal paper rolls and remain chained to rigid, legacy PC-based billing systems that slow down checkout queues, while customers refuse to share phone numbers due to privacy friction.
              </p>

              <ul className="space-y-3 text-xs text-slate-500 border-t border-slate-200/60 pt-4 text-left">
                <li className="flex items-center gap-2">
                  <X size={12} className="text-red-400 shrink-0" />
                  <span>Costly thermal rolls and PC printer maintenance traps.</span>
                </li>
                <li className="flex items-center gap-2">
                  <X size={12} className="text-red-400 shrink-0" />
                  <span>Customers refuse to spell phone numbers in public queues.</span>
                </li>
                <li className="flex items-center gap-2">
                  <X size={12} className="text-red-400 shrink-0" />
                  <span>Zero mechanism to contact buyers or drive repeat sales.</span>
                </li>
                <li className="flex items-center gap-2">
                  <X size={12} className="text-red-400 shrink-0" />
                  <span>Constant monthly subscription traps for rigid bulk tools.</span>
                </li>
              </ul>
            </div>
            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest pt-6 block border-t border-slate-100 mt-6 text-left">
              Inefficient Checkout System
            </span>
          </div>

          {/* True Attendly */}
          <div className="bg-[#5C4033] text-[#FAF6F0] rounded-2xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden hover:scale-[1.01] transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#C4A896]/15 rounded-bl-full pointer-events-none" />

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-300 rounded-xl flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">The True Attendly Advantage</h3>
                  <p className="text-[9px] text-emerald-300 font-semibold uppercase tracking-widest mt-0.5">
                    100% Frictionless Capture
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#FAF6F0]/80 leading-relaxed">
                One quick billing screen scan logs the lead, delivers an interactive custom invoice, auto-saves the merchant profile details, and legally whitelists the connection with absolute zero monthly subscription traps.
              </p>

              <ul className="space-y-3 text-xs text-[#FAF6F0]/90 border-t border-[#FAF6F0]/15 pt-4 text-left">
                <li className="flex items-center gap-2">
                  <Check size={12} className="text-emerald-400 shrink-0" />
                  <span>Zero paper hardware. Turn any smartphone or tablet into a billing term.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={12} className="text-emerald-400 shrink-0" />
                  <span>Opt-in whitelisting automatically secures the customer profile details.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={12} className="text-emerald-400 shrink-0" />
                  <span>Tag pipeline saves buyer records under DIGITAL_BILL segment.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={12} className="text-emerald-400 shrink-0" />
                  <span>No subscription locks. Purchase credits on a flexible pre-paid basis.</span>
                </li>
              </ul>
            </div>
            <span className="text-[8.5px] font-bold text-[#C4A896] uppercase tracking-widest pt-6 block border-t border-[#FAF6F0]/15 mt-6 text-left">
              Next-gen Mobile Billing Onboarding
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
