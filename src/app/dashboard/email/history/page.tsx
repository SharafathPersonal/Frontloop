'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { ChevronLeft, Search, Filter, ArrowUpDown, Download, Mail, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/Skeleton';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface EmailCampaignRow {
  id: string;
  title: string;
  subject: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  target_tags: string[];
  created_at: string;
}

interface AnalyticsData {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
}

export default function EmailHistoryPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaignRow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({ totalSent: 0, totalDelivered: 0, totalFailed: 0 });
  const [loadingDb, setLoadingDb] = useState(true);
  
  // Infinite Scroll States
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const fetchCampaigns = useCallback(async (currentPage: number, reset: boolean = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (reset) {
      setLoadingDb(true);
    } else {
      setIsFetchingMore(true);
    }

    let query = supabase.from('email_campaigns').select('*').eq('shop_id', user.id);

    if (searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
    }

    if (filterStatus !== 'All') {
      query = query.eq('status', filterStatus);
    }

    query = query.order('created_at', { ascending: sortOrder === 'asc' });

    const start = currentPage * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    const { data } = await query.range(start, end);

    if (data) {
      setCampaigns(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }

    setLoadingDb(false);
    setIsFetchingMore(false);
  }, [searchQuery, filterStatus, sortOrder]);

  const loadGlobalAnalytics = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // We fetch all records to sum up the analytics
    const { data } = await supabase.from('email_campaigns').select('total_sent, total_delivered, total_failed').eq('shop_id', user.id);
    if (data) {
      const agg = data.reduce((acc, curr) => ({
        totalSent: acc.totalSent + (curr.total_sent || 0),
        totalDelivered: acc.totalDelivered + (curr.total_delivered || 0),
        totalFailed: acc.totalFailed + (curr.total_failed || 0),
      }), { totalSent: 0, totalDelivered: 0, totalFailed: 0 });
      setAnalytics(agg);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchCampaigns(0, true);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, filterStatus, sortOrder, fetchCampaigns]);

  useEffect(() => {
    loadGlobalAnalytics();
  }, [loadGlobalAnalytics]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingDb && !isFetchingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchCampaigns(nextPage, false);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [hasMore, loadingDb, isFetchingMore, page, fetchCampaigns]);

  const successRatio = analytics.totalSent > 0 
    ? Math.round((analytics.totalDelivered / analytics.totalSent) * 100) 
    : 0;

  const getExportData = () => {
    return campaigns.map(c => ({
      'Campaign Title': c.title,
      'Subject Line': c.subject,
      'Status': c.status.toUpperCase(),
      'Target Tags': c.target_tags.join(', '),
      'Recipients': c.total_recipients,
      'Sent': c.total_sent,
      'Delivered': c.total_delivered,
      'Failed': c.total_failed,
      'Date Created': new Date(c.created_at).toLocaleString(),
    }));
  };

  const exportCSV = () => {
    const csv = Papa.unparse(getExportData());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `email_history_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportXLSX = () => {
    const worksheet = XLSX.utils.json_to_sheet(getExportData());
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Email History');
    XLSX.writeFile(workbook, `email_history_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/email" className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase hover:text-[#6366f1] transition-colors mb-4">
            <ChevronLeft size={12} /> Back to Email Marketing
          </Link>
          <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Email Campaign History</h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">
            Monitor and audit past email broadcasts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="btn-secondary rounded-lg flex items-center gap-2 text-xs py-2.5 px-4 shadow-sm border border-[#E8E3DA] bg-white">
            <Download size={12} className="text-[#6366f1]" /> CSV Export
          </button>
          <button onClick={exportXLSX} className="btn-secondary rounded-lg flex items-center gap-2 text-xs py-2.5 px-4 shadow-sm border border-[#E8E3DA] bg-white">
            <Download size={12} className="text-[#10B981]" /> Excel Export
          </button>
        </div>
      </div>

      {/* Global Analytics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E8E3DA] rounded-xl p-5 shadow-sm">
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1 flex items-center gap-1.5">
            <Mail size={12} /> Total Sent
          </p>
          <h2 className="serif-headline text-3xl text-[#3E3B36]">{analytics.totalSent.toLocaleString()}</h2>
        </div>
        <div className="bg-white border border-[#E8E3DA] rounded-xl p-5 shadow-sm">
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-[#10B981]" /> Success Ratio
          </p>
          <h2 className="serif-headline text-3xl text-[#10B981]">{successRatio}%</h2>
        </div>
        <div className="bg-white border border-[#E8E3DA] rounded-xl p-5 shadow-sm">
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1 flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Delivered
          </p>
          <h2 className="serif-headline text-3xl text-[#3E3B36]">{analytics.totalDelivered.toLocaleString()}</h2>
        </div>
        <div className="bg-white border border-[#E8E3DA] rounded-xl p-5 shadow-sm">
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1 flex items-center gap-1.5">
            <XCircle size={12} className="text-[#ef4444]" /> Failed
          </p>
          <h2 className="serif-headline text-3xl text-[#ef4444]">{analytics.totalFailed.toLocaleString()}</h2>
        </div>
      </div>

      {/* Controls: Search, Filter, Sort */}
      <div className="bg-white border border-[#E8E3DA] rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 relative z-10 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8378]" />
          <input 
            type="text" 
            placeholder="Search campaigns by title or subject..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E8E3DA] rounded-lg focus:border-[#6366f1] outline-none text-[#3E3B36] transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-40">
            <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8378]" />
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 text-sm bg-white border border-[#E8E3DA] rounded-lg focus:border-[#6366f1] outline-none text-[#3E3B36] appearance-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <button 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F5F1EA] hover:bg-[#E8E3DA] border border-[#E8E3DA] text-[#3E3B36] text-sm rounded-lg transition-colors whitespace-nowrap"
          >
            <ArrowUpDown size={14} className="text-[#8B8378]" />
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </div>

      {/* Infinite Data Table */}
      <div className="bg-white border border-[#E8E3DA] rounded-xl overflow-hidden shadow-sm">
        {loadingDb ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-xs tracking-[0.1em] uppercase text-[#8B8378]">No email campaigns found.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-[#F5F1EA] border-b border-[#E8E3DA]">
                <tr>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">Campaign / Subject</th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">Date</th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">Tags</th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">Status</th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium text-right">Metrics</th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium text-center">View</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-[#E8E3DA]/60 last:border-0 hover:bg-[#F5F1EA]/30 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-[#3E3B36] truncate max-w-[200px]">{c.title}</p>
                      <p className="text-[11px] text-[#8B8378] truncate max-w-[200px] mt-0.5">{c.subject}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-[#8B8378]">
                        <Clock size={12} />
                        {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {c.target_tags?.map(t => (
                          <span key={t} className="bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20 text-[10px] px-2 py-0.5 rounded-md">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] px-2 py-1 uppercase tracking-widest font-semibold rounded-md ${
                        c.status === 'completed' ? 'bg-[#10B981]/10 text-[#10B981]' :
                        c.status === 'failed' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                        c.status === 'processing' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                        'bg-[#8B8378]/10 text-[#8B8378]'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="text-xs font-medium text-[#3E3B36]">{c.total_delivered.toLocaleString()} <span className="text-[#8B8378] font-normal">/ {c.total_sent.toLocaleString()} Deliv.</span></p>
                      {c.total_failed > 0 && <p className="text-[10px] text-[#ef4444] mt-0.5">{c.total_failed.toLocaleString()} failed</p>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Link href={`/dashboard/email/history/${c.id}`} className="inline-flex bg-[#F5F1EA] hover:bg-[#E8E3DA] border border-[#E8E3DA] text-[#3E3B36] text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-lg transition-colors font-medium">
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div ref={observerTarget} className="h-10 flex items-center justify-center p-4">
              {isFetchingMore && <Spinner className="w-5 h-5 border-t-[#6366f1]" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
