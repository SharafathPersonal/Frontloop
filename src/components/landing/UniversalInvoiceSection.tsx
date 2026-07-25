'use client';

import React from 'react';
import { QrCode } from 'lucide-react';

export function UniversalInvoiceSection() {
  return (
    <section className="w-full py-24 px-6 bg-white border-t border-b border-[#E5DCD3] font-outfit">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left side Image Column */}
          <div className="lg:col-span-5 flex justify-center items-center order-2 lg:order-1">
            <div className="relative w-full max-w-lg aspect-[4/3] rounded-2xl border border-[#E5DCD3] shadow-2xl overflow-hidden bg-slate-50 transition-all duration-300 hover:scale-[1.01]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/images/universal-invoice-qr-links.png"
                alt="Universal Digital Invoice Print formats and Dynamic QR Cross-Sell Showcase"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {/* Fallback visual when image is loading/missing */}
              <div className="absolute inset-0 bg-[#5C4033]/5 flex flex-col items-center justify-center p-8 text-center pointer-events-none">
                <div className="w-16 h-16 rounded-2xl bg-[#5C4033] text-white flex items-center justify-center shadow-lg mb-4">
                  <QrCode size={32} />
                </div>
                <h4 className="font-bold text-[#5C4033] text-sm uppercase tracking-wider">Universal QR Engine</h4>
                <p className="text-xs text-[#7A6A5E] mt-2 max-w-xs">
                  Printed Thermal Strip &middot; Corporate A4 Sheets &middot; Mobile WhatsApp PDF Receipts
                </p>
              </div>
            </div>
          </div>

          {/* Right copy column */}
          <div className="lg:col-span-7 space-y-6 text-left order-1 lg:order-2">
            <div className="flex items-center gap-2">
              <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
                Universal QR Engine
              </span>
              <span className="text-[10px] font-bold text-white bg-[#5C4033] border border-[#C4A896]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Cross-Sell Framework
              </span>
            </div>

            <h2 className="serif-headline text-3xl sm:text-4xl text-[#5C4033] font-normal leading-[1.15]">
              Continuous Digital Retention
            </h2>

            <p className="text-sm text-[#7A6A5E] leading-relaxed max-w-xl">
              Universal QR Engine. Continuous Digital Retention. Turn every single receipt—whether it is a printed paper bill, a standard A4 invoice, or a digital WhatsApp PDF—into a powerful repeat-traffic driver. Seamlessly embed dynamic live-offer QR codes and active web links across all invoice print formats automatically, unlocking massive storefront traffic and automated customer return lists without intrusive ads.
            </p>

            {/* Dynamic Pillars */}
            <div className="space-y-4 pt-4 border-t border-[#E5DCD3]/60 max-w-lg">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#5C4033] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                  A
                </div>
                <div>
                  <h4 className="font-bold text-[#5C4033] text-sm">Unified Print Ecosystem</h4>
                  <p className="text-xs text-[#7A6A5E] mt-0.5">
                    Generate high-performance window-trigger print layouts optimized dynamically for standard corporate A4 sheets and native 80mm POS Thermal roll printers.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#5C4033] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                  B
                </div>
                <div>
                  <h4 className="font-bold text-[#5C4033] text-sm">Offline-to-Online Loop</h4>
                  <p className="text-xs text-[#7A6A5E] mt-0.5">
                    Embed cross-sell QR codes directly on invoices, allowing customers to scan physical thermal papers to instantly launch mobile-friendly digital storefront deals.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#C4A896] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                  C
                </div>
                <div>
                  <h4 className="font-bold text-[#5C4033] text-sm">In-Store Location Transparency</h4>
                  <p className="text-xs text-[#7A6A5E] mt-0.5">
                    Every storefront discount is bound to a physical location, helping buyers navigate seamlessly back to active shelves via on-demand details modals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
