'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Shield, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function AdminLogsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Auth credentials state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Infinite Scroll Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [logType, setLogType] = useState<'activity' | 'system'>('activity');

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
        setLogs([]);
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
      const res = await fetch(`/api/admin/logs?page=${targetPage}&type=${logType}`);
      if (res.ok) {
        const data = await res.json();
        const newLogs = data.logs || [];
        const serverHasMore = data.hasMore ?? false;

        if (reset) {
          setLogs(newLogs);
          setPage(1);
        } else {
          setLogs((prev) => [...prev, ...newLogs]);
          setPage((prev) => prev + 1);
        }
        setHasMore(serverHasMore && newLogs.length > 0);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Trigger page load on type change
  useEffect(() => {
    if (isAuthenticated) {
      setLogs([]);
      setPage(0);
      setHasMore(true);
    }
  }, [logType, isAuthenticated]);

  // Handle first fetch when page reset to 0
  useEffect(() => {
    if (isAuthenticated && page === 0 && hasMore && !loading) {
      fetchNextPage(true);
    }
  }, [page, isAuthenticated]);

  // Intersection Observer
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
  }, [isAuthenticated, hasMore, loading, page, logType]);

  const cleanFailureReason = (reason?: string | null): string => {
    if (!reason) return '';
    if (reason.includes('\n') || reason.includes('stack') || reason.includes('Error:') || reason.includes(' at ')) {
      const firstLine = reason.split('\n')[0].replace(/^Error:\s*/, '').trim();
      if (firstLine.length > 80) {
        return firstLine.substring(0, 80) + '...';
      }
      return firstLine;
    }
    return reason;
  };

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
        <div className="bg-[#FFFFFF] p-4 sm:p-6 md:p-8 md:p-12 shadow-2xl rounded-sm w-full max-w-md border border-[#E8E3DA]">
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
    <div className="min-h-screen bg-[#F5F1EA] text-[#3E3B36] p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] text-[#8B8378] hover:text-[#3E3B36] transition-colors uppercase mb-4"
        >
          <ArrowLeft size={12} /> Back to Master Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E8E3DA] pb-4 gap-4">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-[#3E3B36]" />
            <h1 className="text-xl font-bold uppercase tracking-widest">Security & Audit Logs</h1>
          </div>
          <div className="flex items-center gap-1.5 bg-[#F5F1EA] p-1 rounded border border-[#E8E3DA]">
            <button
              onClick={() => { setLogType('activity'); }}
              className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors rounded ${logType === 'activity' ? 'bg-[#3E3B36] text-[#F5F1EA]' : 'text-[#8E8B85] hover:text-[#3E3B36]'}`}
            >
              User Actions
            </button>
            <button
              onClick={() => { setLogType('system'); }}
              className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors rounded ${logType === 'system' ? 'bg-[#3E3B36] text-[#F5F1EA]' : 'text-[#8E8B85] hover:text-[#3E3B36]'}`}
            >
              System Errors
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] shadow-sm">
        <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F5F1EA] text-[10px] uppercase tracking-widest text-[#8E8B85]">
              {logType === 'activity' ? (
                <>
                  <th className="p-4 font-semibold">Account Email</th>
                  <th className="p-4 font-semibold">Action Performed</th>
                  <th className="p-4 font-semibold">Timestamp</th>
                  <th className="p-4 font-semibold">Shop ID</th>
                </>
              ) : (
                <>
                  <th className="p-4 font-semibold">Merchant / Shop</th>
                  <th className="p-4 font-semibold">Error Category</th>
                  <th className="p-4 font-semibold">Diagnostic / Failure Reason</th>
                  <th className="p-4 font-semibold">Timestamp</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-[#E8E3DA]">
            {logType === 'activity' ? (
              logs.map((log, i) => (
                <tr key={log.id || i} className="hover:bg-[#FCFAFC] transition-colors">
                  <td className="p-4 font-medium">{log.account_email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm ${log.action_type === 'LOGIN' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                      {log.action_type}
                    </span>
                  </td>
                  <td className="p-4 text-[10px] text-[#8E8B85] font-mono">
                    {new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="p-4 text-[10px] text-[#8E8B85] font-mono max-w-[150px] truncate">{log.shop_id}</td>
                </tr>
              ))
            ) : (
              logs.map((log, i) => (
                <tr key={log.id || i} className="hover:bg-[#FCFAFC] transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-sm">{log.shops?.shop_name || 'N/A'}</div>
                    <div className="text-[10px] text-[#8E8B85] font-mono">{log.shop_id}</div>
                  </td>
                  <td className="p-4">
                    <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded">
                      {log.error_type}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-mono text-[#3E3B36] max-w-xs break-words whitespace-pre-wrap">
                    {cleanFailureReason(log.failure_reason)}
                  </td>
                  <td className="p-4 text-[10px] text-[#8E8B85] font-mono">
                    {new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* Empty state */}
        {logs.length === 0 && !loading && (
          <div className="p-4 sm:p-6 md:p-8 text-center text-[#8E8B85] text-sm tracking-widest uppercase">
            {logType === 'activity' ? 'No activity logs found.' : 'No system error logs found.'}
          </div>
        )}

        {/* Skeleton Loader Block while loading */}
        {loading && (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-4 animate-pulse">
                <div className="h-4 bg-[#F5F1EA] rounded w-1/4"></div>
                <div className="h-4 bg-[#F5F1EA] rounded w-1/4"></div>
                <div className="h-4 bg-[#F5F1EA] rounded w-2/5"></div>
                <div className="h-4 bg-[#F5F1EA] rounded w-1/10"></div>
              </div>
            ))}
          </div>
        )}

        {/* Intersection Observer Sentinel element */}
        <div ref={observerRef} className="h-4 w-full" />
      </div>

      {/* Finished all logs banner */}
      {!hasMore && logs.length > 0 && (
        <div className="text-center py-4 text-xs tracking-wider uppercase text-[#8E8B85] font-semibold bg-[#FFFFFF] border border-[#E8E3DA] rounded">
          All system logs fully loaded
        </div>
      )}
    </div>
  );
}
