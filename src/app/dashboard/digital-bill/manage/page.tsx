'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  X, 
  Loader2, 
  Search, 
  ArrowUpDown, 
  Filter, 
  RefreshCw, 
  Grid, 
  List, 
  FileDown, 
  Clock, 
  Check, 
  ExternalLink,
  ChevronDown,
  BarChart3,
  TrendingUp,
  Eye
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ShopData {
  id: string;
  owner_phone: string;
  shop_name: string;
}

interface DigitalInvoice {
  id: string;
  shop_id: string;
  invoice_number: string;
  customer_phone: string | null;
  customer_name: string | null;
  total_amount: number;
  pdf_url: string | null;
  status: string;
  created_at: string;
}

export default function ManageDigitalLedgerPage() {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [totalAudience, setTotalAudience] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const router = useRouter();

  // State for in-app PDF preview
  const [previewInvoiceNumber, setPreviewInvoiceNumber] = useState<string | null>(null);

  // Ledger state variables
  const [allInvoices, setAllInvoices] = useState<DigitalInvoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest'); // newest, oldest, highest_amount, lowest_amount, invoice_az
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, delivered, failed
  
  // UI Display state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Compute analytics dynamically from loaded invoices list
  const analyticsData = useMemo(() => {
    let totalRevenue = 0;
    let deliveredCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    const dailyDataMap: Record<string, { rawDate: string; dateLabel: string; revenue: number; count: number }> = {};

    allInvoices.forEach(inv => {
      const amount = Number(inv.total_amount) || 0;
      totalRevenue += amount;
      
      if (inv.status === 'delivered') {
        deliveredCount += 1;
      } else if (inv.status === 'failed') {
        failedCount += 1;
      } else {
        pendingCount += 1;
      }

      // Group by YYYY-MM-DD
      const dateObj = new Date(inv.created_at);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const dateLabel = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

      if (!dailyDataMap[dateKey]) {
        dailyDataMap[dateKey] = { rawDate: dateKey, dateLabel, revenue: 0, count: 0 };
      }
      dailyDataMap[dateKey].revenue += amount;
      dailyDataMap[dateKey].count += 1;
    });

    const dailyTrends = Object.values(dailyDataMap)
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
      .map(item => ({
        date: item.dateLabel,
        Revenue: Number(item.revenue.toFixed(2)),
        Invoices: item.count
      }));

    const deliveryRate = allInvoices.length > 0 ? Math.round((deliveredCount / allInvoices.length) * 100) : 0;

    return {
      totalRevenue,
      deliveredCount,
      pendingCount,
      failedCount,
      deliveryRate,
      dailyTrends
    };
  }, [allInvoices]);

  // Infinite Scroll States
  const [, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingBatch, setIsFetchingBatch] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;

  // Refs for stable callbacks
  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(true);

  // Load Shop Profile
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: shopData } = await supabase
          .from('shops')
          .select('id, owner_phone, shop_name')
          .eq('id', user.id)
          .single();

        if (shopData) setShop(shopData);

        const { count } = await supabase
          .from('digital_invoices')
          .select('*', { count: 'exact', head: true })
          .eq('shop_id', user.id);

        if (count !== null) setTotalAudience(count);
      } catch (err) {
        console.error('Error loading shop profile:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch Invoices Batch
  const fetchInvoicesBatch = useCallback(async (pageIndex: number, overrideLeads = false) => {
    if (!shop || (!hasMoreRef.current && !overrideLeads) || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setIsFetchingBatch(true);
    try {
      let query = supabase
        .from('digital_invoices')
        .select('*')
        .eq('shop_id', shop.id);

      if (searchQuery) {
        query = query.or(`invoice_number.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%,customer_phone.ilike.%${searchQuery}%`);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (sortOption === 'newest') {
        query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
      } else if (sortOption === 'oldest') {
        query = query.order('created_at', { ascending: true }).order('id', { ascending: true });
      } else if (sortOption === 'highest_amount') {
        query = query.order('total_amount', { ascending: false }).order('id', { ascending: false });
      } else if (sortOption === 'lowest_amount') {
        query = query.order('total_amount', { ascending: true }).order('id', { ascending: true });
      } else if (sortOption === 'invoice_az') {
        query = query.order('invoice_number', { ascending: true }).order('id', { ascending: true });
      }

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error } = await query.range(from, to);

      if (error) throw error;
      
      if (data) {
        if (overrideLeads) {
          setAllInvoices(data);
        } else {
          setAllInvoices(prev => [...prev, ...data]);
        }
        const more = data.length === PAGE_SIZE;
        setHasMore(more);
        hasMoreRef.current = more;
      }
    } catch (err) {
      console.error('Error fetching invoices batch:', err);
    } finally {
      isFetchingRef.current = false;
      setIsFetchingBatch(false);
    }
  }, [shop, searchQuery, filterStatus, sortOption]);

  // Trigger fetch when parameters or filters change
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    hasMoreRef.current = true;
    fetchInvoicesBatch(0, true);
  }, [shop, searchQuery, filterStatus, sortOption, fetchInvoicesBatch]);

  // Setup Infinite Scroll Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !isFetchingRef.current) {
          setPage(prev => {
            const next = prev + 1;
            fetchInvoicesBatch(next);
            return next;
          });
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [fetchInvoicesBatch]);

  // Click outside to close export menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dual-mode Exports
  const handleExportCSV = () => {
    try {
      const exportData = allInvoices.map(inv => ({
        'Invoice Number': inv.invoice_number,
        'Customer Name': inv.customer_name || '—',
        'Customer Phone': inv.customer_phone || '—',
        'Total Amount (INR)': inv.total_amount,
        'PDF URL': inv.pdf_url || '—',
        'Status': inv.status,
        'Created At': new Date(inv.created_at).toLocaleString()
      }));

      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `digital_ledger_${shop?.shop_name.replace(/\s+/g, '_') || 'store'}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Ledger successfully exported to CSV!', 'success');
      setShowExportDropdown(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to export CSV', 'error');
    }
  };

  const handleExportExcel = () => {
    try {
      const exportData = allInvoices.map(inv => ({
        'Invoice Number': inv.invoice_number,
        'Customer Name': inv.customer_name || '—',
        'Customer Phone': inv.customer_phone || '—',
        'Total Amount (INR)': inv.total_amount,
        'PDF URL': inv.pdf_url || '—',
        'Status': inv.status,
        'Created At': new Date(inv.created_at).toLocaleString()
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Digital Ledger');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `digital_ledger_${shop?.shop_name.replace(/\s+/g, '_') || 'store'}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Ledger successfully exported to Excel!', 'success');
      setShowExportDropdown(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to export Excel', 'error');
    }
  };

  // Mask Customer Mobile
  const maskPhoneNumber = (phone: string | null) => {
    if (!phone) return '—';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ••••${cleaned.slice(-1)}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+91 ${cleaned.slice(2, 7)} ••••${cleaned.slice(-1)}`;
    } else if (cleaned.length > 5) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ••••${cleaned.slice(-1)}`;
    }
    return phone;
  };

  // Proximity relative time parser
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-[#F5F1EA]">
        <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F1EA] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* Top Control Bar */}
      <div className="bg-white border-b border-[#E8E3DA] px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={() => router.push('/dashboard/digital-bill')} 
            className="p-2 hover:bg-[#F5F1EA] rounded-lg transition-colors text-[#8B8378]"
          >
            <X size={20} />
          </button>
          <div>
            <h1 className="text-xl serif-headline text-[#3E3B36]">Digital Transaction Ledger</h1>
            <p className="text-[10px] text-[#8B8378] tracking-[0.1em] uppercase">{totalAudience} Total Bills</p>
          </div>
          
          <div className="ml-4 flex items-center gap-2 relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="btn-primary rounded-lg !py-2 !px-4 flex items-center gap-2 group text-xs uppercase tracking-wider font-bold"
            >
              <FileDown size={14} className="text-[#C4A896]" />
              Export Ledger
              <ChevronDown size={14} className="opacity-60 transition-transform group-hover:translate-y-0.5" />
            </button>
            
            {showExportDropdown && (
              <div className="absolute top-full left-0 mt-1.5 w-44 bg-white border border-[#E8E3DA] rounded-xl shadow-xl z-30 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-[#3E3B36] hover:bg-[#F5F1EA] transition-colors"
                >
                  Export as CSV (.csv)
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-[#3E3B36] hover:bg-[#F5F1EA] transition-colors"
                >
                  Export as Excel (.xlsx)
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setAllInvoices([]);
                setPage(0);
                setHasMore(true);
                hasMoreRef.current = true;
                fetchInvoicesBatch(0, true);
              }}
              className="p-2 hover:bg-[#F5F1EA] rounded-lg transition-colors border border-[#E8E3DA] bg-white group"
              title="Refresh Ledger"
            >
              <RefreshCw size={16} className={`text-[#8B8378] group-hover:text-[#3E3B36] ${isFetchingBatch ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Search, Sorting, Filtering */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap md:flex-nowrap">
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8378]" size={16} />
            <input 
              type="text" 
              placeholder="Search invoice, name, phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E8E3DA] bg-white text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896] transition-all placeholder:text-[#8B8378]"
            />
          </div>
          
          <div className="flex items-center gap-2 border border-[#E8E3DA] rounded-lg p-1 bg-white">
            <Filter size={14} className="text-[#8B8378] ml-2" />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs font-medium text-[#3E3B36] py-1.5 pr-2 focus:outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 border border-[#E8E3DA] rounded-lg p-1 bg-white">
            <ArrowUpDown size={14} className="text-[#8B8378] ml-2" />
            <select 
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-transparent text-xs font-medium text-[#3E3B36] py-1.5 pr-2 focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_amount">Highest Value</option>
              <option value="lowest_amount">Lowest Value</option>
              <option value="invoice_az">Invoice # (A-Z)</option>
            </select>
          </div>

          <div className="flex border border-[#E8E3DA] rounded-lg p-0.5 bg-white shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#F5F1EA] text-[#3E3B36]' : 'text-[#8B8378] hover:text-[#3E3B36]'}`}
              title="List View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[#F5F1EA] text-[#3E3B36]' : 'text-[#8B8378] hover:text-[#3E3B36]'}`}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
          </div>

        </div>
      </div>

      {/* Top Totals & Analytics Strip */}
      <div className="bg-white border-b border-[#E8E3DA] px-6 py-3 flex flex-wrap items-center justify-between gap-6 shrink-0 z-10">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-xs">
            <span className="text-[#8B8378] uppercase tracking-wider block text-[9px] font-bold">Total Invoices</span>
            <span className="text-sm font-bold text-[#3E3B36]">{totalAudience}</span>
          </div>
          <div className="text-xs">
            <span className="text-[#8B8378] uppercase tracking-wider block text-[9px] font-bold">Total Revenue</span>
            <span className="text-sm font-bold text-emerald-600">₹{analyticsData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="text-xs">
            <span className="text-[#8B8378] uppercase tracking-wider block text-[9px] font-bold">Delivery Rate</span>
            <span className="text-sm font-bold text-blue-600">{analyticsData.deliveryRate}%</span>
          </div>
          <div className="text-xs">
            <span className="text-[#8B8378] uppercase tracking-wider block text-[9px] font-bold">Delivered / Pending / Failed</span>
            <span className="text-sm font-bold text-[#3E3B36]">
              <span className="text-emerald-600">{analyticsData.deliveredCount}</span>
              <span className="text-[#8B8378]"> / </span>
              <span className="text-amber-500">{analyticsData.pendingCount}</span>
              <span className="text-[#8B8378]"> / </span>
              <span className="text-rose-500">{analyticsData.failedCount}</span>
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs uppercase tracking-wider font-bold transition-all ${
            showAnalytics 
              ? 'bg-[#3E3B36] text-[#F5F1EA] border-[#3E3B36]' 
              : 'bg-white hover:bg-[#F5F1EA] text-[#3E3B36] border-[#E8E3DA]'
          }`}
        >
          <BarChart3 size={14} className={showAnalytics ? 'text-[#C4A896]' : 'text-[#8B8378]'} />
          {showAnalytics ? 'Hide Analytics' : 'View Analytics'}
        </button>
      </div>

      {showAnalytics && (
        <div className="bg-white border-b border-[#E8E3DA] px-6 py-6 shrink-0 z-10 animate-in slide-in-from-top duration-300">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Revenue Trend */}
            <div className="lg:col-span-2 bg-[#F9F7F4] border border-[#E8E3DA] rounded-2xl p-5">
              <h3 className="text-xs font-bold tracking-widest uppercase text-[#8B8378] mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-[#C4A896]" /> Daily Sales &amp; Revenue Trend
              </h3>
              <div className="h-[200px] w-full">
                {analyticsData.dailyTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.dailyTrends} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E3DA" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#8B8378' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#8B8378' }} />
                      <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} contentStyle={{ borderRadius: '8px', border: '1px solid #E8E3DA', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="Revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[#8B8378] uppercase tracking-widest">No Sales Data</div>
                )}
              </div>
            </div>

            {/* Chart 2: Invoice Distribution */}
            <div className="bg-[#F9F7F4] border border-[#E8E3DA] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#8B8378] mb-4 flex items-center gap-2">
                  <BarChart3 size={14} className="text-[#C4A896]" /> Invoice Volume Trend
                </h3>
                <div className="h-[140px] w-full">
                  {analyticsData.dailyTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.dailyTrends} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E3DA" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#8B8378' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#8B8378' }} />
                        <Tooltip formatter={(value) => [value, 'Invoices']} contentStyle={{ borderRadius: '8px', border: '1px solid #E8E3DA', fontSize: '11px' }} />
                        <Bar dataKey="Invoices" fill="#C4A896" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#8B8378] uppercase tracking-widest">No Volume Data</div>
                  )}
                </div>
              </div>
              <div className="pt-4 border-t border-[#E8E3DA] flex items-center justify-between text-[11px] text-[#8B8378]">
                <span>Delivered: <strong className="text-emerald-600">{analyticsData.deliveredCount}</strong></span>
                <span>Pending: <strong className="text-amber-500">{analyticsData.pendingCount}</strong></span>
                <span>Failed: <strong className="text-rose-500">{analyticsData.failedCount}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Ledger Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          {viewMode === 'list' ? (
            /* Premium List View */
            <div className="bg-white rounded-3xl border border-[#E8E3DA] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                {/* Desktop Table View */}
                <table className="hidden lg:table w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#F9F7F4] z-10 border-b border-[#E8E3DA]">
                    <tr>
                      <th className="px-6 py-5 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-bold">Invoice ID</th>
                      <th className="px-6 py-5 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-bold">Customer Details</th>
                      <th className="px-6 py-5 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-bold">Mobile Connection</th>
                      <th className="px-6 py-5 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-bold">Bill Value</th>
                      <th className="px-6 py-5 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-bold">Time Proximity</th>
                      <th className="px-6 py-5 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-bold">Status</th>
                      <th className="px-6 py-5 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-bold text-center">Invoice PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E3DA]">
                    {allInvoices.length === 0 && !isFetchingBatch ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center text-[#8B8378] text-sm">
                          No digital transactions found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      allInvoices.map((inv) => {
                        return (
                          <tr key={inv.id} className="hover:bg-[#F5F1EA]/30 transition-colors group">
                            <td className="px-6 py-5">
                              <span className="inline-block px-3 py-1.5 bg-[#1E1B18] text-[#F5F1EA] rounded-md font-mono text-xs font-bold shadow-sm">
                                #{inv.invoice_number}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-sm font-bold text-[#3E3B36]">{inv.customer_name || 'Valued Customer'}</span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-sm text-[#8B8378] font-mono font-medium tracking-wide">
                                {maskPhoneNumber(inv.customer_phone)}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold font-mono">
                                ₹{Number(inv.total_amount).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-xs text-[#8B8378] font-medium tracking-wide flex items-center gap-1.5">
                                <Clock size={12} className="text-[#C4A896]" />
                                {formatRelativeTime(inv.created_at)}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              {inv.status === 'delivered' ? (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold tracking-wide uppercase">
                                  <Check size={12} className="text-emerald-500" />
                                  Delivered
                                </div>
                              ) : inv.status === 'failed' ? (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-100 text-[10px] font-bold tracking-wide uppercase">
                                  Failed
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold tracking-wide uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  Pending
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-5 text-center">
                              {inv.pdf_url ? (
                                <button
                                  onClick={() => setPreviewInvoiceNumber(inv.invoice_number)}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E3DA] hover:bg-[#F5F1EA] text-xs font-semibold text-[#3E3B36] transition-colors"
                                  title="View Invoice PDF"
                                >
                                  <Eye size={14} className="text-[#C4A896]" />
                                  <span>View PDF</span>
                                </button>
                              ) : (
                                <span className="text-xs text-[#8B8378]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Mobile Stacked Card View */}
                <div className="block lg:hidden space-y-4 p-4">
                  {allInvoices.length === 0 && !isFetchingBatch ? (
                    <div className="py-12 text-center bg-white border border-[#E8E3DA] rounded-xl text-sm text-[#8B8378]">
                      No digital transactions found matching your criteria.
                    </div>
                  ) : (
                    allInvoices.map((inv) => (
                      <div key={inv.id} className="bg-white border border-[#E8E3DA] rounded-xl p-5 shadow-sm space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[9px] tracking-[0.2em] text-[#8B8378] uppercase">Invoice ID</p>
                            <span className="inline-block px-2.5 py-1 bg-[#1E1B18] text-[#F5F1EA] rounded font-mono text-xs font-bold shadow-sm mt-1">
                              #{inv.invoice_number}
                            </span>
                          </div>
                          <div>
                            {inv.status === 'delivered' ? (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold tracking-wide uppercase">
                                <Check size={11} className="text-emerald-500" />
                                Delivered
                              </div>
                            ) : inv.status === 'failed' ? (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 text-red-700 border border-red-100 text-[9px] font-bold tracking-wide uppercase">
                                Failed
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold tracking-wide uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                Pending
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-b border-[#E8E3DA]/30 py-2.5 space-y-1.5 text-xs text-[#8B8378]">
                          <div className="flex justify-between items-center py-0.5">
                            <span>Customer Name:</span>
                            <span className="font-bold text-[#3E3B36]">{inv.customer_name || 'Valued Customer'}</span>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span>Mobile Connection:</span>
                            <span className="font-mono text-[#3E3B36]">{maskPhoneNumber(inv.customer_phone)}</span>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span>Bill Value:</span>
                            <span className="font-bold text-emerald-600 font-mono">₹{Number(inv.total_amount).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span>Time Proximity:</span>
                            <span className="text-[#3E3B36] flex items-center gap-1">
                              <Clock size={11} className="text-[#C4A896]" />
                              {formatRelativeTime(inv.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-end items-center gap-3">
                          {inv.pdf_url ? (
                            <button
                              onClick={() => setPreviewInvoiceNumber(inv.invoice_number)}
                              className="min-h-[44px] px-4 flex items-center justify-center gap-1.5 rounded-lg border border-[#E8E3DA] hover:bg-[#F5F1EA] text-xs font-semibold text-[#3E3B36] transition-colors"
                              title="View Invoice PDF"
                            >
                              <Eye size={14} className="text-[#C4A896]" />
                              <span>View PDF</span>
                            </button>
                          ) : (
                            <span className="text-xs text-[#8B8378]">—</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="bg-[#F9F7F4] border-t border-[#E8E3DA] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#8B8378] font-medium">
                  Showing {allInvoices.length} of {totalAudience} transactions
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#3E3B36] font-bold uppercase tracking-wider">Export Ledger:</span>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E3DA] hover:bg-[#F5F1EA] bg-white text-xs font-semibold text-[#3E3B36] transition-colors"
                  >
                    <FileDown size={14} className="text-[#C4A896]" /> CSV (.csv)
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E3DA] hover:bg-[#F5F1EA] bg-white text-xs font-semibold text-[#3E3B36] transition-colors"
                  >
                    <FileDown size={14} className="text-[#C4A896]" /> Excel (.xlsx)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Premium Grid View */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allInvoices.length === 0 && !isFetchingBatch ? (
                  <div className="col-span-full bg-white rounded-3xl border border-[#E8E3DA] p-12 text-center text-[#8B8378] text-sm">
                    No digital transactions found matching your criteria.
                  </div>
                ) : (
                  allInvoices.map((inv) => {
                    return (
                      <div 
                        key={inv.id} 
                        className="bg-white rounded-3xl border border-[#E8E3DA] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group"
                      >
                        <div className="flex justify-between items-start gap-4 mb-4">
                          <span className="inline-block px-3 py-1 bg-[#1E1B18] text-[#F5F1EA] rounded-md font-mono text-xs font-bold shadow-sm">
                            #{inv.invoice_number}
                          </span>
                          
                          {inv.status === 'delivered' ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold tracking-wide uppercase">
                              <Check size={12} className="text-emerald-500" />
                              Delivered
                            </div>
                          ) : inv.status === 'failed' ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-100 text-[10px] font-bold tracking-wide uppercase">
                              Failed
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold tracking-wide uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Pending
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 mb-6">
                          <h3 className="text-base font-bold text-[#3E3B36]">{inv.customer_name || 'Valued Customer'}</h3>
                          <p className="text-xs text-[#8B8378] font-mono tracking-wide">{maskPhoneNumber(inv.customer_phone)}</p>
                        </div>

                        <div className="border-t border-[#E8E3DA] pt-4 flex justify-between items-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold font-mono">
                            ₹{Number(inv.total_amount).toFixed(2)}
                          </span>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-[#8B8378] font-medium tracking-wide flex items-center gap-1">
                              <Clock size={10} className="text-[#C4A896]" />
                              {formatRelativeTime(inv.created_at)}
                            </span>
                            
                            {inv.pdf_url && (
                              <button
                                onClick={() => setPreviewInvoiceNumber(inv.invoice_number)}
                                className="p-1.5 rounded-lg border border-[#E8E3DA] hover:bg-[#F5F1EA] text-[#8B8378] hover:text-[#3E3B36] transition-colors"
                                title="Open PDF Invoice"
                              >
                                <Eye size={12} className="text-[#C4A896]" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {allInvoices.length > 0 && (
                <div className="bg-white rounded-3xl border border-[#E8E3DA] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div className="text-xs text-[#8B8378] font-medium">
                    Showing {allInvoices.length} of {totalAudience} transactions
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#3E3B36] font-bold uppercase tracking-wider">Export Ledger:</span>
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E3DA] hover:bg-[#F5F1EA] bg-white text-xs font-semibold text-[#3E3B36] transition-colors"
                    >
                      <FileDown size={14} className="text-[#C4A896]" /> CSV (.csv)
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E3DA] hover:bg-[#F5F1EA] bg-white text-xs font-semibold text-[#3E3B36] transition-colors"
                    >
                      <FileDown size={14} className="text-[#C4A896]" /> Excel (.xlsx)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Infinite Scroll Trigger & Loader */}
          <div ref={observerTarget} className="py-8 flex justify-center items-center h-16 bg-transparent">
            {isFetchingBatch && (
              <div className="flex items-center gap-2 text-[#C4A896]">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#8B8378]">Loading ledger data...</span>
              </div>
            )}
            {!hasMore && allInvoices.length > 0 && (
              <span className="text-xs text-[#8B8378] uppercase tracking-wider font-semibold">End of transactions ledger</span>
            )}
          </div>

        </div>
      </div>

      {/* NATIVE IN-APP PDF VIEWER OVERLAY */}
      <PdfPreviewModal
        invoiceNumber={previewInvoiceNumber}
        onClose={() => setPreviewInvoiceNumber(null)}
      />

    </div>
  );
}
