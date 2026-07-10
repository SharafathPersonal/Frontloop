'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CreditCard, Receipt, Clock, CheckCircle, XCircle, ArrowUpRight, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadTransactions() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTx } = await supabase
        .from('payment_logs')
        .select('id, amount, credits_credited, order_id, payment_status, created_at')
        .eq('shop_id', user.id)
        .order('created_at', { ascending: false });

      setTransactions(userTx || []);
      setLoading(false);
    }
    loadTransactions();
  }, []);

  const filteredTx = transactions.filter(tx => 
    tx.order_id?.toLowerCase().includes(search.toLowerCase()) || 
    tx.amount?.toString().includes(search)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36] flex items-center gap-3">
            <Receipt className="text-[#C4A896]" size={28} />
            Transaction History
          </h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-2">
            Billing ledger and credit purchases
          </p>
        </div>
        
        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-[#8B8378]" />
          <input 
            type="text" 
            placeholder="Search by Order ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#FFFFFF] border border-[#E8E3DA] py-2 pl-9 pr-4 text-sm text-[#3E3B36] rounded-xl outline-none focus:border-[#C4A896] transition-colors w-full md:w-64"
          />
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9F7F4] border-b border-[#E8E3DA]">
                <th className="py-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#8B8378] font-semibold">Gateway ID</th>
                <th className="py-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#8B8378] font-semibold text-right">Amount (INR)</th>
                <th className="py-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#8B8378] font-semibold text-right">Credits Added</th>
                <th className="py-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#8B8378] font-semibold text-center">Status</th>
                <th className="py-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#8B8378] font-semibold">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E3DA]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-32" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-12 ml-auto" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-28" /></td>
                  </tr>
                ))
              ) : filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 bg-[#F5F1EA] rounded-full flex items-center justify-center">
                        <CreditCard className="text-[#C4A896]" size={20} />
                      </div>
                      <p className="text-sm font-medium text-[#3E3B36]">No transactions found</p>
                      <p className="text-xs text-[#8B8378] tracking-wider uppercase">Your billing ledger is currently empty</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#FDFCFB] transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#3E3B36]">{tx.order_id || 'N/A'}</span>
                        {tx.order_id && <ArrowUpRight size={12} className="text-[#8B8378] opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-medium text-[#3E3B36]">₹{Number(tx.amount).toFixed(2)}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-semibold text-[#C4A896]">+{tx.credits_credited}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center">
                        {tx.payment_status?.toUpperCase() === 'SUCCESS' || tx.payment_status?.toUpperCase() === 'CHARGED' ? (
                          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-emerald-100">
                            <CheckCircle size={10} strokeWidth={2.5} />
                            Success
                          </div>
                        ) : tx.payment_status?.toUpperCase() === 'FAILED' ? (
                          <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-red-100">
                            <XCircle size={10} strokeWidth={2.5} />
                            Failed
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-amber-100">
                            <Clock size={10} strokeWidth={2.5} />
                            Pending
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[11px] font-medium text-[#8B8378] tracking-wider uppercase">
                        {new Date(tx.created_at).toLocaleString('en-GB', { 
                          day: 'numeric', month: 'short', year: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
