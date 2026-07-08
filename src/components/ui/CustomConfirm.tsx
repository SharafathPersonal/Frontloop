'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface CustomConfirmProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CustomConfirm({
  isOpen,
  title,
  message,
  confirmText = 'CONFIRM',
  cancelText = 'CANCEL',
  onConfirm,
  onCancel,
}: CustomConfirmProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3E3B36]/30 backdrop-blur-sm p-4">
      <div 
        className="relative bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-8 max-w-md w-full animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#8B8378] hover:text-[#3E3B36] transition-colors"
          aria-label="Close"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
        
        <h2 className="serif-headline font-normal tracking-tight text-[#3E3B36] text-lg">
          {title}
        </h2>
        <p className="text-sm text-[#8B8378] leading-relaxed mt-2 font-sans">
          {message}
        </p>
        
        <div className="flex items-center justify-end gap-3 mt-8">
          <button 
            onClick={onCancel}
            className="text-[10px] tracking-[0.2em] uppercase text-[#8B8378] hover:text-[#3E3B36] transition-colors py-3 px-4 font-medium"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className="bg-[#3E3B36] text-[#FFFFFF] text-[10px] tracking-[0.2em] uppercase py-3 px-6 rounded-lg hover:bg-[#C4A896] transition-colors font-medium"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
