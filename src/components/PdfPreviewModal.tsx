'use client';

import { X } from 'lucide-react';
import { DynamicInvoiceViewer } from './DynamicInvoiceViewer';

interface PdfPreviewModalProps {
  invoiceNumber: string | null;
  onClose: () => void;
}

export function PdfPreviewModal({ invoiceNumber, onClose }: PdfPreviewModalProps) {
  if (!invoiceNumber) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 md:p-10 animate-in fade-in duration-200">
      {/* Background backdrop mask */}
      <div 
        className="absolute inset-0 bg-[#1E1B18]/70 backdrop-blur-md cursor-pointer"
        onClick={onClose}
      />

      {/* Main Modal Container */}
      <div className="relative bg-[#F5F1EA] w-full max-w-4xl h-[85vh] sm:h-[80vh] rounded-3xl border border-[#E8E3DA] shadow-2xl flex flex-col overflow-hidden z-10 animate-in slide-in-from-bottom-8 duration-300">
        
        {/* Header Bar */}
        <div id="print-modal-header" className="bg-white border-b border-[#E8E3DA] px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#3E3B36] uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[#C4A896] rounded-full animate-pulse"></span>
              Invoice Preview
            </h2>
            <p className="text-[10px] font-mono text-[#8B8378] mt-0.5">#{invoiceNumber}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F5F1EA] rounded-lg transition-colors text-[#8B8378] hover:text-[#3E3B36] flex items-center justify-center"
              title="Close Preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="flex-1 relative bg-[#1E1B18]/5 overflow-hidden">
          <DynamicInvoiceViewer invoiceNumber={invoiceNumber} />
        </div>
      </div>
    </div>
  );
}
