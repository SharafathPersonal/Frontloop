'use client';

import React from 'react';
import { AlertTriangle, X, Loader2, CheckCircle } from 'lucide-react';

interface SecurityFirewallModalProps {
  securityModalOpen: boolean;
  setSecurityModalOpen: (open: boolean) => void;
  dispatchStatus: 'idle' | 'broadcasting' | 'completed';
  securityClickCount: number;
  handleSecurityVerification: () => void;
}

export function SecurityFirewallModal({
  securityModalOpen,
  setSecurityModalOpen,
  dispatchStatus,
  securityClickCount,
  handleSecurityVerification,
}: SecurityFirewallModalProps) {
  if (!securityModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#2D1E17]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5DCD3] shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#B45309] text-white px-5 py-4 flex items-center gap-2 border-b shrink-0">
          <AlertTriangle size={18} className="text-white" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Critical Transaction Security Firewall
          </span>
          <button
            onClick={() => setSecurityModalOpen(false)}
            className="text-white/60 hover:text-white transition-colors ml-auto"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 text-left">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
            <strong>Attention Required:</strong> You are about to initiate an active Web Push campaign broadcast loop. This will consume wallet credits and dispatch communications instantly to opt-in cohorts.
          </div>

          <div className="space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-slate-500 font-semibold">Broadcasting Channel</span>
              <span className="font-bold text-slate-800 uppercase">Web Push Broadcast</span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-slate-500 font-semibold">Target Cohorts</span>
              <span className="font-bold text-slate-800">Flash Offer Subscribers / Registry Contacts</span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-slate-500 font-semibold">Recipients Queue Size</span>
              <span className="font-bold text-slate-800">1,240 Contacts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Wallet Credits Deducted</span>
              <span className="font-bold text-amber-700">2.0 Credits per Subscriber</span>
            </div>
          </div>

          {/* Progress simulation state */}
          {dispatchStatus === 'broadcasting' && (
            <div className="py-4 text-center space-y-2">
              <Loader2 size={24} className="text-[#B45309] animate-spin mx-auto" />
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                Dispatching campaign packets...
              </p>
            </div>
          )}

          {dispatchStatus === 'completed' && (
            <div className="py-4 text-center space-y-1 text-emerald-600">
              <CheckCircle size={24} className="mx-auto" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Queue Dispatched Successfully</p>
              <p className="text-[8px] text-slate-400">Credits deducted from ledger balance.</p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 p-4 border-t flex justify-between items-center shrink-0">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            Double confirmation required
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => setSecurityModalOpen(false)}
              disabled={dispatchStatus !== 'idle'}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>

            {dispatchStatus === 'idle' && (
              <button
                onClick={handleSecurityVerification}
                className={`px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                  securityClickCount === 0
                    ? 'bg-[#5C4033] text-white hover:bg-[#C4A896]'
                    : securityClickCount === 1
                    ? 'bg-red-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {securityClickCount === 0 ? 'Confirm Broadcast Pipeline' : 'Click to Launch Broadcast'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
