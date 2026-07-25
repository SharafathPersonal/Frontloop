'use client';

import React from 'react';
import {
  Radio, CheckCircle, ImageIcon, Upload, Loader2,
  Layers, Users, Search, Target, Share2
} from 'lucide-react';
import { AudienceMember } from './types';

interface TrinityMatrixSectionProps {
  offerImages: { name: string; description: string }[];
  offerImageIndex: number;
  cycleOfferImage: () => void;
  isOfferUploading: boolean;
  originalPrice: number;
  setOriginalPrice: (val: number) => void;
  discountPrice: number;
  setDiscountPrice: (val: number) => void;
  computedDiscount: number;
  offerActive: boolean;
  setOfferActive: (val: boolean) => void;
  webPushBroadcast: boolean;
  setWebPushBroadcast: (val: boolean) => void;

  scannerActive: boolean;
  setScannerActive: (val: boolean) => void;
  justScanned: boolean;
  scanHistoryLogs: string[];
  total: number;

  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedTagFilter: string;
  setSelectedTagFilter: (val: string) => void;
  filteredAudience: AudienceMember[];
  triggerSecurityModal: () => void;
}

export function TrinityMatrixSection({
  offerImages,
  offerImageIndex,
  cycleOfferImage,
  isOfferUploading,
  originalPrice,
  setOriginalPrice,
  discountPrice,
  setDiscountPrice,
  computedDiscount,
  offerActive,
  setOfferActive,
  webPushBroadcast,
  setWebPushBroadcast,
  scannerActive,
  setScannerActive,
  justScanned,
  scanHistoryLogs,
  total,
  searchQuery,
  setSearchQuery,
  selectedTagFilter,
  setSelectedTagFilter,
  filteredAudience,
  triggerSecurityModal,
}: TrinityMatrixSectionProps) {
  return (
    <section
      id="trinity-matrix"
      className="w-full py-24 px-6 bg-[#FAF6F0] border-y border-[#E5DCD3] scroll-reveal-section font-outfit"
    >
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16 gsap-reveal">
          <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
            The Retail Growth Trinity
          </span>
          <h2 className="serif-headline text-3xl sm:text-4xl text-[#5C4033] mt-4 mb-6 leading-tight">
            Three Interlocking Pillars. One Zero-Friction Flow.
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
            Engage shoppers in real time directly from counter checkouts without forcing them to share credentials or download native mobile apps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* COLUMN 1: Live In-Store Flash Offers */}
          <article className="gsap-reveal bg-white border border-[#E5DCD3] rounded-2xl p-8 flex flex-col justify-between hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="space-y-6">
              {/* Feature Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FAF6F0] text-[#5C4033] rounded-xl flex items-center justify-center border border-[#E5DCD3] shadow-sm">
                  <Radio size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-[#5C4033] text-sm tracking-wide">Live In-Store Flash Offers</h3>
                  <p className="text-[9px] text-[#C4A896] font-bold uppercase tracking-widest mt-0.5">
                    Instant Impulse Sales
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#7A6A5E] leading-relaxed">
                Broadcast time-limited discounts and specials directly to browser feeds. Convert foot traffic by showing offers instantly on scan.
              </p>

              {/* Sub-capabilities list */}
              <ul className="space-y-3 text-xs text-[#5C4033]/85 border-t border-[#E5DCD3]/50 pt-4">
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                  <span>Master Control Switch — Instantly push or pause live discounts on checkout boards with zero lag.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                  <span>Supabase Media Uploads — Instantly sync high-quality product images to your customers&apos; digital viewing lists.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                  <span>Dynamic Web Push Toggle — Trigger real-time browser notifications directly to customer devices on campaign dispatches (+2 Credits).</span>
                </li>
              </ul>
            </div>

            {/* Dynamic Interactive Merchant Offer Console widget */}
            <div className="pt-6 mt-6 border-t border-[#E5DCD3] space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Merchant Control Panel</span>
                <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">
                  Live State
                </span>
              </div>

              <div className="bg-[#FAF6F0] p-4 rounded-xl border border-[#E5DCD3] space-y-3">
                {/* Photo Uploader simulator */}
                <div
                  onClick={cycleOfferImage}
                  className="border border-dashed border-[#E5DCD3] hover:border-[#5C4033] bg-white rounded-lg p-2 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#E5DCD3] rounded flex items-center justify-center text-xs text-[#5C4033]">
                      <ImageIcon size={12} />
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-[#5C4033] block truncate max-w-[120px]">
                        {offerImages[offerImageIndex].name}
                      </span>
                      <span className="text-[8px] text-slate-400 block truncate max-w-[120px]">
                        {offerImages[offerImageIndex].description}
                      </span>
                    </div>
                  </div>
                  {isOfferUploading ? (
                    <Loader2 size={12} className="animate-spin text-slate-400" />
                  ) : (
                    <span className="text-[8px] font-bold uppercase text-[#C4A896] flex items-center gap-0.5">
                      <Upload size={10} /> Cycle Image
                    </span>
                  )}
                </div>

                {/* Calculator Row */}
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div>
                    <label className="text-[8px] text-slate-400 font-bold block uppercase mb-0.5">Original Price</label>
                    <input
                      type="number"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-white border border-[#E5DCD3] rounded px-1.5 py-1 text-[10px] focus:outline-none focus:border-[#5C4033]"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] text-slate-400 font-bold block uppercase mb-0.5">Discount Price</label>
                    <input
                      type="number"
                      value={discountPrice}
                      onChange={(e) =>
                        setDiscountPrice(Math.min(originalPrice, Math.max(0, parseInt(e.target.value) || 0)))
                      }
                      className="w-full bg-white border border-[#E5DCD3] rounded px-1.5 py-1 text-[10px] focus:outline-none focus:border-[#5C4033]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#E5DCD3]/50 pt-2 text-[9px]">
                  <span className="text-slate-500 font-bold">Computed Savings:</span>
                  <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {computedDiscount}% OFF
                  </span>
                </div>

                {/* Visibility & Web Push Toggles */}
                <div className="space-y-2 pt-2 border-t border-[#E5DCD3]/50 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5C4033] font-semibold">Visibility State:</span>
                    <button
                      onClick={() => setOfferActive(!offerActive)}
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase transition-colors ${
                        offerActive ? 'bg-[#5C4033] text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {offerActive ? 'Active Online' : 'Hidden'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#5C4033] font-semibold">Broadcast via Web Push:</span>
                    <button
                      onClick={() => setWebPushBroadcast(!webPushBroadcast)}
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase transition-colors ${
                        webPushBroadcast ? 'bg-[#C4A896] text-white animate-pulse' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {webPushBroadcast ? 'ENABLED (2 Credits)' : 'DISABLED (0 Credits)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* COLUMN 2: Frictionless Digital Billing */}
          <article className="gsap-reveal bg-white border border-[#E5DCD3] rounded-2xl p-8 flex flex-col justify-between hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="space-y-6">
              {/* Feature Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FAF6F0] text-[#5C4033] rounded-xl flex items-center justify-center border border-[#E5DCD3] shadow-sm">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-[#5C4033] text-sm tracking-wide">Frictionless Digital Billing</h3>
                  <p className="text-[9px] text-[#C4A896] font-bold uppercase tracking-widest mt-0.5">
                    High-Fidelity Scan Streams
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#7A6A5E] leading-relaxed">
                High-fidelity barcode scanning checkout framework. Leverage connected device cameras to log items and calculate taxes.
              </p>

              {/* Sub-capabilities list */}
              <ul className="space-y-3 text-xs text-[#5C4033]/85 border-t border-[#E5DCD3]/50 pt-4">
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                  <span>Live Barcode Capture — Instantly process physical UPC/EAN labels using any camera device.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                  <span>Auto GST Computation — Instant calculation of itemized subtotals, custom rates, and totals.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                  <span>No Dummy Simulations — Active local timer loops demonstrate real barcode detection sync with the cashier inventory panel.</span>
                </li>
              </ul>
            </div>

            {/* Viewfinder Checkout Scanner widget */}
            <div className="pt-6 mt-6 border-t border-[#E5DCD3] space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Camera Stream Viewfinder</span>
                <button
                  onClick={() => setScannerActive(!scannerActive)}
                  className={`text-[8px] px-2 py-0.5 rounded font-bold uppercase ${
                    scannerActive ? 'bg-emerald-600 text-white animate-pulse' : 'bg-red-600 text-white'
                  }`}
                >
                  {scannerActive ? 'Scan Active' : 'Scan Paused'}
                </button>
              </div>

              <div className="relative h-28 bg-[#1e1410] border border-[#E5DCD3] rounded-xl overflow-hidden flex flex-col justify-between p-2">
                <div
                  className={`absolute inset-0 bg-emerald-500/10 transition-opacity duration-300 ${
                    justScanned ? 'opacity-100' : 'opacity-0'
                  }`}
                />

                {/* Corner viewfinder brackets */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />

                {/* Sweeping Laser Line */}
                {scannerActive && (
                  <div className="absolute left-0 right-0 h-[1.5px] bg-[#34d399] shadow-[0_0_8px_rgba(52,211,153,1)] laser-line" />
                )}

                {/* Top line with live status */}
                <div className="flex justify-between items-center text-[7px] text-emerald-400 font-mono z-10">
                  <span>CAPTURE: 1080P // AUTO_FOCUS</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                    SYNCED
                  </span>
                </div>

                {/* Center Scanning Barcode Overlay */}
                <div className="flex flex-col items-center justify-center my-1 z-10">
                  <div className="w-24 h-6 opacity-60 bg-white/10 flex items-center justify-center border border-white/20 rounded">
                    <span className="text-[8px] font-mono text-white tracking-[0.2em] font-bold">||||| | ||| ||</span>
                  </div>
                </div>

                {/* Real-time scan log list */}
                <div className="text-[7.5px] font-mono text-slate-300 bg-black/40 p-1.5 rounded text-left overflow-y-auto max-h-[35px] z-10 space-y-0.5">
                  {scanHistoryLogs.map((log, i) => (
                    <div key={i} className="truncate">
                      {log}
                    </div>
                  ))}
                </div>
              </div>

              {/* Scanner totals display */}
              <div className="flex items-center justify-between text-xs font-bold text-[#5C4033]">
                <span>Total Scanned Invoice:</span>
                <span className="bg-[#FAF6F0] px-2 py-0.5 rounded border border-[#E5DCD3]">₹{total}</span>
              </div>
            </div>
          </article>

          {/* COLUMN 3: Audience Registry */}
          <article className="gsap-reveal bg-white border border-[#E5DCD3] rounded-2xl p-8 flex flex-col justify-between hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="space-y-6">
              {/* Feature Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FAF6F0] text-[#5C4033] rounded-xl flex items-center justify-center border border-[#E5DCD3] shadow-sm">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-[#5C4033] text-sm tracking-wide">Audience Registry</h3>
                  <p className="text-[9px] text-[#C4A896] font-bold uppercase tracking-widest mt-0.5">
                    Engagement Analytics
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#7A6A5E] leading-relaxed">
                Manage walk-in customers and segment tags like DIGITAL_BILL automatically. Track visits, lifecycle value, and launch broadcasts.
              </p>

              {/* Sub-capabilities list */}
              <ul className="space-y-3 text-xs text-[#5C4033]/85 border-t border-[#E5DCD3]/50 pt-4">
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                  <span>100% Opt-In Legality — Customers auto-whitelist their browser profiles when requesting dynamic receipts.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                  <span>PostgreSQL Tag Segments — Filter registry loops using custom tag definitions like DIGITAL_BILL.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                  <span>Real-time Delivery Counters — Track unique metrics including Total Sent, Opened, and Cumulative Store Subscribers.</span>
                </li>
              </ul>
            </div>

            {/* Dynamic Responsive Mobile Card Registry widget */}
            <div className="pt-6 mt-6 border-t border-[#E5DCD3] space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Customer Card Registry</span>
                <span className="text-[#C4A896]">{filteredAudience.length} Profiles</span>
              </div>

              {/* Interactive Search & Filter inside Card */}
              <div className="space-y-2 bg-[#FAF6F0] p-3 rounded-xl border border-[#E5DCD3]">
                <div className="relative">
                  <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search registry..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-5 pr-2 py-1 bg-white border border-[#E5DCD3] rounded text-[10px] focus:outline-none focus:border-[#5C4033]"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto pr-1">
                  {['ALL', 'DIGITAL_BILL', 'VIP', 'FLASH_OPT_IN'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTagFilter(t)}
                      className={`text-[7px] font-bold px-2 py-0.5 rounded border transition-colors shrink-0 uppercase tracking-wider ${
                        selectedTagFilter === t
                          ? 'bg-[#5C4033] border-[#5C4033] text-white'
                          : 'bg-white border-[#E5DCD3] text-slate-600'
                      }`}
                    >
                      {t === 'ALL' ? 'ALL TAGS' : t.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Customer mobile card grid representation */}
                <div className="space-y-1.5 max-h-[85px] overflow-y-auto pr-1">
                  {filteredAudience.map((cust, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-[#E5DCD3] p-1.5 rounded-lg flex items-center justify-between shadow-sm"
                    >
                      <div className="text-left min-w-0">
                        <span className="text-[9px] font-bold text-[#2D1E17] block truncate">{cust.name}</span>
                        <span className="text-[8px] text-slate-400 block font-mono">{cust.phone}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex gap-1">
                          {cust.tags.map((t) => (
                            <span
                              key={t}
                              className="bg-[#FAF6F0] text-[#5C4033] border border-[#E5DCD3] text-[6px] px-1 rounded uppercase font-bold tracking-wide"
                            >
                              {t.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                        <span className="text-[7.5px] text-slate-500 block font-bold">
                          Visits: {cust.visits} · Spend: ₹{cust.spend}
                        </span>
                      </div>
                    </div>
                  ))}
                  {filteredAudience.length === 0 && (
                    <div className="text-center py-4 text-[9px] text-slate-400 italic">No matches found.</div>
                  )}
                </div>

                {/* Broadcast Dispatch Trigger Button */}
                <button
                  onClick={triggerSecurityModal}
                  className="w-full bg-[#5C4033] hover:bg-[#C4A896] text-white py-1.5 px-3 rounded text-[9px] font-bold tracking-widest uppercase flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Target size={10} /> Launch Campaign Broadcast
                </button>
              </div>
            </div>
          </article>

          {/* COLUMN 4: Organic Viral Share Engine */}
          <article className="gsap-reveal bg-white border border-[#E5DCD3] rounded-2xl p-8 flex flex-col justify-between hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="space-y-6">
              {/* Feature Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FAF6F0] text-[#5C4033] rounded-xl flex items-center justify-center border border-[#E5DCD3] shadow-sm">
                  <Share2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-[#5C4033] text-sm tracking-wide">Organic Share Engine</h3>
                  <p className="text-[9px] text-[#C4A896] font-bold uppercase tracking-widest mt-0.5">
                    Organic Store Growth
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#7A6A5E] leading-relaxed">
                Organic Viral Share Engine — Track instant discount dispatches, viewer click interactions, and monitor share counts as users organically scale your active store audience app-less.
              </p>

              {/* Sub-capabilities list */}
              <ul className="space-y-3 text-xs text-[#5C4033]/85 border-t border-[#E5DCD3]/50 pt-4">
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                  <span>Viral Mechanics — Enable customers to easily recommend live shop offers directly to family and friends.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                  <span>Real-time Metrics — Track share counts and conversion loops from public customer catalog pages.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                  <span>No App Barriers — Zero sign-up friction or native downloads for recipient traffic to see discounts.</span>
                </li>
              </ul>
            </div>

            {/* Dynamic Interactive Share Engine Simulator Widget */}
            <div className="pt-6 mt-6 border-t border-[#E5DCD3] space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Viral Engine Monitor</span>
                <span className="text-[#C4A896] font-bold">Live State</span>
              </div>

              <div className="bg-[#FAF6F0] p-4 rounded-xl border border-[#E5DCD3] space-y-3">
                {/* Share tracker simulator */}
                <div className="flex items-center justify-between text-xs border-b border-[#E5DCD3]/50 pb-2">
                  <span className="text-slate-500">Demo Share Count:</span>
                  <span className="font-bold text-[#5C4033]">24 Shares</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-[#E5DCD3]/50 pb-2">
                  <span className="text-slate-500">Recipient Clicks:</span>
                  <span className="font-bold text-[#5C4033]">182 Clicks</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Audience Growth:</span>
                  <span className="font-bold text-emerald-600">+15 Subscribers</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
