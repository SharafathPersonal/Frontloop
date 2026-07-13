'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  CreditCard, 
  Receipt, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowUpRight, 
  Search, 
  IndianRupee, 
  Coins, 
  BarChart3
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

const LIMIT = 20;

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<'purchases' | 'usages'>('purchases');
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Pagination & Infinite Scroll states
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Purchases Metrics
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);

  // Usages Metrics
  const [totalConsumed, setTotalConsumed] = useState(0);
  const [mostActiveEngine, setMostActiveEngine] = useState('None');

  const loaderRef = useRef(null);

  // Fetch Totals for both matrices once
  const loadTotals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // 1. Purchase Totals
    const { data: totalsData } = await supabase
      .from('payment_logs')
      .select('amount, credits_credited, payment_status')
      .eq('shop_id', user.id);

    let spent = 0;
    let credits = 0;
    totalsData?.forEach(tx => {
      if (tx.payment_status?.toUpperCase() === 'SUCCESS' || tx.payment_status?.toUpperCase() === 'CHARGED') {
        spent += Number(tx.amount || 0);
        credits += Number(tx.credits_credited || 0);
      }
    });
    setTotalSpent(spent);
    setTotalCredits(credits);

    // 2. Usage Totals (direct from the new view)
    const { data: usagesData } = await supabase
      .from('credit_usage_ledger')
      .select('usage_type, credits')
      .eq('shop_id', user.id);

    let consumed = 0;
    const engineMap: Record<string, number> = {};
    usagesData?.forEach(row => {
      const c = Number(row.credits || 0);
      consumed += c;
      const type = row.usage_type || 'Unknown';
      engineMap[type] = (engineMap[type] || 0) + c;
    });

    let mostActive = 'None';
    let maxVal = -1;
    Object.entries(engineMap).forEach(([engine, val]) => {
      if (val > maxVal) {
        maxVal = val;
        mostActive = engine;
      }
    });

    setTotalConsumed(consumed);
    setMostActiveEngine(mostActive);
  };

  const loadData = async (pageIndex: number, isInitial = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!isInitial) setLoadingMore(true);

    const from = pageIndex * LIMIT;
    const to = from + LIMIT - 1;

    try {
      if (activeTab === 'purchases') {
        let query = supabase
          .from('payment_logs')
          .select('id, amount, credits_credited, order_id, payment_status, created_at')
          .eq('shop_id', user.id)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (search) {
          query = query.ilike('order_id', `%${search}%`);
        }

        const { data: userTx } = await query;
        if (userTx) {
          if (isInitial) {
            setDataList(userTx);
          } else {
            setDataList(prev => [...prev, ...userTx]);
          }
          setHasMore(userTx.length === LIMIT);
        }
      } else {
        let query = supabase
          .from('credit_usage_ledger')
          .select('id, usage_type, reference_name, credits, created_at')
          .eq('shop_id', user.id)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (search) {
          query = query.ilike('reference_name', `%${search}%`);
        }

        const { data: userUsages } = await query;
        if (userUsages) {
          if (isInitial) {
            setDataList(userUsages);
          } else {
            setDataList(prev => [...prev, ...userUsages]);
          }
          setHasMore(userUsages.length === LIMIT);
        }
      }
    } catch (err) {
      console.error('Error fetching list data:', err);
    } finally {
      if (isInitial) setLoading(false);
      setLoadingMore(false);
    }
  };

  // Reset page and list on search or active tab shift
  useEffect(() => {
    setLoading(true);
    setPage(0);
    setHasMore(true);
    loadTotals();
    loadData(0, true);
  }, [activeTab, search]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadData(nextPage);
    }
  }, [page, loadingMore, hasMore, activeTab, search]);

  // Viewport scroll boundary observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [loadMore, hasMore, loadingMore, loading]);

  const renderEngineBadge = (type: string) => {
    switch (type) {
      case 'WhatsApp Campaign':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase">
            WhatsApp
          </span>
        );
      case 'Email Marketing':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase">
            Email
          </span>
        );
      case 'Digital Bill Dynamic QR':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase">
            Digital QR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-[#F5F1EA] text-[#8B8378] border border-[#E8E3DA] px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase">
            {type}
          </span>
        );
    }
  };

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
            placeholder={activeTab === 'purchases' ? "Search by Order ID..." : "Search by Reference Name..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#FFFFFF] border border-[#E8E3DA] py-2 pl-9 pr-4 text-sm text-[#3E3B36] rounded-xl outline-none focus:border-[#C4A896] transition-colors w-full md:w-64"
          />
        </div>
      </div>

      {/* Dual Tab Segment Control */}
      <div className="flex justify-center">
        <div className="bg-[#E8E3DA]/30 border border-[#E8E3DA] p-1 rounded-2xl flex gap-1 w-full max-w-md">
          <button
            onClick={() => {
              setActiveTab('purchases');
              setSearch('');
            }}
            className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold rounded-xl transition-all ${
              activeTab === 'purchases'
                ? 'bg-[#3E3B36] text-[#F5F1EA] shadow-md'
                : 'text-[#8B8378] hover:text-[#3E3B36]'
            }`}
          >
            Credit Purchases
          </button>
          <button
            onClick={() => {
              setActiveTab('usages');
              setSearch('');
            }}
            className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold rounded-xl transition-all ${
              activeTab === 'usages'
                ? 'bg-[#3E3B36] text-[#F5F1EA] shadow-md'
                : 'text-[#8B8378] hover:text-[#3E3B36]'
            }`}
          >
            Credit Usages
          </button>
        </div>
      </div>

      {/* Totals Matrix */}
      {activeTab === 'purchases' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-100">
              <IndianRupee size={24} className="text-emerald-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1">Lifetime Investment</p>
              <p className="serif-headline text-2xl text-[#3E3B36]">₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-amber-100">
              <Coins size={24} className="text-amber-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1">Total Vaulted Credits</p>
              <p className="serif-headline text-2xl text-[#3E3B36]">{totalCredits.toLocaleString()}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-rose-100">
              <Coins size={24} className="text-rose-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1">Total Consumed Tokens</p>
              <p className="serif-headline text-2xl text-[#3E3B36]">{totalConsumed.toLocaleString()} Credits</p>
            </div>
          </div>
          
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-100">
              <BarChart3 size={24} className="text-blue-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1">Most Active Engine</p>
              <p className="serif-headline text-2xl text-[#3E3B36] truncate max-w-[280px]">{mostActiveEngine}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Ledger Content List */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-2xl overflow-hidden shadow-sm">
        <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9F7F4] border-b border-[#E8E3DA]">
                {activeTab === 'purchases' ? (
                  <>
                    <th className="py-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#8B8378] font-semibold">Gateway ID</th>
                    <th className="py-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#8B8378] font-semibold text-right">Amount (INR)</th>
                    <th className="py-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#8B8378] font-semibold text-right">Credits Added</th>
                    <th className="py-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#8B8378] font-semibold text-center">Status</th>
                    <th className="py-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#8B8378] font-semibold">Date & Time</th>
                  </>
                ) : (
                  <>
                    <th className="py-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#8B8378] font-semibold">Engine Type</th>
                    <th className="py-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#8B8378] font-semibold">Reference</th>
                    <th className="py-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#8B8378] font-semibold text-right">Exact Tokens Deducted</th>
                    <th className="py-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#8B8378] font-semibold">Execution Time</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E3DA]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {activeTab === 'purchases' ? (
                      <>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-32" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-12 ml-auto" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-28" /></td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-36" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-28" /></td>
                      </>
                    )}
                  </tr>
                ))
              ) : dataList.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'purchases' ? 5 : 4} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 bg-[#F5F1EA] rounded-full flex items-center justify-center">
                        <CreditCard className="text-[#C4A896]" size={20} />
                      </div>
                      <p className="text-sm font-medium text-[#3E3B36]">No entries found</p>
                      <p className="text-xs text-[#8B8378] tracking-wider uppercase">
                        {activeTab === 'purchases' ? 'Your purchase ledger is empty' : 'Your usage ledger is empty'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                dataList.map((row) => (
                  <tr key={row.id} className="hover:bg-[#FDFCFB] transition-colors group">
                    {activeTab === 'purchases' ? (
                      <>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-[#3E3B36]">{row.order_id || 'N/A'}</span>
                            {row.order_id && <ArrowUpRight size={12} className="text-[#8B8378] opacity-0 group-hover:opacity-100 transition-opacity" />}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-sm font-medium text-[#3E3B36]">₹{Number(row.amount).toFixed(2)}</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-sm font-semibold text-[#C4A896]">+{row.credits_credited}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-center">
                            {row.payment_status?.toUpperCase() === 'SUCCESS' || row.payment_status?.toUpperCase() === 'CHARGED' ? (
                              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-emerald-100">
                                <CheckCircle size={10} strokeWidth={2.5} />
                                Success
                              </div>
                            ) : row.payment_status?.toUpperCase() === 'FAILED' ? (
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
                            {new Date(row.created_at).toLocaleString('en-GB', { 
                              day: 'numeric', month: 'short', year: 'numeric', 
                              hour: '2-digit', minute: '2-digit' 
                            })}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-6">
                          {renderEngineBadge(row.usage_type)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#3E3B36]">{row.reference_name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 text-xs font-bold font-mono">
                            -{Number(row.credits).toFixed(1)} {Number(row.credits) === 1 ? 'Credit' : 'Credits'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[11px] font-medium text-[#8B8378] tracking-wider uppercase">
                            {new Date(row.created_at).toLocaleString('en-GB', { 
                              day: 'numeric', month: 'short', year: 'numeric', 
                              hour: '2-digit', minute: '2-digit' 
                            })}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
              
              {/* Infinite Scroll Loader Target */}
              {hasMore && !loading && dataList.length > 0 && (
                <tr ref={loaderRef}>
                  <td colSpan={activeTab === 'purchases' ? 5 : 4} className="py-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-[#8B8378]">
                      <div className="w-4 h-4 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin" />
                      <span className="text-[10px] uppercase tracking-widest font-medium">Loading More...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
