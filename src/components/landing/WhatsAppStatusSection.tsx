'use client';

import React from 'react';

export function WhatsAppStatusSection() {
  return (
    <section className="w-full py-24 px-6 bg-[#FAF6F0] border-t border-b border-[#E5DCD3] font-outfit">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left copy column */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
                Organic Retention Channel
              </span>
              <span className="text-[10px] font-bold text-[#25D366] bg-[#25D366]/10 border border-[#25D366]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Zero Ad Spend
              </span>
            </div>

            <h2 className="serif-headline text-3xl sm:text-4xl text-[#5C4033] font-normal leading-[1.15]">
              WhatsApp Status Loop
            </h2>

            <p className="text-sm text-[#7A6A5E] leading-relaxed max-w-xl">
              Turn One-Time Bill Recipients into Continuous Status Viewers. No ads. Just organic, high-converting daily catalog updates directly on their phones once they save your number to read their receipt.
            </p>

            {/* Loop Steps details */}
            <div className="space-y-4 pt-4 border-t border-[#E5DCD3]/60 max-w-lg">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#5C4033] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-[#5C4033] text-sm">Transactional Digital Bill Dispatch</h4>
                  <p className="text-xs text-[#7A6A5E] mt-0.5">Send receipts automatically to customer WhatsApp numbers at checkout.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#5C4033] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-[#5C4033] text-sm">Automatic Get My Bill Prompt</h4>
                  <p className="text-xs text-[#7A6A5E] mt-0.5">
                    Prompt receipt readers to trigger the Get My Bill action to view full bills and today&apos;s deals.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-[#5C4033] text-sm">Free Organic Marketing Updates</h4>
                  <p className="text-xs text-[#7A6A5E] mt-0.5">
                    Daily promotions and catalog items appear automatically on their phone Status list.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side Mobile Emulator Column */}
          <div className="lg:col-span-5 flex justify-center items-center">
            {/* Mobile Emulator Wrapper */}
            <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-[2rem] border-[8px] border-[#2D1E17] bg-black shadow-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]">
              {/* Speaker and Camera notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#2D1E17] rounded-b-md z-20" />

              {/* Content viewport */}
              <div className="relative w-full h-full bg-[#111] text-white flex flex-col justify-between p-3 select-none">
                {/* Top Bar */}
                <div className="flex items-center justify-between pt-2 pb-2.5 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="relative w-6 h-6 rounded-full border border-[#25D366] p-0.5 shrink-0">
                      <div className="w-full h-full rounded-full bg-[#5C4033] flex items-center justify-center text-[9px] font-bold text-[#FAF6F0]">
                        S
                      </div>
                      <div className="absolute -inset-0.5 rounded-full border border-dashed border-[#25D366] animate-pulse" />
                    </div>
                    <div className="text-[9px] text-left">
                      <p className="font-bold text-white leading-none">Your Shop</p>
                      <p className="text-[6.5px] text-[#C4A896] leading-none mt-0.5">Today, 10:15 AM</p>
                    </div>
                  </div>
                  <div className="text-[8px] font-mono text-[#FAF6F0]/60">1/3</div>
                </div>

                {/* Image slot */}
                <div className="relative flex-1 my-2.5 rounded-lg overflow-hidden bg-zinc-900 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/whatsapp-status-emulator.png"
                    alt="WhatsApp Status Marketing Loop Emulator"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />

                  {/* Interactive UI Mock Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35 p-3 flex flex-col justify-between pointer-events-none">
                    <span className="self-end bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-mono text-emerald-400 border border-emerald-500/20">
                      👁 184 Views
                    </span>

                    <div className="space-y-1.5">
                      <div className="bg-white/10 backdrop-blur-sm border border-white/15 p-2 rounded text-left">
                        <span className="bg-[#25D366] text-black text-[6.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Catalog Offer
                        </span>
                        <h4 className="text-[10px] font-bold text-white mt-1 leading-none">EcoGoods Special</h4>
                        <p className="text-[8.5px] text-[#C4A896] mt-0.5 font-mono">₹1,250 (Save 20%)</p>
                      </div>

                      <div className="bg-[#25D366]/20 border border-[#25D366]/35 rounded py-1.5 text-center">
                        <p className="text-[7.5px] font-bold text-[#25D366]">Get My Bill to view today&apos;s deals</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
