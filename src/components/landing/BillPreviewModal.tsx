'use client';

import React from 'react';
import { FileText, X, Download } from 'lucide-react';
import { CartItem } from './types';

interface BillPreviewModalProps {
  showBillModal: boolean;
  setShowBillModal: (show: boolean) => void;
  brandColor: string;
  cart: CartItem[];
  subtotal: number;
  gst: number;
  total: number;
  invoiceFooterNote: string;
  handleDownloadBill: () => void;
}

export function BillPreviewModal({
  showBillModal,
  setShowBillModal,
  brandColor,
  cart,
  subtotal,
  gst,
  total,
  invoiceFooterNote,
  handleDownloadBill,
}: BillPreviewModalProps) {
  if (!showBillModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Modal header */}
        <div className="bg-[#5C4033] text-white px-5 py-4 flex items-center justify-between border-b shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
            <FileText size={14} className="text-[#C4A896]" />
            INV-1002 - Bill Preview
          </span>
          <button
            onClick={() => setShowBillModal(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal bill body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between p-2 rounded text-[10px] bg-[#FAF6F0] border border-dashed border-[#E5DCD3]">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Dynamic Theme Config</span>
            <span className="font-semibold" style={{ color: brandColor }}>
              {brandColor}
            </span>
          </div>

          {/* Invoice Layout */}
          <div className="border p-6 rounded-lg relative overflow-hidden" style={{ borderColor: brandColor }}>
            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: brandColor }} />

            {/* Logo and Shop Header */}
            <div
              className="flex justify-between items-start border-b pb-4 mb-4"
              style={{ borderBottomColor: `${brandColor}20` }}
            >
              <div>
                <h3 className="serif-headline text-base font-bold text-[#5C4033]">True Store</h3>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5">GSTIN: 32AABCT8840M1Z3</p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                INV-1002
              </span>
            </div>

            {/* Items Table */}
            <div className="space-y-2 text-xs">
              <div
                className="flex justify-between font-bold text-slate-500 border-b pb-1.5 mb-1.5"
                style={{ borderBottomColor: `${brandColor}10` }}
              >
                <span>Description</span>
                <span>Total</span>
              </div>
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-slate-700">
                  <span>
                    {item.qty} × {item.name}
                  </span>
                  <span>₹{item.price * item.qty}</span>
                </div>
              ))}
            </div>

            {/* Subtotals & Taxes */}
            <div
              className="border-t pt-3 mt-4 space-y-1 text-xs text-slate-600"
              style={{ borderTopColor: `${brandColor}15` }}
            >
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (18%)</span>
                <span>₹{gst}</span>
              </div>
              <div
                className="flex justify-between font-bold text-slate-900 text-sm border-t pt-1.5 mt-1.5"
                style={{ borderTopColor: `${brandColor}20` }}
              >
                <span>Total Bill</span>
                <span>₹{total}</span>
              </div>
            </div>

            {/* Styled Invoice Footer note */}
            <div className="mt-6 text-center border-t pt-4 text-xs italic" style={{ borderTopColor: `${brandColor}15` }}>
              <p className="font-serif font-bold" style={{ color: brandColor }}>
                &quot;{invoiceFooterNote}&quot;
              </p>
              <p className="text-[8px] text-slate-400 mt-2 font-bold uppercase tracking-wider">
                Powered by True Attendly
              </p>
            </div>
          </div>
        </div>

        {/* Modal actions */}
        <div className="bg-slate-50 p-4 border-t flex justify-end gap-2 shrink-0">
          <button
            onClick={() => setShowBillModal(false)}
            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
          >
            Close Preview
          </button>
          <button
            onClick={handleDownloadBill}
            className="text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5"
            style={{ backgroundColor: brandColor }}
          >
            <Download size={12} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
