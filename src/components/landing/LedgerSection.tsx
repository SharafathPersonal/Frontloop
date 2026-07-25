'use client';

import React from 'react';
import { CreditCard, TrendingUp, RefreshCw, Loader2 } from 'lucide-react';
import { CashfreeLog, LedgerUsage } from './types';

interface LedgerSectionProps {
  activeLedgerTab: 'purchases' | 'usages';
  setActiveLedgerTab: (tab: 'purchases' | 'usages') => void;
  cashfreeLogs: CashfreeLog[];
  ledgerUsages: LedgerUsage[];
  hasMoreUsages: boolean;
  isLoadingMoreUsages: boolean;
  handleLoadMoreUsages: () => void;
}

export function LedgerSection({
  activeLedgerTab,
  setActiveLedgerTab,
  cashfreeLogs,
  ledgerUsages,
  hasMoreUsages,
  isLoadingMoreUsages,
  handleLoadMoreUsages,
}: LedgerSectionProps) {
  return (
    <section id="ledger" className="w-full py-24 px-6 bg-white scroll-reveal-section font-outfit">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16 gsap-reveal">
          <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
            Autonomous Account Ledgers
          </span>
          <h2 className="serif-headline text-3xl sm:text-4xl text-[#5C4033] mt-4 mb-4">
            Pay-As-You-Send Wallet &amp; Ledger Transparency
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
            No monthly subscriptions, hidden maintenance costs, or lock-in contracts. Verify credit top-ups via Cashfree and inspect exact row-by-row campaign debits from our cursor ledger.
          </p>
        </div>

        <div className="max-w-4xl mx-auto gsap-reveal bg-white border border-[#E5DCD3] rounded-2xl shadow-xl overflow-hidden flex flex-col">
          {/* Header tab controller */}
          <div className="bg-[#5C4033] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#E5DCD3]/10 shrink-0">
            <div className="flex bg-[#2D1E17] rounded-lg p-1 w-full sm:w-auto">
              <button
                onClick={() => setActiveLedgerTab('purchases')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition-all ${
                  activeLedgerTab === 'purchases'
                    ? 'bg-[#C4A896] text-white shadow-sm'
                    : 'text-[#FAF6F0]/60 hover:text-white'
                }`}
              >
                <CreditCard size={12} className="inline-block mr-1.5 -mt-0.5" />
                Tab A: Credit Purchases
              </button>
              <button
                onClick={() => setActiveLedgerTab('usages')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition-all ${
                  activeLedgerTab === 'usages'
                    ? 'bg-[#C4A896] text-white shadow-sm'
                    : 'text-[#FAF6F0]/60 hover:text-white'
                }`}
              >
                <TrendingUp size={12} className="inline-block mr-1.5 -mt-0.5" />
                Tab B: Credit Usages
              </button>
            </div>

            {/* Wallet Summary metrics */}
            <div className="flex gap-6 shrink-0 text-[#FAF6F0]">
              <div className="text-right">
                <span className="text-[9px] text-[#C4A896] uppercase tracking-widest block font-bold">
                  Total Purchases
                </span>
                <span className="text-sm font-black text-white">₹25,000.00</span>
              </div>
              <div className="border-l border-[#FAF6F0]/15 pl-6 text-right">
                <span className="text-[9px] text-[#C4A896] uppercase tracking-widest block font-bold">
                  Remaining Balance
                </span>
                <span className="text-sm font-black text-white">25,000 Credits</span>
              </div>
            </div>
          </div>

          {/* TAB A Content: Cashfree Topup Logs */}
          {activeLedgerTab === 'purchases' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px] border-collapse">
                <thead className="bg-[#FAF6F0] border-b border-[#E5DCD3] text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="p-4 border-r border-[#E5DCD3]/50">Transaction ID</th>
                    <th className="p-4 border-r border-[#E5DCD3]/50">Top-Up Date</th>
                    <th className="p-4 border-r border-[#E5DCD3]/50">Tokens Credited</th>
                    <th className="p-4 border-r border-[#E5DCD3]/50">Total Amount (INR)</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {cashfreeLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-[#2D1E17] border-r border-slate-100">{log.id}</td>
                      <td className="p-4 border-r border-slate-100">{log.date}</td>
                      <td className="p-4 font-semibold text-slate-800 border-r border-slate-100">{log.tokens}</td>
                      <td className="p-4 font-semibold text-slate-800 border-r border-slate-100">{log.amount}</td>
                      <td className="p-4">
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-200">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-[#FAF6F0]/50 text-center border-t border-[#E5DCD3] text-[9px] text-[#C4A896] font-bold uppercase tracking-widest">
                Verified by Cashfree Secure Gateway Integration API Webhooks
              </div>
            </div>
          )}

          {/* TAB B Content: Dynamic usage logs with cursor-based infinite scroll */}
          {activeLedgerTab === 'usages' && (
            <div>
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto pr-1">
                <table className="w-full text-left text-xs min-w-[600px] border-collapse">
                  <thead className="bg-[#FAF6F0] border-b border-[#E5DCD3] text-slate-500 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10">
                    <tr>
                      <th className="p-4 bg-[#FAF6F0] border-r border-[#E5DCD3]/50">Operational Usage Type</th>
                      <th className="p-4 bg-[#FAF6F0] border-r border-[#E5DCD3]/50">Reference ID / Campaign</th>
                      <th className="p-4 bg-[#FAF6F0] border-r border-[#E5DCD3]/50">Date</th>
                      <th className="p-4 bg-[#FAF6F0] text-right border-r border-[#E5DCD3]/50">Credits Deducted</th>
                      <th className="p-4 bg-[#FAF6F0] text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[#5C4E46]">
                    {ledgerUsages.map((usage) => (
                      <tr key={usage.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold flex items-center gap-2 border-r border-slate-100">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              usage.type === 'Web Push Broadcast' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          {usage.type}
                        </td>
                        <td className="p-4 font-mono font-semibold text-[#2D1E17] border-r border-slate-100">
                          {usage.desc}
                        </td>
                        <td className="p-4 text-slate-500 border-r border-slate-100">{usage.date}</td>
                        <td className="p-4 text-right font-bold text-slate-800 border-r border-slate-100">
                          {usage.credits}
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200">
                            {usage.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cursor infinite pagination load actions */}
              <div className="p-4 bg-[#FAF6F0] border-t border-[#E5DCD3] flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Showing {ledgerUsages.length} ledger logs
                </span>

                {hasMoreUsages ? (
                  <button
                    onClick={handleLoadMoreUsages}
                    disabled={isLoadingMoreUsages}
                    className="bg-white hover:bg-slate-50 text-[#5C4033] border border-[#E5DCD3] px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    {isLoadingMoreUsages ? (
                      <>
                        <Loader2 size={10} className="animate-spin" />
                        Loading cursor page...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={10} />
                        Load More Usages
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[10px] text-[#C4A896] font-bold uppercase tracking-widest">
                    Cursor reached end of ledger (20+ Rows Sync)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
