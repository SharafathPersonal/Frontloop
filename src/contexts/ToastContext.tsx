'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start gap-3 bg-white animate-in slide-in-from-bottom-4 duration-300 ${
              toast.type === 'success'
                ? 'border-green-100 text-green-800'
                : toast.type === 'error'
                ? 'border-red-100 text-red-800'
                : 'border-[#E8E3DA] text-[#3E3B36]'
            }`}
          >
            {toast.type === 'success' && (
              <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            )}
            {toast.type === 'error' && (
              <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
            )}
            {toast.type === 'info' && (
              <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            )}

            <p className="text-xs font-medium leading-relaxed flex-1 font-sans">{toast.message}</p>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#8B8378] hover:text-[#3E3B36] transition-colors flex-shrink-0 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
