import React from 'react';
import Link from 'next/link';
import { MessageCircle, Zap, ShieldCheck, Tag } from 'lucide-react';

export function TopAnnouncementBar() {
  return (
    <div className="bg-rose-600 text-white w-full py-2.5 px-4 z-[60] fixed top-0 left-0 right-0 shadow-md font-outfit">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-6 text-center sm:text-left">
        <p className="text-xs sm:text-sm font-semibold flex items-center gap-2">
          <span className="text-lg">🛍️</span>
          <span>
            <span className="font-black text-rose-200">Local Clearance Mela!</span> Get branded products from your local shops at 50% to 80% massive discounts! 
            <span className="hidden lg:inline"> (100% Transparency: All items are certified Dead Stock / Factory Clearance Sales).</span>
          </span>
        </p>
        <Link 
          href="/broadcast/dead-stock"
          className="shrink-0 bg-white text-rose-600 hover:bg-rose-50 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase transition-colors shadow-sm"
        >
          Explore Clearance Deals
        </Link>
      </div>
    </div>
  );
}

export function DeadStockHero() {
  return (
    <section className="w-full relative pt-36 pb-20 lg:pt-48 lg:pb-32 bg-gradient-to-br from-[#2D1E17] via-[#3E2A20] to-[#1E1B18] text-[#FAF6F0] font-outfit overflow-hidden mt-10 sm:mt-12">
      {/* Background visual elements */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#C4A896 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-rose-500 rounded-full blur-[120px] opacity-20 animate-pulse" />
      <div className="absolute top-40 -left-20 w-72 h-72 bg-amber-500 rounded-full blur-[100px] opacity-10" />

      <div className="relative max-w-7xl mx-auto px-6 w-full z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Right Column: Psychological Copywriting (Order 2 on mobile, 1 on desktop for left-aligned text, wait prompt says Left Column is Visual, Right is Copy) */}
          
          {/* Left Column: Visual Mockup */}
          <div className="lg:col-span-5 relative flex justify-center order-2 lg:order-1 perspective-1000">
            <div className="relative w-full max-w-md transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-y-0 hover:rotate-x-0 transition-transform duration-700">
              
              {/* Flashing MASSIVE DISCOUNT Badge */}
              <div className="absolute -top-5 -right-5 z-20 bg-rose-600 text-white px-4 py-2 rounded-2xl shadow-2xl rotate-6 animate-bounce">
                <span className="block text-[10px] uppercase tracking-widest font-bold opacity-80">Factory Clearance</span>
                <span className="block text-xl font-black">75% OFF</span>
              </div>

              {/* CSS Card */}
              <div className="bg-white rounded-3xl p-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/20 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative h-64 bg-slate-100 rounded-2xl overflow-hidden mb-5 border border-slate-200 flex items-center justify-center">
                   {/* Abstract Placeholder for Product */}
                   <div className="w-3/4 h-3/4 bg-slate-200 rounded-xl flex items-center justify-center">
                      <Tag size={64} className="text-slate-300" />
                   </div>
                   <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white text-xs font-bold tracking-wider flex items-center gap-1.5">
                     <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Live Deal
                   </div>
                </div>

                <div className="px-2 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#2D1E17] leading-tight">Premium Branded Chronograph Watch</h3>
                    <p className="text-sm text-slate-500 mt-1">Verified Local Electronics Store</p>
                  </div>
                  
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-black text-[#5C4033]">₹2,499</span>
                    <span className="text-lg text-slate-400 line-through mb-1">₹9,999</span>
                  </div>

                  <div className="pt-2">
                    <div className="relative w-full overflow-hidden rounded-xl bg-[#25D366] p-[2px]">
                       <div className="absolute inset-0 bg-white/20 animate-pulse" />
                       <div className="relative flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-[10px] font-bold shadow-inner">
                         <MessageCircle size={20} />
                         Contact on WhatsApp
                       </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative background blur behind card */}
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-400/20 to-rose-400/20 rounded-3xl blur-2xl -z-10" />
            </div>
          </div>

          {/* Right Column: Copywriting */}
          <div className="lg:col-span-7 space-y-8 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-bold tracking-[0.2em] uppercase text-amber-200 backdrop-blur-sm">
              <Zap size={14} className="text-amber-400" /> Massive Savings Just For You
            </div>
            
            <h1 className="serif-headline text-5xl sm:text-6xl lg:text-7xl font-normal leading-[1.1] tracking-tight text-white drop-shadow-lg">
              Unlock Premium <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-300 to-amber-200 animate-gradient-x">
                Local Dead Stock.
              </span>
            </h1>

            <p className="text-lg text-[#FAF6F0]/80 leading-relaxed max-w-xl font-light">
              These are authentic, brand-new items priced ridiculously low purely for shop inventory clearance. 
              <strong className="text-white font-semibold"> Inspect visually and buy directly from the store.</strong> Zero delivery charges, zero online payment hassles, and 100% transparency.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <Link
                href="/broadcast/dead-stock"
                className="w-full sm:w-auto bg-[#FAF6F0] hover:bg-white text-[#2D1E17] font-black text-sm tracking-widest uppercase px-8 py-5 rounded-xl shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                Visit Dead Stock Marketplace <span className="text-xl leading-none">→</span>
              </Link>
              
              <div className="flex items-center gap-2 text-xs text-[#FAF6F0]/60 font-medium tracking-wide">
                <ShieldCheck size={16} className="text-emerald-400" /> No middlemen. Direct WhatsApp contact.
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
