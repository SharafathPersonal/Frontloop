'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { Campaign, CampaignStatus } from '@/types/broadcast';
import {
  ArrowLeft, Clock, Search, Filter, ChevronDown,
  RefreshCw, Download, FileText, FileSpreadsheet, File,
  Image as ImageIcon, X,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
type SortOption = 'newest' | 'oldest' | 'recipients_desc' | 'recipients_asc';

const STATUS_FILTERS: { label: string; value: CampaignStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
  { label: 'Insufficient Credits', value: 'insufficient_credits' },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Most Recipients', value: 'recipients_desc' },
  { label: 'Fewest Recipients', value: 'recipients_asc' },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed:            { label: 'Completed',           className: 'status-pill status-completed' },
  processing:           { label: 'Processing',          className: 'status-pill status-processing' },
  pending:              { label: 'Pending',             className: 'status-pill status-pending' },
  failed:               { label: 'Failed',              className: 'status-pill status-failed' },
  insufficient_credits: { label: 'Insufficient Credits', className: 'status-pill status-insufficient_credits' },
  paused_logout:        { label: 'Paused',              className: 'status-pill status-failed' },
};

const PAGE_SIZE = 15;

function cleanFailureReason(reason?: string | null): string {
  if (!reason) return '';
  if (reason.includes('\n') || reason.includes('stack') || reason.includes('Error:') || reason.includes(' at ')) {
    const firstLine = reason.split('\n')[0].replace(/^Error:\s*/, '').trim();
    return firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine;
  }
  return reason;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function CampaignHistoryPage() {
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]   = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CampaignStatus | 'all'>('all');
  const [sortBy, setSortBy]     = useState<SortOption>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [userId, setUserId]     = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/campaigns/refresh', { method: 'POST' });
    } catch (err) {
      console.error('[Campaign History] Sync error:', err);
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('campaigns')
          .select('*')
          .eq('shop_id', user.id)
          .order('created_at', { ascending: false });
        if (data) setAllCampaigns(data as Campaign[]);
      }
    } catch (err) {
      console.error('[Campaign History] handleRefresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Data load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const fetch = async () => {
        const { data } = await supabase
          .from('campaigns')
          .select('*')
          .eq('shop_id', user.id)
          .order('created_at', { ascending: false });
        if (data) setAllCampaigns(data as Campaign[]);
      };

      await fetch();
      setLoading(false);

      channel = supabase
        .channel(`campaigns-history:${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns', filter: `shop_id=eq.${user.id}` }, fetch)
        .subscribe();
    }
    load();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  // ── Client-side filter + sort ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = allCampaigns;
    if (activeFilter !== 'all') result = result.filter(c => c.status === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) || c.message_body.toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case 'oldest':          return [...result].sort((a, b) => a.created_at.localeCompare(b.created_at));
      case 'recipients_desc': return [...result].sort((a, b) => b.total_recipients - a.total_recipients);
      case 'recipients_asc':  return [...result].sort((a, b) => a.total_recipients - b.total_recipients);
      default:                return [...result].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  }, [allCampaigns, activeFilter, searchQuery, sortBy]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    setVisibleCount(c => c + PAGE_SIZE);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { threshold: 0.1 });
    const el = observerTarget.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [loadMore]);

  // Reset pagination when filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [searchQuery, activeFilter, sortBy]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     allCampaigns.length,
    completed: allCampaigns.filter(c => c.status === 'completed').length,
    live:      allCampaigns.filter(c => c.status === 'processing').length,
  }), [allCampaigns]);

  // ── Full-dataset export helpers ───────────────────────────────────────────
  const fetchAllForExport = useCallback(async () => {
    if (!userId) return [];
    // Re-apply same filter/sort but NO pagination limit — full dataset
    let query = supabase.from('campaigns').select('*').eq('shop_id', userId);
    if (activeFilter !== 'all') query = query.eq('status', activeFilter);
    const { data } = await query.order('created_at', { ascending: sortBy === 'oldest' });
    let result = (data ?? []) as Campaign[];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.title.toLowerCase().includes(q) || c.message_body.toLowerCase().includes(q));
    }
    if (sortBy === 'recipients_desc') result.sort((a, b) => b.total_recipients - a.total_recipients);
    if (sortBy === 'recipients_asc')  result.sort((a, b) => a.total_recipients - b.total_recipients);
    return result;
  }, [userId, activeFilter, sortBy, searchQuery]);

  const toExportRows = (rows: Campaign[]) => rows.map(c => {
    const tagMatch = c.title.match(/\[Tags:\s*([^\]]+)\]/);
    return {
      'Campaign Title':    c.title.replace(/\s+\[Tags:\s*[^\]]+\]/, ''),
      'Target Tags':       tagMatch ? tagMatch[1] : '',
      'Message Body':      c.message_body,
      'Status':            c.status,
      'Total Recipients':  c.total_recipients ?? 0,
      'Sent':              c.total_sent ?? 0,
      'Delivered':         c.total_delivered ?? 0,
      'Read':              c.total_read ?? 0,
      'Failed':            c.total_failed ?? 0,
      'Created Date':      new Date(c.created_at).toLocaleString(),
    };
  });

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const rows = toExportRows(await fetchAllForExport());
      const Papa = (await import('papaparse')).default;
      const csv  = Papa.unparse(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: `Campaign_History_${new Date().toISOString().slice(0,10)}.csv` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally { setExporting(false); setExportOpen(false); }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const rows = toExportRows(await fetchAllForExport());
      const XLSX = await import('xlsx');
      const ws   = XLSX.utils.json_to_sheet(rows);
      const wb   = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Campaign History');
      XLSX.writeFile(wb, `Campaign_History_${new Date().toISOString().slice(0,10)}.xlsx`);
    } finally { setExporting(false); setExportOpen(false); }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const rows   = toExportRows(await fetchAllForExport());
      const { jsPDF } = await import('jspdf');
      const doc    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Header
      doc.setFillColor(62, 59, 54);
      doc.rect(0, 0, 297, 18, 'F');
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(11);
      doc.text('True Attendly Broadcast — Campaign History Report', 10, 12);
      doc.setFont('helvetica','normal'); doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 200, 12);

      const headers = ['Campaign Title','Status','Recipients','Sent','Delivered','Read','Failed','Created Date'];
      const colWidths = [70, 22, 22, 18, 22, 18, 18, 36];
      const colX: number[] = [];
      let cx = 10;
      colWidths.forEach(w => { colX.push(cx); cx += w; });

      let y = 28;
      // Table header
      doc.setFillColor(245, 241, 234);
      doc.rect(10, y - 5, 277, 8, 'F');
      doc.setTextColor(62,59,54); doc.setFont('helvetica','bold'); doc.setFontSize(8);
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += 6;
      doc.setFont('helvetica','normal');

      rows.forEach(r => {
        if (y > 185) { doc.addPage(); y = 15; }
        doc.setTextColor(62,59,54); doc.setFontSize(8);
        const vals = [
          String(r['Campaign Title']).substring(0,40),
          String(r['Status']),
          String(r['Total Recipients']),
          String(r['Sent']),
          String(r['Delivered']),
          String(r['Read']),
          String(r['Failed']),
          String(r['Created Date']).substring(0,20),
        ];
        vals.forEach((v, i) => doc.text(v, colX[i], y));
        doc.setDrawColor(232,227,218);
        doc.line(10, y + 2, 287, y + 2);
        y += 7;
      });

      doc.save(`Campaign_History_${new Date().toISOString().slice(0,10)}.pdf`);
    } finally { setExporting(false); setExportOpen(false); }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin" />
      </div>
    );
  }

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Sort';

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Back nav */}
      <div>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] text-[#8B8378] hover:text-[#C4A896] transition-colors uppercase mb-6"
        >
          <ArrowLeft size={12} /> Back to Campaigns Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Campaign History</h1>
            <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">
              Full audit trail of all broadcast campaigns
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center p-2.5 border border-[#E8E3DA] hover:border-[#C4A896] text-[#8B8378] hover:text-[#3E3B36] rounded-lg shadow-sm transition-all cursor-pointer bg-white disabled:opacity-50"
              title="Refresh ledger state"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>

            {/* Export dropdown */}
            <div className="relative">
              <button
                onClick={() => setExportOpen(o => !o)}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-[#E8E3DA] hover:border-[#C4A896] text-[#8B8378] hover:text-[#3E3B36] rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer bg-white disabled:opacity-50"
              >
                {exporting ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                Export Report
                <ChevronDown size={12} />
              </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-white border border-[#E8E3DA] rounded-xl shadow-xl z-20 py-1.5">
                  <button onClick={handleExportCSV} className="w-full text-left px-4 py-2.5 text-xs text-[#3E3B36] hover:bg-[#F5F1EA]/70 transition-colors flex items-center gap-2.5 cursor-pointer">
                    <FileText size={13} className="text-[#C4A896]" /> Export as CSV
                  </button>
                  <button onClick={handleExportExcel} className="w-full text-left px-4 py-2.5 text-xs text-[#3E3B36] hover:bg-[#F5F1EA]/70 transition-colors flex items-center gap-2.5 cursor-pointer">
                    <FileSpreadsheet size={13} className="text-[#10b981]" /> Export as Excel
                  </button>
                    <button onClick={handleExportPDF} className="w-full text-left px-4 py-2.5 text-xs text-[#3E3B36] hover:bg-[#F5F1EA]/70 transition-colors flex items-center gap-2.5 cursor-pointer">
                    <File size={13} className="text-[#f43f5e]" /> Download PDF
                  </button>
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Campaigns', value: stats.total },
          { label: 'Completed',       value: stats.completed },
          { label: 'Live Now',        value: stats.live, live: true },
        ].map(s => (
          <div key={s.label} className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5">
            <p className="text-[10px] tracking-[0.25em] text-[#8B8378] uppercase mb-1 flex items-center gap-1.5">
              {s.live && s.value > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#C4A896] animate-pulse" />}
              {s.label}
            </p>
            <p className="serif-headline text-2xl text-[#3E3B36]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap">

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8378]" strokeWidth={1.5} />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-editorial pl-9 w-full"
            placeholder="Search campaigns..."
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(o => !o)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E8E3DA] hover:border-[#C4A896] text-[#8B8378] hover:text-[#3E3B36] rounded-lg text-xs transition-all cursor-pointer bg-white"
            >
              {currentSortLabel} <ChevronDown size={11} />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E8E3DA] rounded-xl shadow-xl z-20 py-1.5">
                  {SORT_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => { setSortBy(o.value); setSortOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-xs transition-colors cursor-pointer ${sortBy === o.value ? 'text-[#C4A896] bg-[#F5F1EA]' : 'text-[#3E3B36] hover:bg-[#F5F1EA]/50'}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1 flex-wrap">
            <Filter size={12} className="text-[#8B8378]" strokeWidth={1.5} />
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`text-[10px] tracking-[0.1em] uppercase px-2.5 py-1.5 rounded-full border transition-colors ${
                  activeFilter === f.value
                    ? 'border-[#C4A896] text-[#C4A896] bg-[#F5F1EA]'
                    : 'border-[#E8E3DA] text-[#8B8378] hover:border-[#C4A896] hover:text-[#C4A896]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">

        {/* Header */}
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-[#E8E3DA] bg-[#F5F1EA]/40">
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Campaign</p>
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Recipients</p>
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Sent / Failed</p>
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Status</p>
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Date</p>
        </div>

        {visible.length === 0 ? (
          <div className="py-16 text-center">
            <Clock size={28} className="text-[#E8E3DA] mx-auto mb-4" strokeWidth={1} />
            <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase">No campaigns found</p>
          </div>
        ) : (
          <>
            {visible.map(c => {
              const statusCfg  = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
              const displayTitle = c.title.replace(/\s+\[Tags:\s*[^\]]+\]/, '');
              const tagMatch   = c.title.match(/\[Tags:\s*([^\]]+)\]/);
              const date = new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/campaigns/history/${c.id}`}
                  className="border-b border-[#E8E3DA] last:border-0 hover:bg-[#F5F1EA]/50 transition-colors cursor-pointer group block"
                >
                  {/* Mobile card */}
                  <div className="md:hidden p-5 flex gap-4 items-start">
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt="Flyer"
                        className="w-10 h-10 object-cover rounded-lg border border-[#E8E3DA] cursor-zoom-in shrink-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setZoomedImage(c.image_url);
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center bg-[#F5F1EA]/50 rounded-lg border border-[#E8E3DA] text-[#8B8378] shrink-0">
                        <ImageIcon size={16} strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#3E3B36] truncate group-hover:text-[#C4A896] transition-colors">{displayTitle}</p>
                          <p className="text-[10px] text-[#8B8378] mt-0.5">{date}</p>
                        </div>
                        <span className={statusCfg.className}>{statusCfg.label}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-[#3E3B36] font-medium">{(c.total_recipients ?? 0).toLocaleString()} recipients</span>
                        <span className="text-[#6366f1]">{(c.total_sent ?? 0).toLocaleString()} sent</span>
                        <span className="text-[#f43f5e]">{(c.total_failed ?? 0).toLocaleString()} failed</span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-4 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      {c.image_url ? (
                        <img
                          src={c.image_url}
                          alt="Flyer"
                          className="w-9 h-9 object-cover rounded-lg border border-[#E8E3DA] hover:border-[#C4A896] transition-all cursor-zoom-in shrink-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setZoomedImage(c.image_url);
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 flex items-center justify-center bg-[#F5F1EA]/50 rounded-lg border border-[#E8E3DA] text-[#8B8378] shrink-0">
                          <ImageIcon size={14} strokeWidth={1.5} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#3E3B36] font-medium truncate group-hover:text-[#C4A896] transition-colors">{displayTitle}</p>
                        {tagMatch && (
                          <span className="text-[9px] bg-[#F5F1EA] text-[#8B8378] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">{tagMatch[1]}</span>
                        )}
                        {c.status === 'failed' && c.failure_reason && (
                          <p className="text-[9px] text-rose-500 mt-0.5 truncate">{cleanFailureReason(c.failure_reason)}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-[#3E3B36] font-medium">{(c.total_recipients ?? 0).toLocaleString()}</span>
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <span className="text-[#6366f1]">{(c.total_sent ?? 0).toLocaleString()}</span>
                      <span className="text-[#E8E3DA]">/</span>
                      <span className="text-[#f43f5e]">{(c.total_failed ?? 0).toLocaleString()}</span>
                    </div>
                    <span className={statusCfg.className}>{statusCfg.label}</span>
                    <span className="text-xs text-[#8B8378]">{date}</span>
                  </div>
                </Link>
              );
            })}

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={observerTarget} className="py-5 text-center text-[10px] tracking-wider text-[#8B8378] uppercase flex items-center justify-center gap-2">
                <RefreshCw size={11} className="animate-spin" /> Loading more…
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase text-center">
          Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} campaigns
          {allCampaigns.length !== filtered.length && ` (${allCampaigns.length} total)`}
        </p>
      )}

      {/* Responsive Pop-up Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-12 right-0 sm:-right-12 p-2 bg-[#3E3B36] text-[#F5F1EA] hover:text-[#C4A896] rounded-full border border-[#E8E3DA]/30 shadow-lg transition-colors cursor-pointer focus:outline-none"
              title="Close modal"
            >
              <X size={20} />
            </button>
            <img
              src={zoomedImage}
              alt="Flyer Zoom View"
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg border border-[#E8E3DA]/20 shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
