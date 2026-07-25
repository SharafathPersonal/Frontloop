'use client';

import { useEffect, useState } from 'react';
import { X, AlertTriangle, Info } from 'lucide-react';

interface CustomConfirmProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  requireInput?: string;
  type?: 'info' | 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CustomConfirm({
  isOpen,
  title,
  message,
  confirmText = 'CONFIRM',
  cancelText = 'CANCEL',
  requireInput,
  type,
  onConfirm,
  onCancel,
}: CustomConfirmProps) {
  const [inputValue, setInputValue] = useState('');

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
        
        <div className="flex items-start gap-4">
          {type === 'danger' && (
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="text-red-600" size={20} strokeWidth={2} />
            </div>
          )}
          {type === 'warning' && (
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="text-amber-600" size={20} strokeWidth={2} />
            </div>
          )}
          {type === 'info' && (
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Info className="text-blue-600" size={20} strokeWidth={2} />
            </div>
          )}
          
          <div className="flex-1">
            <h2 className="serif-headline font-normal tracking-tight text-[#3E3B36] text-lg">
              {title}
            </h2>
            <p className="text-sm text-[#8B8378] leading-relaxed mt-2 font-sans">
              {message}
            </p>
          </div>
        </div>

        {requireInput && (
          <div className="mt-6">
            <p className="text-[10px] tracking-[0.1em] uppercase text-[#3E3B36] font-semibold mb-2">
              Type &quot;{requireInput}&quot; to confirm
            </p>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={requireInput}
              className="w-full bg-[#F5F1EA] border border-[#E8E3DA] px-4 py-3 text-sm focus:outline-none focus:border-[#C4A896] transition-colors rounded-sm"
            />
          </div>
        )}
        
        <div className="flex items-center justify-end gap-3 mt-8">
          <button 
            onClick={onCancel}
            className="text-[10px] tracking-[0.2em] uppercase text-[#8B8378] hover:text-[#3E3B36] transition-colors py-3 px-4 font-medium cursor-pointer"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            disabled={requireInput ? inputValue !== requireInput : false}
            className={`text-[10px] tracking-[0.2em] uppercase py-3 px-6 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              type === 'danger' 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-[#3E3B36] text-[#FFFFFF] hover:bg-[#C4A896]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
