'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Download, Users, Flame, Coins, QrCode, AlertCircle, CheckCircle2, ArrowRight, Search, ArrowUpDown, X, Loader2, Filter } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import Image from 'next/image';

interface ShopData {
  id: string;
  owner_phone: string;
  shop_name: string;
}

interface QRAnalytics {
  scans: number;
  credits_consumed: number;
}

interface QRLead {
  id: string;
  customer_name: string;
  whatsapp_number: string;
  tags: string[];
  created_at: string;
}

export default function QRLeadsPage() {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [latestLeads, setLatestLeads] = useState<QRLead[]>([]);
  const [todayStats, setTodayStats] = useState<QRAnalytics>({ scans: 0, credits_consumed: 0 });
  const [totalAudience, setTotalAudience] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  // Management Mode States
  const [isManageMode, setIsManageMode] = useState(false);
  const [allLeads, setAllLeads] = useState<QRLead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest'); // newest, oldest, az
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, missed

  // Infinite Scroll States
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingBatch, setIsFetchingBatch] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;

  // Refs for stable callbacks
  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(true);

  // Realtime subscription ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  // Load Initial Dashboard Data
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

        const todayStr = new Date().toISOString().split('T')[0];
        const { data: analyticsData } = await supabase
          .from('qr_analytics')
          .select('scans, credits_consumed')
          .eq('shop_id', user.id)
          .eq('scan_date', todayStr)
          .maybeSingle();

        if (analyticsData) {
          setTodayStats({
            scans: analyticsData.scans,
            credits_consumed: Number(analyticsData.credits_consumed)
          });
        }

        // Fetch Total Audience & Latest 5 Leads for Dashboard
        const { data: latestData, count } = await supabase
          .from('customers_master')
          .select('*', { count: 'exact' })
          .eq('shop_id', user.id)
          .contains('tags', ['IN_STORE_QR_LEAD'])
          .order('created_at', { ascending: false })
          .limit(5);

        if (count !== null) setTotalAudience(count);
        if (latestData) setLatestLeads(latestData);

        const channel = supabase
          .channel(`qr-leads-updates-${user.id}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'customers_master', filter: `shop_id=eq.${user.id}` },
            (payload) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const newLead = payload.new as any;
              if (newLead.tags && newLead.tags.includes('IN_STORE_QR_LEAD')) {
                setLatestLeads(prev => [newLead, ...prev].slice(0, 5));
                setTotalAudience(prev => prev + 1);
                setTodayStats(prev => ({
                  scans: prev.scans + 1,
                  credits_consumed: prev.credits_consumed + 10
                }));
                showToast('✨ New walk-in lead captured!', 'success');
              }
            }
          )
          .subscribe();
          
        channelRef.current = channel;

      } catch (err) {
        console.error('Error loading QR data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    const cleanup = loadData();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [showToast]);

  // Fetch paginated leads for Manage Mode
  const fetchLeadsBatch = useCallback(async (pageIndex: number, overrideLeads = false) => {
    if (!shop || (!hasMoreRef.current && !overrideLeads) || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setIsFetchingBatch(true);
    try {
      let query = supabase
        .from('customers_master')
        .select('*')
        .eq('shop_id', shop.id)
        .contains('tags', ['IN_STORE_QR_LEAD']);

      if (searchQuery) {
        query = query.or(`customer_name.ilike.%${searchQuery}%,whatsapp_number.ilike.%${searchQuery}%`);
      }

      if (filterStatus === 'missed') {
        query = query.contains('tags', ['MISSED_LEAD']);
      } else if (filterStatus === 'active') {
        query = query.not('tags', 'cs', '{"MISSED_LEAD"}');
      }

      if (sortOption === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortOption === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortOption === 'az') {
        query = query.order('customer_name', { ascending: true });
      }

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error } = await query.range(from, to);

      if (error) throw error;
      
      if (data) {
        if (overrideLeads) {
          setAllLeads(data);
        } else {
          setAllLeads(prev => [...prev, ...data]);
        }
        const more = data.length === PAGE_SIZE;
        setHasMore(more);
        hasMoreRef.current = more;
      }
    } catch (err) {
      console.error('Error fetching leads batch:', err);
    } finally {
      isFetchingRef.current = false;
      setIsFetchingBatch(false);
    }
  }, [shop, searchQuery, filterStatus, sortOption]);

  // Effect to refetch when filters change
  useEffect(() => {
    if (isManageMode) {
      setPage(0);
      setHasMore(true);
      hasMoreRef.current = true;
      fetchLeadsBatch(0, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManageMode, searchQuery, filterStatus, sortOption]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    if (!isManageMode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !isFetchingRef.current) {
          setPage(prev => {
            const next = prev + 1;
            fetchLeadsBatch(next);
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
  }, [isManageMode, fetchLeadsBatch]);

  const qrUrl = shop ? `https://wa.me/${shop.owner_phone.replace(/\D/g, '')}?text=${encodeURIComponent('Add me to Broadcast')}` : '';
  const qrImageSrc = shop ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&color=3E3B36` : '';

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrImageSrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_Code_${shop?.shop_name || 'Store'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('QR Code downloaded successfully', 'success');
    } catch (err) {
      showToast('Failed to download QR Code', 'error');
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin" />
      </div>
    );
  }

  if (isManageMode) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F9F7F4] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar */}
        <div className="bg-white border-b border-[#E8E3DA] px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={() => setIsManageMode(false)} className="p-2 hover:bg-[#F5F1EA] rounded-lg transition-colors text-[#8B8378]">
              <X size={20} />
            </button>
            <div>
              <h1 className="text-xl serif-headline text-[#3E3B36]">Manage QR Leads</h1>
              <p className="text-[10px] text-[#8B8378] tracking-[0.1em] uppercase">{totalAudience} Total Records</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap md:flex-nowrap">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8378]" size={16} />
              <input 
                type="text" 
                placeholder="Search name or phone..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E8E3DA] bg-[#F5F1EA]/50 text-sm focus:outline-none focus:border-[#C4A896] focus:bg-white transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2 border border-[#E8E3DA] rounded-lg p-1 bg-[#F5F1EA]/50">
              <Filter size={14} className="text-[#8B8378] ml-2" />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs font-medium text-[#3E3B36] py-1.5 pr-2 focus:outline-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active Leads</option>
                <option value="missed">Missed (Pending)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 border border-[#E8E3DA] rounded-lg p-1 bg-[#F5F1EA]/50">
              <ArrowUpDown size={14} className="text-[#8B8378] ml-2" />
              <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="bg-transparent text-xs font-medium text-[#3E3B36] py-1.5 pr-2 focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="az">A-Z Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto bg-white rounded-xl border border-[#E8E3DA] shadow-sm overflow-hidden">
             <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#F5F1EA] z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-semibold border-b border-[#E8E3DA]">Customer Details</th>
                    <th className="px-6 py-4 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-semibold border-b border-[#E8E3DA]">Phone Number</th>
                    <th className="px-6 py-4 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-semibold border-b border-[#E8E3DA]">Capture Date</th>
                    <th className="px-6 py-4 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-semibold border-b border-[#E8E3DA]">Lead Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E3DA]">
                  {allLeads.length === 0 && !isFetchingBatch ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-[#8B8378] text-sm">
                        No leads found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    allLeads.map((lead) => {
                      const isMissed = lead.tags?.includes('MISSED_LEAD');
                      return (
                        <tr key={lead.id} className="hover:bg-[#F5F1EA]/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#3E3B36] text-[#F5F1EA] flex items-center justify-center font-bold text-xs uppercase">
                                {lead.customer_name ? lead.customer_name.charAt(0) : '?'}
                              </div>
                              <span className="text-sm font-medium text-[#3E3B36]">{lead.customer_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-[#8B8378] font-mono">{lead.whatsapp_number}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-[#8B8378]">
                              {new Date(lead.created_at).toLocaleDateString(undefined, {
                                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {isMissed ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold tracking-wide">
                                <AlertCircle size={14} />
                                PENDING / MISSED
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold tracking-wide">
                                <CheckCircle2 size={14} />
                                ACTIVE
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
             </table>
             
             {/* Infinite Scroll Trigger & Loader */}
             <div ref={observerTarget} className="py-6 flex justify-center items-center h-16">
                {isFetchingBatch && (
                  <div className="flex items-center gap-2 text-[#C4A896]">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-medium uppercase tracking-wider">Loading records...</span>
                  </div>
                )}
                {!hasMore && allLeads.length > 0 && (
                  <span className="text-xs text-[#8B8378] uppercase tracking-wider">End of records</span>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl serif-headline text-[#3E3B36]">In-Store QR Leads</h1>
          <p className="text-sm text-[#8B8378] mt-1 tracking-wide">
            Turn walk-ins into loyal subscribers instantly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR Hero Section */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-8 border border-[#E8E3DA] shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-[#F5F1EA] rounded-full flex items-center justify-center mb-6">
            <QrCode className="text-[#C4A896]" size={24} />
          </div>
          <h2 className="text-xl serif-headline text-[#3E3B36] mb-2">Your Display QR</h2>
          <p className="text-xs text-[#8B8378] mb-8 leading-relaxed">
            Print and place this on your reception desk. Customers scan to get a VIP voucher and join your broadcast list.
          </p>
          
          <div className="relative w-48 h-48 bg-white p-2 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-8 border border-[#E8E3DA]">
            {qrImageSrc && (
              <Image src={qrImageSrc} alt="Store QR Code" fill className="object-contain p-2 rounded-lg" unoptimized />
            )}
          </div>
          
          <button
            onClick={handleDownloadQR}
            className="w-full flex items-center justify-center gap-2 bg-[#3E3B36] text-[#F5F1EA] py-3 rounded-lg text-xs tracking-[0.15em] uppercase hover:bg-[#2A2825] transition-colors"
          >
            <Download size={14} />
            Download for Print
          </button>
        </div>

        {/* Analytics & Leads */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-[#E8E3DA] shadow-sm hover:border-[#C4A896] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <Users size={16} className="text-blue-500" />
                </div>
                <p className="text-xs tracking-[0.15em] uppercase text-[#8B8378]">Total Leads</p>
              </div>
              <p className="text-3xl serif-headline text-[#3E3B36]">{totalAudience}</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-[#E8E3DA] shadow-sm hover:border-[#C4A896] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                  <Flame size={16} className="text-orange-500" />
                </div>
                <p className="text-xs tracking-[0.15em] uppercase text-[#8B8378]">QR Audience</p>
              </div>
              <p className="text-3xl serif-headline text-[#3E3B36]">{totalAudience}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E8E3DA] shadow-sm hover:border-[#C4A896] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                  <Coins size={16} className="text-green-500" />
                </div>
                <p className="text-xs tracking-[0.15em] uppercase text-[#8B8378]">Credits Used</p>
              </div>
              <p className="text-3xl serif-headline text-[#3E3B36]">{todayStats.credits_consumed}</p>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white rounded-2xl border border-[#E8E3DA] shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#E8E3DA] flex justify-between items-center bg-[#FAFAFA]">
              <h2 className="text-lg serif-headline text-[#3E3B36]">Latest Captured Leads</h2>
              <button 
                onClick={() => setIsManageMode(true)}
                className="group flex items-center gap-2 bg-[#F5F1EA] hover:bg-[#E8E3DA] text-[#3E3B36] px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all"
              >
                Manage Your Leads
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white">
                    <th className="px-6 py-4 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-medium border-b border-[#E8E3DA]">Customer</th>
                    <th className="px-6 py-4 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-medium border-b border-[#E8E3DA]">Phone Number</th>
                    <th className="px-6 py-4 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-medium border-b border-[#E8E3DA]">Date Joined</th>
                    <th className="px-6 py-4 text-[10px] tracking-[0.15em] uppercase text-[#8B8378] font-medium border-b border-[#E8E3DA]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E3DA] bg-white">
                  {latestLeads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-[#8B8378] text-sm">
                        No QR leads captured yet. Print your QR code to get started!
                      </td>
                    </tr>
                  ) : (
                    latestLeads.slice(0, 5).map((lead) => {
                      const isMissed = lead.tags?.includes('MISSED_LEAD');
                      return (
                        <tr key={lead.id} className="hover:bg-[#F5F1EA]/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-[#E8E3DA] text-[#3E3B36] flex items-center justify-center font-bold text-[10px] uppercase">
                                {lead.customer_name ? lead.customer_name.charAt(0) : '?'}
                              </div>
                              <span className="text-sm font-medium text-[#3E3B36]">{lead.customer_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-[#8B8378] font-mono">{lead.whatsapp_number}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-[#8B8378]">
                              {new Date(lead.created_at).toLocaleDateString(undefined, {
                                month: 'short', day: 'numeric', year: 'numeric'
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {isMissed ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-bold tracking-wide border border-red-100">
                                <AlertCircle size={12} />
                                PENDING
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold tracking-wide">
                                <CheckCircle2 size={12} />
                                ACTIVE
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
