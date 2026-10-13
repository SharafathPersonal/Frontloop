'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
  const titleId = useId();
  const messageId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    (inputRef.current ?? confirmRef.current)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancelRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/30 backdrop-blur-sm p-4">
      <div 
        className="relative bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-8 max-w-md w-full animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#64748B] hover:text-[#0F172A] transition-colors"
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
            <h2 id={titleId} className="serif-headline font-normal tracking-tight text-[#0F172A] text-lg">
              {title}
            </h2>
            <p id={messageId} className="text-sm text-[#64748B] leading-relaxed mt-2 font-sans">
              {message}
            </p>
          </div>
        </div>

        {requireInput && (
          <div className="mt-6">
            <label htmlFor={inputId} className="block text-[10px] tracking-[0.1em] uppercase text-[#0F172A] font-semibold mb-2">
              Type &quot;{requireInput}&quot; to confirm
            </label>
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={requireInput}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3 text-sm focus:outline-none focus:border-[#047857] transition-colors rounded-sm"
            />
          </div>
        )}
        
        <div className="flex items-center justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={onCancel}
            className="text-[10px] tracking-[0.2em] uppercase text-[#64748B] hover:text-[#0F172A] transition-colors py-3 px-4 font-medium cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={requireInput ? inputValue !== requireInput : false}
            className={`text-[10px] tracking-[0.2em] uppercase py-3 px-6 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              type === 'danger' 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-[#047857] text-white hover:bg-[#065F46]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
