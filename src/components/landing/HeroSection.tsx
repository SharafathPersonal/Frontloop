'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Trash2, Plus, FileText, Download, Eye, Loader2 } from 'lucide-react';
import { APP_VERSION } from '@/lib/config';
import { CartItem, BrandPresetColor } from './types';

interface HeroSectionProps {
  heroRef: React.RefObject<HTMLDivElement | null>;
  cart: CartItem[];
  newItemName: string;
  setNewItemName: (val: string) => void;
  newItemPrice: string;
  setNewItemPrice: (val: string) => void;
  handleAddItem: (e: React.FormEvent) => void;
  removeItem: (id: number) => void;
  subtotal: number;
  gst: number;
  total: number;
  scannerActive: boolean;
  justScanned: boolean;
  brandColor: string;
  invoiceFooterNote: string;
  handleDownloadBill: () => void;
  isDownloading: boolean;
  setShowBillModal: (show: boolean) => void;
  brandPresetColors: BrandPresetColor[];
  selectPresetColor: (hex: string) => void;
}

export function HeroSection({
  heroRef,
  cart,
  newItemName,
  setNewItemName,
  newItemPrice,
  setNewItemPrice,
  handleAddItem,
  removeItem,
  subtotal,
  gst,
  total,
  scannerActive,
  justScanned,
  brandColor,
  invoiceFooterNote,
  handleDownloadBill,
  isDownloading,
  setShowBillModal,
  brandPresetColors,
  selectPresetColor,
}: HeroSectionProps) {
  return (
    <section
      ref={heroRef}
      className="w-full relative pt-20 pb-24 lg:pt-24 lg:pb-36 bg-[#5C4033] text-[#FAF6F0] font-outfit"
    >
      {/* Fine Radial Grid Mesh Overlay */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#FAF6F0 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ambient Warm Glows */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          background: `
            radial-gradient(circle 800px at 75% 25%, rgba(196, 168, 150, 0.18) 0%, transparent 80%),
            radial-gradient(circle 600px at 20% 75%, rgba(45, 30, 23, 0.4) 0%, transparent 80%)
          `,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left copy column */}
          <div className="lg:col-span-5 space-y-8 text-left z-10">
            {/* Trust badge */}
            <div className="hero-animate flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-[#C4A896] bg-[#2D1E17]/45 border border-[#C4A896]/30 px-3.5 py-1.5 rounded-full">
                <ShieldCheck size={12} className="text-[#C4A896]" />
                0% App Friction · 100% Privacy Compliant
              </span>
            </div>

            {/* Main Headline visual hook */}
            <h1 className="hero-animate serif-headline text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] tracking-tight">
              An App-Less, Number-Less <br />
              <span className="block font-italic text-[#C4A896] mt-1">Retail Growth Engine.</span>
            </h1>

            {/* Zero-friction Marketing Hook */}
            <p className="hero-animate text-base text-[#FAF6F0]/80 leading-relaxed max-w-xl font-light">
              Eliminate paper receipt waste and customer checkout friction entirely. Walk-in shoppers simply scan a dynamic counter QR code to instantly view digital bills, track store loyalty credits, and receive real-time discount broadcasts—without downloading bulky apps or sharing their private phone numbers.
            </p>

            {/* Action CTAs */}
            <div className="hero-animate flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/auth/register"
                className="bg-[#C4A896] hover:bg-[#FAF6F0] hover:text-[#5C4033] text-[#FAF6F0] font-bold text-xs tracking-widest uppercase px-6 py-4 rounded shadow-xl transition-all duration-300"
              >
                Create Free Workspace
              </Link>
              <a
                href="#trinity-matrix"
                className="bg-transparent border border-[#FAF6F0]/30 hover:border-white hover:bg-white/5 text-[#FAF6F0] font-bold text-xs tracking-widest uppercase px-6 py-4 rounded transition-all duration-300 flex items-center gap-1.5"
              >
                See Interactive Features ↓
              </a>
            </div>

            {/* Version & Status */}
            <div className="hero-animate flex items-center gap-4 text-xs text-[#FAF6F0]/60 pt-4 border-t border-[#FAF6F0]/10">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                System Version: {APP_VERSION}
              </span>
              <span>•</span>
              <span>Active Merchants: 1,420+ Stores</span>
            </div>
          </div>

          {/* Right side live interactive emulator playground */}
          <div className="hidden lg:flex lg:col-span-7 hero-animate w-full flex-col md:flex-row gap-6 relative">
            {/* Visual Box 1: POS cash register terminal */}
            <div className="flex-1 bg-white text-[#2D1E17] rounded-2xl shadow-2xl border border-[#E5DCD3] overflow-hidden flex flex-col h-[520px]">
              {/* POS Header */}
              <div className="bg-[#5C4033] text-white px-4 py-3 flex items-center justify-between border-b border-[#E5DCD3]/10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
                  <span className="text-[10px] font-bold tracking-widest uppercase">POS Cashier Terminal</span>
                </div>
                <span className="text-[9px] bg-[#2D1E17] text-[#C4A896] px-2 py-0.5 rounded font-mono">TERM-01</span>
              </div>

              {/* Simulated Viewfinder overlay */}
              <div className="relative h-28 bg-[#2d221c] overflow-hidden flex items-center justify-center shrink-0 border-b border-[#E5DCD3]/60">
                <div
                  className={`absolute inset-0 bg-emerald-500/10 transition-opacity duration-300 ${
                    justScanned ? 'opacity-100' : 'opacity-0'
                  }`}
                />

                {/* Viewfinder borders */}
                <div className="absolute w-36 h-16 border-2 border-dashed border-emerald-400/60 rounded-md flex items-center justify-center">
                  <span className="text-[9px] text-emerald-400 font-mono tracking-widest uppercase animate-pulse">
                    {scannerActive ? 'Scanner Auto-Sync' : 'Scanner Paused'}
                  </span>
                </div>

                {/* Sweeping Laser Line */}
                {scannerActive && (
                  <div className="absolute left-0 right-0 h-[1.5px] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)] laser-line" />
                )}

                <span className="absolute bottom-2 text-[8px] text-[#C4A896] font-mono">
                  Auto-scanning items every 4.5s
                </span>
              </div>

              {/* Items in Cart list */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FCFBF9]">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Cart</h3>
                  <span className="text-xs font-bold text-[#5C4033] bg-[#FAF6F0] px-2 py-0.5 rounded border border-[#E5DCD3]">
                    {cart.length} Items
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-white border border-[#E5DCD3] p-2 rounded-lg shadow-sm"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-semibold text-[#2D1E17] truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-500">
                          Qty: {item.qty} × ₹{item.price}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#2D1E17]">₹{item.price * item.qty}</span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400 italic">Cart is empty. Add a product below.</div>
                  )}
                </div>

                {/* Add manual product inputs */}
                <form onSubmit={handleAddItem} className="pt-2 border-t border-[#E5DCD3]/65 flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Custom Item"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-[#E5DCD3] rounded text-xs focus:outline-none focus:border-[#5C4033]"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-16 px-2.5 py-1.5 bg-white border border-[#E5DCD3] rounded text-xs focus:outline-none focus:border-[#5C4033]"
                  />
                  <button
                    type="submit"
                    className="bg-[#5C4033] hover:bg-[#C4A896] text-[#FAF6F0] p-2 rounded transition-colors shrink-0"
                  >
                    <Plus size={12} />
                  </button>
                </form>
              </div>

              {/* Subtotals & QR code representation */}
              <div className="p-4 bg-[#FAF6F0] border-t border-[#E5DCD3] shrink-0 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pricing breakdown</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Subtotal: <span className="font-semibold text-slate-700">₹{subtotal}</span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    GST (18%): <span className="font-semibold text-slate-700">₹{gst}</span>
                  </p>
                  <p className="text-xs font-bold text-[#5C4033] mt-0.5">Total Bill: ₹{total}</p>
                </div>

                {/* Dynamic checkout QR representation */}
                <div className="relative p-2 bg-white rounded-lg border border-[#E5DCD3] shadow-sm flex flex-col items-center shrink-0">
                  <svg
                    width="60"
                    height="60"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#2D1E17]"
                  >
                    <rect x="3" y="3" width="6" height="6" rx="1" />
                    <rect x="15" y="3" width="6" height="6" rx="1" />
                    <rect x="3" y="15" width="6" height="6" rx="1" />
                    <path d="M16 16h2v2h-2zm4 0h1v1h-1zm-2 4h3v1h-3zm-2-2h1v1h-1zm2 1h1v1h-1z" />
                    <circle cx={10 + (total % 4)} cy={10 + (total % 4)} r="1.5" fill={brandColor} stroke="none" />
                    <rect x="9" y="3" width="3" height="3" fill="currentColor" stroke="none" />
                    <rect x="3" y="10" width="3" height="3" fill="currentColor" stroke="none" />
                  </svg>
                  <span className="text-[7px] font-bold text-[#5C4033] uppercase tracking-wider mt-1">Scan for bill</span>
                </div>
              </div>
            </div>

            {/* Visual Box 2: Customer Device Inbox Emulation */}
            <div className="flex-1 bg-[#2D1E17] rounded-[2.5rem] p-3 shadow-2xl border-[6px] border-[#5C4033] h-[520px] flex flex-col relative overflow-hidden">
              {/* Speaker notch */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#5C4033] rounded-b-xl z-20" />

              {/* Chat header */}
              <div className="bg-[#5C4033] text-white pt-6 pb-2.5 px-4 flex items-center gap-2 shrink-0 z-10">
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-[#C4A896]">
                  Shop
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">True Broadcast Store</p>
                  <p className="text-[8px] text-[#C4A896] tracking-wide">Verified Counter Portal</p>
                </div>
              </div>

              {/* WhatsApp Chat feed */}
              <div
                className="flex-1 bg-[#F3ECE5] p-3 flex flex-col gap-3 overflow-y-auto"
                style={{
                  backgroundImage: 'radial-gradient(#D6C5B7 1px, transparent 1px)',
                  backgroundSize: '12px 12px',
                }}
              >
                {/* Customer Inbound Request */}
                <div className="self-end bg-[#E8DCD3] max-w-[85%] rounded-lg rounded-tr-none px-3 py-1.5 shadow-sm text-xs border border-[#E5DCD3] mt-2">
                  <p className="text-[#2D1E17]">Get my Bill INV-1002</p>
                  <span className="text-[8px] text-slate-500 float-right mt-1 ml-2">Just now</span>
                </div>

                {/* Outbound Receipt PDF & Preview */}
                <div
                  className="self-start bg-white max-w-[90%] rounded-lg rounded-tl-none p-2.5 shadow-sm border-l-4 mt-1 transition-all duration-300 w-full"
                  style={{ borderColor: brandColor }}
                >
                  {/* PDF Doc Row */}
                  <div className="flex items-center gap-3 mb-2 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center shrink-0 border border-rose-100">
                      <FileText size={18} className="text-rose-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-800 truncate">INV-1002-BILL.pdf</p>
                      <p className="text-[9px] text-slate-500">142 KB • PDF Document</p>
                    </div>
                    <Download
                      size={14}
                      className="text-slate-400 hover:text-[#5C4033] cursor-pointer shrink-0"
                      onClick={handleDownloadBill}
                    />
                  </div>

                  {/* Receipt Accent Preview */}
                  <div className="border rounded p-2 text-[10px] bg-[#FAF6F0]" style={{ borderColor: `${brandColor}30` }}>
                    <div
                      className="flex justify-between items-center border-b pb-1 mb-1 font-bold text-slate-700"
                      style={{ borderBottomColor: `${brandColor}20` }}
                    >
                      <span className="font-serif font-bold text-[#5C4033]">True Store</span>
                      <span>INV-1002</span>
                    </div>
                    <div className="space-y-0.5 text-slate-600">
                      {cart.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>
                            {item.qty}x {item.name}
                          </span>
                          <span>₹{item.price * item.qty}</span>
                        </div>
                      ))}
                    </div>
                    <div
                      className="border-t pt-1 mt-1 flex justify-between font-bold text-[#5C4033]"
                      style={{ borderTopColor: `${brandColor}20` }}
                    >
                      <span>Total (inc. GST)</span>
                      <span>₹{total}</span>
                    </div>
                  </div>

                  {/* Footer note */}
                  <div className="mt-2 text-center border-t pt-2 border-slate-100">
                    <p className="text-[10px] font-medium italic font-serif" style={{ color: brandColor }}>
                      &quot;{invoiceFooterNote}&quot;
                    </p>
                  </div>

                  <div className="mt-1 text-right">
                    <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">
                      Powered by True Attendly
                    </span>
                  </div>

                  <span className="text-[8px] text-slate-500 float-right mt-1">Just now</span>
                </div>

                {/* Overrides inside customer feed */}
                <div className="flex gap-2 mt-1 self-start shrink-0 w-full max-w-[90%]">
                  <button
                    onClick={() => setShowBillModal(true)}
                    className="flex-1 bg-white hover:bg-slate-50 text-[#5C4033] border border-[#E5DCD3] rounded px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm transition-colors"
                  >
                    <Eye size={10} /> View Bill
                  </button>
                  <button
                    onClick={handleDownloadBill}
                    className="flex-1 bg-white hover:bg-slate-50 text-[#5C4033] border border-[#E5DCD3] rounded px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm transition-colors"
                  >
                    {isDownloading ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                    Download
                  </button>
                </div>
              </div>

              {/* Presets Accent Bar */}
              <div className="p-3 bg-[#FAF6F0] border-t border-[#E5DCD3] shrink-0 text-slate-800 flex items-center justify-between gap-2">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  Shop Accent Presets
                </span>
                <div className="flex gap-1.5">
                  {brandPresetColors.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => selectPresetColor(c.hex)}
                      className={`w-4 h-4 rounded-full border ${c.bg} transition-transform ${
                        brandColor === c.hex ? 'scale-125 border-[#2D1E17]' : 'border-transparent hover:scale-110'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
