'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Wallet } from '@/types/broadcast';
import Link from 'next/link';
import { Users, Trash2, Edit, Search, Filter, ArrowUpDown, ChevronLeft } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/Skeleton';
import CustomConfirm from '@/components/ui/CustomConfirm';

type CustomerTag = 'VIP' | 'Regular' | 'New';

interface CustomerRow {
  customer_name: string;
  whatsapp_number: string;
  tags: CustomerTag[];
}

export default function AudienceManagementPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  
  // Database states
  const [dbCustomers, setDbCustomers] = useState<CustomerRow[]>([]);
  const [totalInDB, setTotalInDB] = useState(0);
  const [loadingDb, setLoadingDb] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<CustomerTag | 'All'>('All');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Action states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerRow | null>(null);
  const [editStatus, setEditStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const observerTarget = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 50;

  const fetchDbCustomers = useCallback(async (currentPage: number, reset: boolean = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    if (reset) {
      setLoadingDb(true);
    } else {
      setIsFetchingMore(true);
    }

    let query = supabase
      .from('customers_master')
      .select('*', { count: 'exact' })
      .eq('shop_id', user.id);
      
    if (searchQuery.trim()) {
      query = query.or(`customer_name.ilike.%${searchQuery}%,whatsapp_number.ilike.%${searchQuery}%`);
    }
    
    if (filterTag !== 'All') {
      query = query.contains('tags', [filterTag]);
    }
    
    query = query.order('customer_name', { ascending: sortOrder === 'asc' });
    
    const start = currentPage * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;
    
    const { data, count } = await query.range(start, end);
    
    if (data) {
      setDbCustomers(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    
    if (count !== null) setTotalInDB(count);
    
    setLoadingDb(false);
    setIsFetchingMore(false);
  }, [searchQuery, filterTag, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchDbCustomers(0, true);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, filterTag, sortOrder, fetchDbCustomers]);

  useEffect(() => {
    async function initUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: w } = await supabase.from('wallets').select('*').eq('shop_id', user.id).maybeSingle();
      if (w) setWallet(w);
    }
    initUser();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingDb && !isFetchingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchDbCustomers(nextPage, false);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [hasMore, loadingDb, isFetchingMore, page, fetchDbCustomers]);

  const validatePhone = (num: string) => {
    return num.replace(/\D/g, '').match(/[0-9]{10}$/)?.[0] || null;
  };

  const executeDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleteConfirmOpen(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('customers_master').delete().match({ shop_id: user.id, whatsapp_number: customerToDelete });
    setCustomerToDelete(null);
    setPage(0);
    await fetchDbCustomers(0, true);
  };

  const executeClearAll = async () => {
    setIsClearConfirmOpen(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('customers_master').delete().match({ shop_id: user.id });
    setPage(0);
    await fetchDbCustomers(0, true);
  };

  const executeEdit = async () => {
    if (!editCustomer) return;
    const validPhone = validatePhone(editCustomer.whatsapp_number);
    if (!validPhone) {
      alert('Invalid phone format. Must be 10 digits.');
      return;
    }

    setEditStatus('saving');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('customers_master').upsert(
      [{ shop_id: user.id, customer_name: editCustomer.customer_name.trim(), whatsapp_number: validPhone, tags: editCustomer.tags }],
      { onConflict: 'shop_id,whatsapp_number' }
    );

    if (!error) {
      setEditStatus('saved');
      setPage(0);
      await fetchDbCustomers(0, true);
      setTimeout(() => { setEditModalOpen(false); setEditStatus('idle'); }, 1000);
    } else {
      setEditStatus('error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Navigation & Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/customers" className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase hover:text-[#3E3B36] transition-colors mb-3">
            <ChevronLeft size={12} /> Back to Upload
          </Link>
          <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Audience Registry</h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">
            Manage your synchronized contact list
          </p>
        </div>
        <div className="flex items-center gap-4 mt-8">
          {totalInDB > 0 && (
            <button 
              onClick={() => setIsClearConfirmOpen(true)}
              className="hidden md:flex items-center gap-1.5 text-xs text-[#8B8378] tracking-[0.15em] uppercase hover:text-[#3E3B36] transition-colors"
            >
              <Trash2 size={12} /> Clear Audience List
            </button>
          )}
          {wallet && (
            <div className="hidden sm:flex items-center gap-2 bg-[#FFFFFF] border border-[#E8E3DA] rounded-lg px-4 py-2.5">
              <div className="w-2 h-2 bg-[#C4A896] rounded-full" />
              <span className="text-xs tracking-[0.15em] text-[#8B8378] uppercase">{wallet.credits_remaining.toLocaleString()} Credits</span>
            </div>
          )}
        </div>
      </div>

      {/* Top Summary Metric Block */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl px-6 py-4 flex items-center gap-5 w-max">
        <div className="w-10 h-10 bg-[#F5F1EA] rounded-lg flex items-center justify-center">
          <Users size={16} className="text-[#C4A896]" />
        </div>
        <div>
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium mb-1">Total Registered Audience</p>
          <h2 className="serif-headline text-2xl text-[#3E3B36] leading-none">{totalInDB.toLocaleString()}</h2>
        </div>
      </div>

      {/* Search, Sort, and Tag Filtration Matrix */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] border-b-0 rounded-t-xl p-4 flex flex-col sm:flex-row items-center gap-3 relative z-10 mt-8">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8378]" />
          <input 
            type="text" 
            placeholder="Search by name or number..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#E8E3DA] rounded-lg focus:border-[#C4A896] outline-none text-[#3E3B36] transition-colors"
          />
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-36">
            <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8378]" />
            <select 
              value={filterTag} 
              onChange={e => setFilterTag(e.target.value as CustomerTag | 'All')}
              className="w-full pl-8 pr-4 py-2 text-sm bg-white border border-[#E8E3DA] rounded-lg focus:border-[#C4A896] outline-none text-[#3E3B36] appearance-none cursor-pointer"
            >
              <option value="All">All Tags</option>
              <option value="VIP">VIP</option>
              <option value="Regular">Regular</option>
              <option value="New">New</option>
            </select>
          </div>
          
          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#F5F1EA] hover:bg-[#E8E3DA] border border-[#E8E3DA] text-[#3E3B36] text-sm rounded-lg transition-colors whitespace-nowrap"
          >
            <ArrowUpDown size={14} className="text-[#8B8378]" />
            {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
          </button>
        </div>
      </div>

      {/* DB Data Table with Infinite Scroll */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-b-xl overflow-hidden shadow-sm">
        {loadingDb ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : dbCustomers.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[11px] tracking-[0.1em] uppercase text-[#8B8378]">No contacts match these filters.</p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto relative">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#F5F1EA] border-b border-[#E8E3DA] z-10 shadow-sm">
                <tr>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">Customer Name</th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">WhatsApp Number</th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">Tags</th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dbCustomers.map((c, i) => (
                  <tr key={i} className="border-b border-[#E8E3DA]/60 last:border-0 hover:bg-[#F5F1EA]/30 transition-colors group">
                    <td className="px-5 py-3 text-xs text-[#3E3B36]">{c.customer_name || '-'}</td>
                    <td className="px-5 py-3 text-xs text-[#8B8378] font-mono">{c.whatsapp_number}</td>
                    <td className="px-5 py-3">
                      {c.tags?.map(t => (
                        <span key={t} className="inline-block bg-[#F5F1EA] border border-[#E8E3DA] text-[#8B8378] text-[10px] px-2 py-0.5 rounded-md mr-1">{t}</span>
                      ))}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditCustomer(c); setEditModalOpen(true); }} className="text-[#8B8378] hover:text-[#3E3B36] transition-colors"><Edit size={14} /></button>
                        <button onClick={() => { setCustomerToDelete(c.whatsapp_number); setIsDeleteConfirmOpen(true); }} className="text-[#8B8378] hover:text-[#C4A896] transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Infinite Scroll Sentinel */}
            <div ref={observerTarget} className="h-10 flex items-center justify-center p-4">
              {isFetchingMore && (
                <div className="w-full space-y-3">
                  <Skeleton className="h-8 w-full rounded-md" />
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModalOpen && editCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#3E3B36]/30 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl w-full max-w-md p-6">
            <h3 className="serif-headline text-lg text-[#3E3B36] mb-4">Edit Customer Record</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Name</label>
                <input type="text" value={editCustomer.customer_name} onChange={e => setEditCustomer({...editCustomer, customer_name: e.target.value})} className="input-editorial" />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Phone Number</label>
                <input type="text" value={editCustomer.whatsapp_number} onChange={e => setEditCustomer({...editCustomer, whatsapp_number: e.target.value})} className="input-editorial" disabled />
                <p className="text-[10px] text-[#8B8378] mt-1">Primary key. Delete and re-create to change.</p>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button onClick={executeEdit} disabled={editStatus === 'saving'} className="btn-primary flex-1 rounded-lg flex items-center justify-center gap-2">
                  {editStatus === 'saving' ? <Spinner /> : 'Save Changes'}
                </button>
                <button onClick={() => setEditModalOpen(false)} className="px-5 py-3 text-xs tracking-[0.2em] uppercase text-[#8B8378] hover:text-[#3E3B36] transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirms */}
      <CustomConfirm
        isOpen={isDeleteConfirmOpen}
        title="Delete Customer Record"
        message="Are you sure you want to permanently delete this customer record from the database?"
        confirmText="DELETE RECORD"
        onConfirm={executeDelete}
        onCancel={() => { setIsDeleteConfirmOpen(false); setCustomerToDelete(null); }}
      />
      <CustomConfirm
        isOpen={isClearConfirmOpen}
        title="Clear Audience Registry"
        message="Are you absolutely sure you want to delete ALL contacts? This action cannot be undone."
        confirmText="CLEAR REGISTRY"
        onConfirm={executeClearAll}
        onCancel={() => setIsClearConfirmOpen(false)}
      />
    </div>
  );
}
