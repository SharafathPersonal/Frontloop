'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Download, AlertCircle, CheckCircle2, Search, ArrowUpDown, X, Loader2, Filter, Zap } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

interface ShopData {
  id: string;
  owner_phone: string;
  shop_name: string;
}

interface QRLead {
  id: string;
  customer_name: string;
  whatsapp_number: string;
  tags: string[];
  created_at: string;
  serial_number: number;
  is_exported_to_vcf: boolean;
  is_saved_to_phone?: boolean;
}

export default function ManageQRLeadsPage() {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [totalAudience, setTotalAudience] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const router = useRouter();

  // Management Mode States
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

  const [syncedCount, setSyncedCount] = useState(0);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Refs for stable callbacks
  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(true);

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
          .from('customers_master')
          .select('*', { count: 'exact', head: true })
          .eq('shop_id', user.id)
          .contains('tags', ['IN_STORE_QR_LEAD']);

        if (count !== null) setTotalAudience(count);
      } catch (err) {
        console.error('Error loading shop data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

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

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    hasMoreRef.current = true;
    fetchLeadsBatch(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop, searchQuery, filterStatus, sortOption]);

  useEffect(() => {
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
  }, [fetchLeadsBatch]);

  const handleBulkSync = async () => {
    setIsSyncing(true);
    try {
      const unsavedLeads = allLeads.filter(lead => !lead.is_saved_to_phone);
      if (unsavedLeads.length === 0) {
        showToast('No new leads to sync', 'info');
        setIsSyncing(false);
        setShowSyncModal(false);
        return;
      }

      let vcardContent = '';
      unsavedLeads.forEach((lead, index) => {
        const phone = lead.whatsapp_number.replace('@s.whatsapp.net', '');
        vcardContent += `BEGIN:VCARD\nVERSION:3.0\nFN:C${index + 1} - ${lead.customer_name || 'Customer'}\nTEL;TYPE=CELL:+${phone}\nEND:VCARD\n`;
      });

      const blob = new Blob([vcardContent], { type: 'text/vcard' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'attendly_new_leads.vcf';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      const unsavedIds = unsavedLeads.map(l => l.id);
      
      const { error } = await supabase
        .from('customers_master')
        .update({ is_saved_to_phone: true })
        .in('id', unsavedIds);

      if (error) throw error;

      setAllLeads(prev => prev.map(lead => unsavedIds.includes(lead.id) ? { ...lead, is_saved_to_phone: true } : lead));
      setSyncedCount(prev => prev + unsavedIds.length);
      showToast(`Successfully synced ${unsavedIds.length} contacts!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error syncing contacts', 'error');
    } finally {
      setIsSyncing(false);
      setShowSyncModal(false);
    }
  };

  const toggleAddedToBroadcast = async (leadId: string, currentState: boolean) => {
    try {
      const newState = !currentState;
      setAllLeads(prev => prev.map(lead => lead.id === leadId ? { ...lead, is_saved_to_phone: newState } : lead));
      setSyncedCount(prev => prev + (newState ? 1 : -1));

      const { error } = await supabase
        .from('customers_master')
        .update({ is_saved_to_phone: newState })
        .eq('id', leadId);

      if (error) throw error;
      showToast(newState ? 'Marked as saved to phone' : 'Marked as pending sync', 'success');
    } catch (err) {
      console.error(err);
      setAllLeads(prev => prev.map(lead => lead.id === leadId ? { ...lead, is_saved_to_phone: currentState } : lead));
      setSyncedCount(prev => prev + (currentState ? 1 : -1));
      showToast('Failed to update status', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-[#111827]">
        <div className="w-8 h-8 border-2 border-neutral-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const unsavedCount = allLeads.filter(l => !l.is_saved_to_phone).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#111827] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Top Control Bar */}
      <div className="bg-[#1f2937] border-b border-neutral-800 px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={() => router.push('/dashboard/qr-leads')} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400">
            <X size={20} />
          </button>
          <div>
            <h1 className="text-xl serif-headline text-white">Manage QR Leads</h1>
            <p className="text-[10px] text-neutral-400 tracking-[0.1em] uppercase">{totalAudience} Total Records</p>
          </div>
          
          <button
            onClick={() => setShowSyncModal(true)}
            className="ml-4 flex items-center gap-2 bg-[#10B981] text-white px-4 py-2 rounded-lg text-xs tracking-wide font-bold shadow-sm hover:bg-[#059669] transition-all group"
          >
            <Zap size={16} className="text-emerald-100 group-hover:scale-110 transition-transform" />
            ⚡ Save New Contacts to Phone
            {unsavedCount > 0 && (
              <span className="ml-1 bg-white text-[#10B981] px-1.5 py-0.5 rounded-full text-[10px] font-black">{unsavedCount}</span>
            )}
          </button>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap md:flex-nowrap">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text" 
              placeholder="Search name or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-sm text-white focus:outline-none focus:border-neutral-500 transition-all placeholder:text-neutral-500"
            />
          </div>
          
          <div className="flex items-center gap-2 border border-neutral-700 rounded-lg p-1 bg-neutral-800">
            <Filter size={14} className="text-neutral-400 ml-2" />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs font-medium text-white py-1.5 pr-2 focus:outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Leads</option>
              <option value="missed">Missed (Pending)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 border border-neutral-700 rounded-lg p-1 bg-neutral-800">
            <ArrowUpDown size={14} className="text-neutral-400 ml-2" />
            <select 
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-transparent text-xs font-medium text-white py-1.5 pr-2 focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="az">A-Z Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scrollable Table Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto bg-[#1f2937] rounded-[1.5rem] border border-neutral-800 shadow-2xl overflow-hidden">
           <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#111827] z-10 shadow-sm border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-5 text-[10px] tracking-[0.15em] uppercase text-neutral-400 font-semibold border-b border-neutral-800">Broadcast ID</th>
                  <th className="px-6 py-5 text-[10px] tracking-[0.15em] uppercase text-neutral-400 font-semibold border-b border-neutral-800">Customer Details</th>
                  <th className="px-6 py-5 text-[10px] tracking-[0.15em] uppercase text-neutral-400 font-semibold border-b border-neutral-800">Capture Date</th>
                  <th className="px-6 py-5 text-[10px] tracking-[0.15em] uppercase text-neutral-400 font-semibold border-b border-neutral-800">Sync Status</th>
                  <th className="px-6 py-5 text-[10px] tracking-[0.15em] uppercase text-neutral-400 font-semibold border-b border-neutral-800">Added to Broadcast</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {allLeads.length === 0 && !isFetchingBatch ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 text-sm">
                      No leads found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  allLeads.map((lead) => {
                    return (
                      <tr key={lead.id} className="hover:bg-neutral-800/50 transition-colors">
                        <td className="px-6 py-5">
                          <span className="text-sm font-bold text-neutral-300">C-</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">{lead.customer_name}</span>
                            <span className="text-xs text-neutral-400 font-mono">{lead.whatsapp_number}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm text-neutral-400">
                            {new Date(lead.created_at).toLocaleDateString(undefined, {
                              month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          {lead.is_saved_to_phone ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold tracking-wide shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                              <CheckCircle2 size={12} className="text-emerald-400" />
                              ✓ Synced to Phone
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold tracking-wide">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                              Pending Sync
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={lead.is_saved_to_phone || false}
                                onChange={() => toggleAddedToBroadcast(lead.id, lead.is_saved_to_phone || false)}
                              />
                              <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
           </table>
           
           {/* Infinite Scroll Trigger & Loader */}
           <div ref={observerTarget} className="py-6 flex justify-center items-center h-16 bg-[#111827] border-t border-neutral-800">
              {isFetchingBatch && (
                <div className="flex items-center gap-2 text-emerald-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs font-medium uppercase tracking-wider">Loading records...</span>
                </div>
              )}
              {!hasMore && allLeads.length > 0 && (
                <span className="text-xs text-neutral-500 uppercase tracking-wider">End of records</span>
              )}
           </div>
        </div>
      </div>

      {/* Pre-Confirmation Firewall Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1f2937] border border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
              <AlertCircle className="text-emerald-400" size={24} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Sync Contacts to Device Mobile Phone?</h2>
            <p className="text-sm text-neutral-300 leading-relaxed mb-6">
              If you are opening this website on your mobile phone, this action will download a secure smart contact file. Opening the file will automatically batch-save all new customer contacts as C1, C2, C3 directly into your native phone book. This seamlessly whitelists your number on their device for your upcoming broadcast campaigns. Do you wish to proceed?
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
                disabled={isSyncing}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSync}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex items-center gap-2"
                disabled={isSyncing}
              >
                {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Proceed &amp; Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
