'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, ArrowLeft, ShieldAlert, LayoutDashboard, Store, IndianRupee, MessageSquare, Shield, Coins } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminTransactionsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Auth credentials state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Infinite Scroll Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);

  const observerRef = useRef<HTMLDivElement | null>(null);

  // Authenticate user check
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/data');
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        setIsAuthenticated(true);
        setPage(0);
        setTransactions([]);
        setHasMore(true);
      } else {
        const err = await res.json();
        setLoginError(err.error || 'Invalid credentials');
      }
    } catch (e) {
      setLoginError('Network error');
    }
  };

  // Fetch Page Handler
  const fetchNextPage = async (reset = false) => {
    if (loading) return;
    const targetPage = reset ? 0 : page;
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/transactions?page=${targetPage}`);
      if (res.ok) {
        const data = await res.json();
        const newTx = data.transactions || [];
        const serverHasMore = data.hasMore ?? false;

        if (reset) {
          setTransactions(newTx);
          setPage(1);
          if (data.totalSpent !== undefined) setTotalSpent(data.totalSpent);
          if (data.totalCredits !== undefined) setTotalCredits(data.totalCredits);
        } else {
          setTransactions((prev) => [...prev, ...newTx]);
          setPage((prev) => prev + 1);
        }
        setHasMore(serverHasMore && newTx.length > 0);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle first fetch when authenticated
  useEffect(() => {
    if (isAuthenticated && page === 0 && hasMore && !loading) {
      fetchNextPage(true);
    }
  }, [page, isAuthenticated]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    if (!isAuthenticated || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchNextPage(false);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [isAuthenticated, hasMore, loading, page]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center text-[#3E3B36] font-medium tracking-wide">
        INITIALIZING SECURE LINK...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center p-4">
        <div className="bg-[#FFFFFF] p-8 md:p-12 shadow-2xl rounded-sm w-full max-w-md border border-[#E8E3DA]">
          <div className="flex justify-center mb-6">
            <ShieldAlert size={48} className="text-[#3E3B36]" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl text-center text-[#3E3B36] font-semibold tracking-widest uppercase mb-2">Master Override</h1>
          <p className="text-center text-sm text-[#8E8B85] mb-8 font-light">Restricted Access. Authenticate below.</p>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#3E3B36] tracking-wider uppercase mb-1">Clearance ID</label>
              <input 
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-[#F5F1EA] border-none text-[#3E3B36] px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#3E3B36] transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3E3B36] tracking-wider uppercase mb-1">Passcode</label>
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#F5F1EA] border-none text-[#3E3B36] px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#3E3B36] transition-all"
                required
              />
            </div>
            {loginError && <p className="text-red-700 text-xs font-medium text-center">{loginError}</p>}
            <button type="submit" className="w-full bg-[#3E3B36] text-[#F5F1EA] uppercase tracking-widest text-sm font-semibold py-4 hover:bg-black transition-colors mt-4">
              Initialize Gateway
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#3E3B36] flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#FFFFFF] border-r border-[#E8E3DA] flex flex-col hidden md:flex sticky top-0 h-screen">
        <div className="p-6 border-b border-[#E8E3DA] flex items-center gap-3">
          <ShieldAlert size={24} className="text-[#3E3B36]" />
          <h1 className="text-sm font-bold tracking-widest uppercase">Master Base</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => router.push('/admin')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors text-[#8E8B85] hover:text-[#3E3B36] hover:bg-[#F5F1EA]/50"
          >
            <LayoutDashboard size={18} />
            Analytics
          </button>
          <button 
            onClick={() => router.push('/admin')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors text-[#8E8B85] hover:text-[#3E3B36] hover:bg-[#F5F1EA]/50"
          >
            <Store size={18} />
            Merchants
          </button>
          <button 
            onClick={() => router.push('/admin')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors text-[#8E8B85] hover:text-[#3E3B36] hover:bg-[#F5F1EA]/50"
          >
            <IndianRupee size={18} />
            Pricing Engine
          </button>
          <button 
            onClick={() => router.push('/admin/transactions')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors bg-[#F5F1EA] text-[#3E3B36]"
          >
            <CreditCard size={18} />
            Transactions
          </button>
          <button 
            onClick={() => router.push('/admin')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors text-[#8E8B85] hover:text-[#3E3B36] hover:bg-[#F5F1EA]/50"
          >
            <MessageSquare size={18} />
            Support Tickets
          </button>
          <button 
            onClick={() => router.push('/admin/logs')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors text-[#8E8B85] hover:text-[#3E3B36] hover:bg-[#F5F1EA]/50"
          >
            <Shield size={18} />
            Security & Audit
          </button>
        </nav>
        <div className="p-4 border-t border-[#E8E3DA]">
          <button 
            onClick={() => {
              document.cookie = "admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              window.location.reload();
            }} 
            className="w-full text-center text-[10px] uppercase tracking-wider font-semibold hover:text-black transition-colors"
          >
            Terminate Link
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl space-y-8">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] text-[#8B8378] hover:text-[#3E3B36] transition-colors uppercase mb-4"
          >
            <ArrowLeft size={12} /> Back to Master Dashboard
          </Link>
          <div className="flex items-center gap-3 border-b border-[#E8E3DA] pb-4">
            <CreditCard size={24} className="text-[#3E3B36]" />
            <h1 className="text-xl font-bold uppercase tracking-widest">Transactions Ledger</h1>
          </div>
        </div>

        {/* Totals Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-100">
              <IndianRupee size={24} className="text-emerald-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1">Total Global Revenue</p>
              <p className="serif-headline text-2xl text-[#3E3B36]">₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-amber-100">
              <Coins size={24} className="text-amber-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1">Total Platform Credits Issued</p>
              <p className="serif-headline text-2xl text-[#3E3B36]">{totalCredits.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] overflow-x-auto shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F1EA] text-[10px] uppercase tracking-widest text-[#8E8B85]">
                <th className="p-4 font-semibold">Shop Name</th>
                <th className="p-4 font-semibold">Payer Email</th>
                <th className="p-4 font-semibold text-right">Amount Paid</th>
                <th className="p-4 font-semibold text-right">Credits Added</th>
                <th className="p-4 font-semibold">Gateway ID</th>
                <th className="p-4 font-semibold">Status Badge</th>
                <th className="p-4 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-[#E8E3DA]">
              {transactions.map((tx, i) => {
                const status = tx.status || 'pending';
                let statusBadge = (
                  <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded">
                    Pending
                  </span>
                );
                if (status === 'success') {
                  statusBadge = (
                    <span className="bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded">
                      Success
                    </span>
                  );
                } else if (status === 'failed') {
                  statusBadge = (
                    <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded">
                      Failed
                    </span>
                  );
                }

                return (
                  <tr key={tx.id || i} className="hover:bg-[#FCFAFC] transition-colors">
                    <td className="p-4 font-semibold text-sm">
                      {tx.shop?.shop_name || 'N/A'}
                    </td>
                    <td className="p-4 font-mono text-xs">{tx.payer_email || 'N/A'}</td>
                    <td className="p-4 text-right font-medium text-sm">₹{Number(tx.amount).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1 font-mono text-xs">
                        <Coins size={12} className="text-[#8E8B85]" />
                        <span>+{tx.credits_added}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[10px] text-[#8E8B85] max-w-[150px] truncate">
                      {tx.payment_gateway_id || 'N/A'}
                    </td>
                    <td className="p-4">{statusBadge}</td>
                    <td className="p-4 text-[10px] text-[#8E8B85] font-mono">
                      {new Date(tx.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty state */}
          {transactions.length === 0 && !loading && (
            <div className="p-8 text-center text-[#8E8B85] text-sm tracking-widest uppercase">
              No transactions found.
            </div>
          )}

          {/* Skeleton Loader */}
          {loading && (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex gap-4 animate-pulse">
                  <div className="h-4 bg-[#F5F1EA] rounded w-1/4"></div>
                  <div className="h-4 bg-[#F5F1EA] rounded w-1/4"></div>
                  <div className="h-4 bg-[#F5F1EA] rounded w-1/6"></div>
                  <div className="h-4 bg-[#F5F1EA] rounded w-1/6"></div>
                  <div className="h-4 bg-[#F5F1EA] rounded w-1/5"></div>
                </div>
              ))}
            </div>
          )}

          {/* Intersection Observer Sentinel */}
          <div ref={observerRef} className="h-4 w-full" />
        </div>

        {/* Finished all transactions banner */}
        {!hasMore && transactions.length > 0 && (
          <div className="text-center py-4 text-xs tracking-wider uppercase text-[#8E8B85] font-semibold bg-[#FFFFFF] border border-[#E8E3DA] rounded">
            🎉 All transactions fully loaded
          </div>
        )}
      </main>
    </div>
  );
}
