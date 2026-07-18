import Link from 'next/link';
import { Globe, Zap, TrendingUp } from 'lucide-react';

export function DeadStockLandingSection() {
  return (
    <section className="w-full py-24 px-6 bg-white border-t border-b border-[#E5DCD3] font-outfit">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#E5DCD3] bg-[#FAF6F0] text-[10px] font-bold tracking-[0.25em] uppercase text-[#C4A896] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            0% Meta Dependency · 100% Margin
          </span>
          <h2 className="serif-headline text-3xl sm:text-4xl lg:text-5xl text-[#5C4033] mt-4 mb-6">
            Turn Dead Stock Into Live Cash
          </h2>
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-xl mx-auto">
            The Hyper-Local Dead Stock Marketplace. No ad spend. No Meta API approval. Zero middlemen.
            Your unsold inventory becomes organic inbound leads — today.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Column 1: Premium Visual Mockup */}
          <div className="relative flex justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/80 via-transparent to-slate-50/40 rounded-3xl blur-2xl" />
            <div className="relative w-full max-w-sm">
              <div className="absolute -top-4 -right-4 z-20 px-4 py-2 bg-rose-500 text-white text-xs font-black rounded-xl shadow-xl rotate-3 transform transition-transform hover:rotate-6">
                70% OFF - FACTORY CLEARANCE
              </div>

              <div className="bg-white rounded-2xl border border-[#E5DCD3] shadow-[0_20px_50px_rgba(92,64,51,0.1)] overflow-hidden group">
                <div className="relative h-56 bg-slate-100 overflow-hidden">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 opacity-40">
                    <div className="w-full h-2 bg-slate-300 rounded-full" />
                    <div className="w-4/5 h-2 bg-slate-300 rounded-full" />
                    <div className="w-3/5 h-2 bg-slate-300 rounded-full" />
                  </div>
                  <div className="absolute top-4 left-4 z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E1B18] text-white text-[9px] font-black tracking-[0.2em] uppercase shadow-lg">
                      ⚠ DEAD STOCK
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <span className="text-[9px] tracking-[0.2em] uppercase text-slate-400 font-semibold">Men's Fashion · Downtown</span>
                    <h3 className="text-lg font-bold text-[#3E3B36] mt-1 leading-snug group-hover:text-[#5C4033] transition-colors">
                      Premium Leather Jacket - XL
                    </h3>
                  </div>
                  
                  <div className="flex items-end gap-3">
                    <span className="text-3xl font-black text-[#5C4033]">₹1,299</span>
                    <span className="text-sm text-slate-400 line-through mb-1">₹4,999</span>
                  </div>

                  <div className="h-px bg-[#E5DCD3] my-4" />
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-[#5C4033] flex items-center justify-center shrink-0">
                      <span className="text-[#FAF6F0] text-[10px] font-black">BS</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#5C4033]">Boutique Studio</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Downtown Ave
                      </p>
                    </div>
                  </div>

                  <div className="relative cursor-pointer">
                    <div className="absolute inset-0 rounded-xl bg-[#25D366]/20 animate-ping" />
                    <div className="relative flex items-center justify-center gap-2.5 w-full py-4 rounded-xl bg-[#25D366] text-white font-bold text-sm tracking-wide shadow-md hover:bg-[#20b958] transition-colors">
                      Contact Shop on WhatsApp
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Typography & Value Props */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] tracking-[0.25em] text-[#C4A896] uppercase font-bold">The Second Engine</span>
                <span className="w-8 h-px bg-[#E5DCD3]" />
                <span className="text-[10px] tracking-[0.25em] text-[#C4A896] uppercase font-bold">Always On</span>
              </div>
              <h3 className="serif-headline text-2xl sm:text-3xl lg:text-4xl text-[#5C4033] leading-tight">
                Your Dead Stock Is Not a Loss.<br/>
                <span className="relative inline-block mt-2">
                  It's a Lead Magnet.
                  <span className="absolute -bottom-1 left-0 right-0 h-1 bg-amber-400 rounded-full" />
                </span>
              </h3>
              <p className="text-sm text-[#7A6A5E] mt-5 leading-relaxed">
                Every unsold unit on your shelf blocks cash flow and ties up working capital. The True Attendly Dead Stock Marketplace converts that dead inventory into direct, organic WhatsApp buyer contacts — with zero ad spend and zero dependency on Meta's approval process.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: <Globe size={20} className="text-[#C4A896]" />, title: '0% Meta API Dependency', desc: 'Completely independent. No WhatsApp Business API approvals. No platform restrictions.' },
                { icon: <Zap size={20} className="text-[#C4A896]" />, title: 'Organic Local Traffic Trapping', desc: 'Buyers in your city find your clearance items organically — no sponsored posts, no ROI gambling.' },
                { icon: <TrendingUp size={20} className="text-[#C4A896]" />, title: 'Immediate Capital Liquidation', desc: 'List a product in under 2 minutes. It goes live instantly. Free up cash flow today.' }
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-4 p-4 rounded-xl border border-[#E5DCD3] bg-[#FAF6F0] hover:bg-white transition-all hover:shadow-md">
                  <div className="w-10 h-10 rounded-lg bg-white border border-[#E5DCD3] flex items-center justify-center shrink-0 shadow-sm">
                    {icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#5C4033]">{title}</p>
                    <p className="text-xs text-[#7A6A5E] mt-1.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Link 
                href="/broadcast/dead-stock" 
                className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-[#5C4033] text-[#FAF6F0] font-bold text-sm tracking-wider uppercase hover:bg-[#8C6853] transition-all hover:-translate-y-1 shadow-[0_10px_20px_rgba(92,64,51,0.2)] rounded-lg"
              >
                Browse Public Directory →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
