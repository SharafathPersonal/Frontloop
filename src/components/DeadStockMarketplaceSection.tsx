'use client';

import Link from 'next/link';
import { MessageCircle, AlertTriangle, CheckCircle2, Zap, Globe, TrendingUp } from 'lucide-react';

/**
 * DeadStockMarketplaceSection
 * Dual-column landing page feature section for the Dead Stock / Factory Clearance Marketplace Engine.
 * Inject this component into src/app/page.tsx where appropriate.
 */
export default function DeadStockMarketplaceSection() {
  return (
    <section className="bg-white border-y border-[#E8E3DA] py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Section Header */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#E8E3DA] bg-[#F5F1EA] text-[10px] font-bold tracking-[0.25em] uppercase text-[#8B8378] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Engine B — 0% Meta Dependency
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#3E3B36] tracking-tight leading-tight max-w-2xl mx-auto">
            Turn Dead Capital Into<br />Instant WhatsApp Leads
          </h2>
          <p className="text-[#8B8378] text-sm mt-4 max-w-xl mx-auto leading-relaxed">
            The Hyper-Local Dead Stock Marketplace. No ad spend. No Meta API approval. Zero middlemen. 
            Your unsold inventory becomes organic inbound leads, today.
          </p>
        </div>

        {/* Dual Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ===== COLUMN 1: CSS-Only Product Card Mockup ===== */}
          <div className="relative flex justify-center">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 via-transparent to-slate-50/40 rounded-3xl blur-2xl" />
            
            <div className="relative w-full max-w-sm">
              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 z-10 px-3 py-1.5 bg-rose-500 text-white text-xs font-black rounded-xl shadow-lg rotate-3">
                73% OFF
              </div>

              {/* Card */}
              <div className="bg-white rounded-2xl border border-[#E8E3DA] shadow-xl overflow-hidden">
                
                {/* Image Skeleton with overlay badges */}
                <div className="relative h-56 bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden">
                  {/* Shimmer skeleton */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite] bg-[length:200%_100%]" />
                  
                  {/* Grid lines for skeleton effect */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="space-y-3 w-full px-8">
                      <div className="h-2 bg-slate-200 rounded-full" />
                      <div className="h-2 bg-slate-200 rounded-full w-4/5" />
                      <div className="h-2 bg-slate-200 rounded-full w-3/5" />
                    </div>
                  </div>

                  {/* Dead Stock Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E1B18] text-white text-[9px] font-black tracking-[0.2em] uppercase shadow-lg">
                      <AlertTriangle size={9} className="text-amber-400" />
                      DEAD STOCK
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-white text-[9px] font-black tracking-wide uppercase shadow">
                      CLEARANCE
                    </span>
                  </div>
                  
                  {/* Product type label */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-100 to-transparent flex items-end px-4 pb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Factory Outlet Item</span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-5 space-y-4">
                  <div>
                    <span className="text-[9px] tracking-[0.2em] uppercase text-slate-400 font-semibold">Electronics · Bangalore</span>
                    <h3 className="text-base font-bold text-[#3E3B36] mt-1 leading-snug">
                      Samsung 55&quot; QLED TV — Open Box Dead Stock
                    </h3>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-black text-[#3E3B36]">₹27,499</span>
                    <span className="text-sm text-slate-400 line-through">₹1,02,000</span>
                  </div>

                  {/* Clearance badge row */}
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border border-amber-200 bg-amber-50 text-amber-700 rounded-lg">
                      Factory Clearance
                    </span>
                    <span className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border border-slate-200 bg-slate-50 text-slate-600 rounded-lg">
                      Final Sale
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#E8E3DA]" />

                  {/* Shop info */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#3E3B36] flex items-center justify-center shrink-0">
                      <span className="text-[#F5F1EA] text-[9px] font-black">SR</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#3E3B36]">SR Electronics Hub</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Koramangala, Bangalore
                      </p>
                    </div>
                  </div>

                  {/* WhatsApp CTA — Pulsing */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-xl bg-[#25D366]/20 animate-ping" />
                    <div className="relative flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-[#25D366] text-white font-bold text-sm tracking-wide shadow-md">
                      <MessageCircle size={16} />
                      Contact Shop on WhatsApp
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== COLUMN 2: Copy & Value Prop ===== */}
          <div className="space-y-8">
            {/* Headline block */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] tracking-[0.25em] text-[#8B8378] uppercase font-bold">The Second Engine</span>
                <span className="w-8 h-px bg-[#E8E3DA]" />
                <span className="text-[10px] tracking-[0.25em] text-[#8B8378] uppercase font-bold">Always On</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#3E3B36] leading-tight">
                Your Dead Stock Is Not a<br />
                <span className="relative inline-block">
                  Loss. It&apos;s a Lead Magnet.
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
                </span>
              </h3>
              <p className="text-[#8B8378] text-sm mt-4 leading-relaxed">
                Every unsold unit on your shelf is blocking cash flow and occupying capital. 
                The True Attendly Dead Stock Marketplace converts that dead capital into 
                direct, organic WhatsApp buyer contacts — with zero ad spend and zero dependency on Meta&apos;s approval process.
              </p>
            </div>

            {/* Value Props */}
            <div className="space-y-4">
              {[
                {
                  icon: <Globe size={16} className="text-[#3E3B36]" />,
                  title: '0% Meta API Dependency',
                  desc: 'This engine is completely independent. No WhatsApp Business API. No Meta approvals. No platform restrictions. It works even if your Meta account is suspended.',
                },
                {
                  icon: <Zap size={16} className="text-[#3E3B36]" />,
                  title: 'Zero Ad-Spend Local Reach',
                  desc: 'Hyper-local product discovery. Buyers in your city and district find your clearance items organically when searching the marketplace. No sponsored posts, no ROI gambling.',
                },
                {
                  icon: <TrendingUp size={16} className="text-[#3E3B36]" />,
                  title: 'Instant Dead-Capital Liquidation',
                  desc: 'List a product in under 2 minutes. It goes live on the public marketplace instantly. When the item sells, one toggle marks it as cleared — removed from the marketplace immediately.',
                },
                {
                  icon: <MessageCircle size={16} className="text-[#3E3B36]" />,
                  title: 'Frictionless Local User Trapping',
                  desc: 'Every product card has a pre-filled WhatsApp intent button. Buyers contact you directly on WhatsApp — no forms, no accounts, no friction. Pure direct conversion.',
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-4 p-4 rounded-xl border border-[#E8E3DA] bg-[#F9F7F4] hover:bg-[#F5F1EA] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#E8E3DA] flex items-center justify-center shrink-0 shadow-sm">
                    {icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#3E3B36]">{title}</p>
                    <p className="text-xs text-[#8B8378] mt-1 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Compliance note */}
            <div className="flex items-start gap-3 px-4 py-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800">
                <strong>100% Transparent to Buyers.</strong> Every listing is explicitly badged as 
                &quot;Dead Stock / Factory Clearance&quot; — no deceptive pricing, full merchant identity, 
                physical address, and location map disclosed.
              </p>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/broadcast/dead-stock"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#3E3B36] text-[#F5F1EA] font-bold text-sm tracking-wide hover:bg-[#2a2825] transition-all hover:-translate-y-0.5 shadow-md hover:shadow-lg"
              >
                Browse Marketplace
              </Link>
              <Link
                href="/dashboard/dead-stock/new"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-[#3E3B36] text-[#3E3B36] font-bold text-sm tracking-wide hover:bg-[#F5F1EA] transition-all hover:-translate-y-0.5"
              >
                List Your Dead Stock
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
