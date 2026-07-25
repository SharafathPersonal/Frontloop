'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Trash2,
  CheckCircle,
  Pencil,
  ShieldAlert,
  Package,
  ArrowUpDown,
  Loader2,
  X,
  Sparkles,
  Eye,
  MessageCircle,
  QrCode,
  IndianRupee,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import {
  getDashboardInventory,
  toggleProductClearedStatus,
  deleteProduct,
  bulkToggleProductClearedStatus,
  getMerchantPerformanceMetrics,
} from './actions';
import Link from 'next/link';
import Image from 'next/image';
import BackButton from '@/components/ui/BackButton';
import CustomConfirm from '@/components/ui/CustomConfirm';
import { useToast } from '@/contexts/ToastContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'live' | 'cleared';
type SortOrder = 'desc' | 'asc';

const LIMIT = 30;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardClient() {
  const { showToast } = useToast();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const [shopId, setShopId] = useState<string | null>(null);

  // ── Inventory + pagination ──────────────────────────────────────────────────
  const [inventory, setInventory] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const isFirstPageRef = useRef(true);

  // ── Merchant Metrics ────────────────────────────────────────────────────────
  const [metrics, setMetrics] = useState({
    totalViews: 0,
    whatsappInquiries: 0,
    qrScans: 0,
    capitalRecovered: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(true);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // ── Bulk Selection ──────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // ── Confirm Modal ───────────────────────────────────────────────────────────
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    onConfirm: () => {},
  });

  // ── AI Status Copy Generator Modal ──────────────────────────────────────────
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedProductForAi, setSelectedProductForAi] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOptions, setAiOptions] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // ── Infinite scroll sentinel ─────────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Resolve authenticated shop ID once
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setShopId(user.id);
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch merchant performance ROI metrics
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!shopId) return;
    setMetricsLoading(true);
    getMerchantPerformanceMetrics(shopId).then((res) => {
      setMetrics(res);
      setMetricsLoading(false);
    });
  }, [shopId, inventory]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 300 ms debounce on search input
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Reset to page 1 when filters change — mark as first page
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    isFirstPageRef.current = true;
    setPage(1);
    setSelectedIds([]);
  }, [debouncedSearch, statusFilter, sortOrder]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Server-side fetch — only runs when shopId is resolved
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!shopId) return;

    let cancelled = false;
    const isFirstPage = isFirstPageRef.current;

    async function fetchInventory() {
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);

      const result = await getDashboardInventory(shopId!, {
        searchQuery: debouncedSearch,
        statusFilter,
        sortOrder,
        page,
        limit: LIMIT,
      });

      if (!cancelled) {
        if (isFirstPage) {
          setInventory(result.products);
          isFirstPageRef.current = false;
        } else {
          setInventory((prev) => [...prev, ...result.products]);
        }
        setHasMore(result.hasMore);
        setTotalCount(result.totalCount);
        setLoading(false);
        setLoadingMore(false);
      }
    }

    fetchInventory();
    return () => { cancelled = true; };
  }, [shopId, page, debouncedSearch, statusFilter, sortOrder]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Infinite scroll observer
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading]);

  // ─────────────────────────────────────────────────────────────────────────────
  // AI Status Generator Handler
  // ─────────────────────────────────────────────────────────────────────────────
  const openAiGenerator = async (product?: any) => {
    const targetProduct = product || inventory[0];
    if (!targetProduct) {
      showToast('No items available to generate status copy.', 'error');
      return;
    }
    setSelectedProductForAi(targetProduct);
    setAiModalOpen(true);
    setAiLoading(true);
    setAiOptions([]);

    try {
      const res = await fetch('/api/ai/status-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: targetProduct.product_name,
          category: targetProduct.category,
          original_price: targetProduct.original_price,
          clearance_price: targetProduct.clearance_price,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate status copy');
      if (data.options) {
        setAiOptions(data.options);
      }
    } catch (err: any) {
      showToast(err.message || 'Error generating AI copy', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const shareToWhatsApp = (text: string) => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Mutations — optimistic UI with rollback
  // ─────────────────────────────────────────────────────────────────────────────

  const confirmToggleCleared = (productId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const actionName = newStatus ? 'CLEARED' : 'LIVE';
    setConfirmConfig({
      isOpen: true,
      title: 'Update Item Status',
      message: `Are you sure you want to mark this item as ${actionName}?`,
      confirmText: `MARK AS ${actionName}`,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setInventory((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, is_cleared: newStatus } : p))
        );
        const result = await toggleProductClearedStatus(productId, newStatus);
        if (!result.success) {
          setInventory((prev) =>
            prev.map((p) => (p.id === productId ? { ...p, is_cleared: currentStatus } : p))
          );
          showToast('Failed to update status', 'error');
        } else {
          showToast(`Item marked as ${actionName.toLowerCase()}!`, 'success');
        }
      },
    });
  };

  const confirmDelete = (productId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Item',
      message:
        'Are you sure you want to completely delete this dead stock item? This action is irreversible.',
      confirmText: 'DELETE',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        const prevInventory = [...inventory];
        setInventory((prev) => prev.filter((p) => p.id !== productId));
        setTotalCount((c) => c - 1);
        const result = await deleteProduct(productId);
        if (!result.success) {
          setInventory(prevInventory);
          setTotalCount((c) => c + 1);
          showToast('Failed to delete product', 'error');
        } else {
          setSelectedIds((prev) => prev.filter((id) => id !== productId));
          showToast('Product deleted successfully', 'success');
        }
      },
    });
  };

  const confirmBulkToggle = (markAsCleared: boolean) => {
    if (selectedIds.length === 0) return;
    const actionName = markAsCleared ? 'CLEARED' : 'LIVE';
    setConfirmConfig({
      isOpen: true,
      title: 'Bulk Update Status',
      message: `Are you sure you want to mark ${selectedIds.length} items as ${actionName}?`,
      confirmText: `MARK AS ${actionName}`,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setBulkProcessing(true);
        const prevInventory = [...inventory];
        setInventory((prev) =>
          prev.map((p) =>
            selectedIds.includes(p.id) ? { ...p, is_cleared: markAsCleared } : p
          )
        );
        const result = await bulkToggleProductClearedStatus(selectedIds, markAsCleared);
        if (result.success) {
          setSelectedIds([]);
          showToast(`Successfully updated ${selectedIds.length} items!`, 'success');
        } else {
          setInventory(prevInventory);
          showToast('Failed to perform bulk update.', 'error');
        }
        setBulkProcessing(false);
      },
    });
  };

  // ── Selection helpers ────────────────────────────────────────────────────────
  const allSelected =
    inventory.length > 0 && selectedIds.length === inventory.length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? inventory.map((i) => i.id) : []);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((itemId) => itemId !== id)
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full font-outfit max-w-7xl mx-auto space-y-6 pb-12">
      <CustomConfirm
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="[&>button]:mb-0">
            <BackButton href="/dashboard" label="Back to Dashboard" />
          </div>
          <div>
            <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">
              Manage Dead Stock
            </h1>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mt-1">
              {loading ? 'Loading…' : `${totalCount} item${totalCount !== 1 ? 's' : ''} total`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openAiGenerator()}
            className="bg-[#3E3B36] text-[#F5F1EA] px-5 py-3 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-[#2A2825] transition-all shadow-sm flex items-center gap-2"
          >
            AI Status Generator
          </button>
          <Link
            href="/dashboard/dead-stock/manage/new"
            className="bg-[#3E3B36] text-[#F5F1EA] px-6 py-3 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-[#2A2825] transition-colors shadow-sm"
          >
            + Add New Item
          </Link>
        </div>
      </div>

      {/* ── MERCHANT ROI & RETENTION METRICS (4 CARDS) ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Clearance Views */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E3DA] shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[#8B8378] uppercase">Clearance Views</p>
            <p className="text-2xl font-black text-[#3E3B36] mt-1">
              {metricsLoading ? <Loader2 size={18} className="animate-spin text-slate-400" /> : metrics.totalViews.toLocaleString()}
            </p>
          </div>
          <span className="text-[9px] text-[#8B8378] font-medium mt-2">Total product impressions</span>
        </div>

        {/* Metric 2: WhatsApp Inquiries */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E3DA] shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[#8B8378] uppercase">WhatsApp Inquiries</p>
            <p className="text-2xl font-black text-[#3E3B36] mt-1">
              {metricsLoading ? <Loader2 size={18} className="animate-spin text-slate-400" /> : metrics.whatsappInquiries.toLocaleString()}
            </p>
          </div>
          <span className="text-[9px] text-[#8B8378] font-medium mt-2">Direct chat click-throughs</span>
        </div>

        {/* Metric 3: Store QR Code Scans */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E3DA] shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[#8B8378] uppercase">Store QR Scans</p>
            <p className="text-2xl font-black text-[#3E3B36] mt-1">
              {metricsLoading ? <Loader2 size={18} className="animate-spin text-slate-400" /> : metrics.qrScans.toLocaleString()}
            </p>
          </div>
          <span className="text-[9px] text-[#8B8378] font-medium mt-2">Footfall &amp; QR interactions</span>
        </div>

        {/* Metric 4: Liquidation Capital Recovered */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E3DA] shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[#8B8378] uppercase">Capital Recovered</p>
            <p className="text-2xl font-black text-[#3E3B36] mt-1">
              {metricsLoading ? <Loader2 size={18} className="animate-spin text-slate-400" /> : `₹${metrics.capitalRecovered.toLocaleString('en-IN')}`}
            </p>
          </div>
          <span className="text-[9px] text-[#8B8378] font-medium mt-2">Total liquidated inventory</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#E8E3DA] overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[550px]">
        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="p-4 border-b border-[#E8E3DA] flex flex-col sm:flex-row justify-between gap-4 bg-[#FAF9F6] shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8378]" size={16} />
            <input
              id="dashboard-inventory-search"
              type="text"
              placeholder="Search by product name or category…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 bg-white border border-[#E8E3DA] rounded-lg text-sm focus:outline-none focus:border-[#C4A896] text-[#3E3B36]"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8378] hover:text-[#3E3B36] transition-colors"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            <select
              id="dashboard-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-2.5 bg-white border border-[#E8E3DA] rounded-lg text-xs font-bold text-[#8B8378] uppercase tracking-wider focus:outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="live">Live Only</option>
              <option value="cleared">Cleared Only</option>
            </select>

            <button
              id="dashboard-sort-toggle"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="px-4 py-2.5 bg-white border border-[#E8E3DA] rounded-lg text-xs font-bold text-[#8B8378] uppercase tracking-wider flex items-center gap-2 hover:bg-[#F5F1EA] transition-colors"
            >
              <ArrowUpDown size={14} /> Sort {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
            </button>
          </div>
        </div>

        {/* ── Bulk Actions Bar ─────────────────────────────────────────────── */}
        {selectedIds.length > 0 && (
          <div className="bg-emerald-50/50 border-b border-emerald-100 px-4 py-3 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-emerald-800">
              {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => confirmBulkToggle(true)}
                disabled={bulkProcessing}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
              >
                {bulkProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Mark as Cleared
              </button>
              <button
                onClick={() => confirmBulkToggle(false)}
                disabled={bulkProcessing}
                className="px-4 py-2 bg-emerald-600 border border-emerald-700 rounded-lg text-xs font-bold text-white hover:bg-emerald-700 flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
              >
                {bulkProcessing ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                Mark as Live
              </button>
            </div>
          </div>
        )}

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-[#F5F1EA] text-[#8B8378] font-bold text-[10px] uppercase tracking-[0.2em] sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-[#E8E3DA] text-[#3E3B36] focus:ring-[#C4A896] cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4">Pricing</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E3DA]">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin" />
                      <p className="text-xs font-bold text-[#8B8378] tracking-widest uppercase">
                        Loading Inventory…
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && inventory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <Package size={48} className="mx-auto text-[#E8E3DA] mb-4" />
                    <p className="text-sm font-semibold text-[#3E3B36]">No items found.</p>
                    <p className="text-xs text-[#8B8378] mt-1">Adjust your search or add a new item.</p>
                  </td>
                </tr>
              )}

              {!loading &&
                inventory.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-[#F5F1EA]/50 transition-colors group ${
                      item.is_cleared ? 'opacity-60 bg-gray-50' : ''
                    } ${selectedIds.includes(item.id) ? 'bg-emerald-50/30' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                        className="w-4 h-4 rounded border-[#E8E3DA] text-[#3E3B36] focus:ring-[#C4A896] cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 w-[40%]">
                      <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12 rounded-lg border border-[#E8E3DA] bg-white overflow-hidden shrink-0 flex items-center justify-center">
                          {item.images?.[0] ? (
                            <Image
                              src={item.images[0]}
                              alt={item.product_name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <Package size={20} className="text-[#E8E3DA]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#3E3B36] truncate">{item.product_name}</p>
                          <p className="text-[10px] font-bold tracking-widest uppercase text-[#8B8378] mt-1">
                            {item.category}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 w-[20%]">
                      <div className="flex flex-col">
                        <span className="font-bold text-emerald-600 text-base">
                          ₹{parseFloat(item.clearance_price).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[#8B8378] line-through">
                            ₹{parseFloat(item.original_price).toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100">
                            {item.discount_percentage}% OFF
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 w-[20%]">
                      {item.is_cleared ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle size={12} /> Cleared
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                          <ShieldAlert size={12} /> Live Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right w-[15%]">
                      <div className="flex items-center justify-end gap-2">
                        {/* AI Status Generator Button */}
                        <button
                          onClick={() => openAiGenerator(item)}
                          title="Generate AI Status Copy"
                          className="p-2.5 bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors flex items-center justify-center min-w-[40px]"
                        >
                          <Sparkles size={16} />
                        </button>

                        <button
                          onClick={() => confirmToggleCleared(item.id, item.is_cleared)}
                          title={item.is_cleared ? 'Mark as Live' : 'Mark as Cleared'}
                          className={`p-2.5 rounded-lg border transition-colors flex items-center justify-center min-w-[40px] ${
                            item.is_cleared
                              ? 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          <CheckCircle size={16} />
                        </button>

                        <Link
                          href={`/dashboard/dead-stock/manage/${item.id}`}
                          title="View & Edit Details"
                          className="p-2.5 bg-white border border-[#E8E3DA] text-[#8B8378] hover:text-[#C4A896] hover:bg-[#F5F1EA] rounded-lg transition-colors flex items-center justify-center min-w-[40px]"
                        >
                          <Pencil size={16} />
                        </Link>

                        <button
                          onClick={() => confirmDelete(item.id)}
                          title="Delete Item"
                          className="p-2.5 bg-white border border-[#E8E3DA] text-[#8B8378] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center min-w-[40px]"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div ref={sentinelRef} className="flex justify-center py-6">
            {loadingMore && (
              <div className="flex items-center gap-2 text-[#8B8378] text-xs font-semibold">
                <Loader2 className="animate-spin" size={16} />
                Loading more…
              </div>
            )}
            {!hasMore && !loading && inventory.length > 0 && (
              <p className="text-[10px] text-[#8B8378] tracking-widest uppercase">
                — All {totalCount} item{totalCount !== 1 ? 's' : ''} loaded —
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── AI WHATSAPP STATUS GENERATOR MODAL ────────────────────────────────── */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E5DCD3] relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setAiModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-full"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#3E3B36]">AI WhatsApp Status Copy Generator</h3>
                <p className="text-xs text-slate-500">
                  Target item: <span className="font-semibold text-amber-800">{selectedProductForAi?.product_name}</span>
                </p>
              </div>
            </div>

            {aiLoading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 size={36} className="animate-spin text-amber-600 mx-auto" />
                <p className="text-sm font-semibold text-[#3E3B36]">Crafting 3 viral status options…</p>
                <p className="text-xs text-slate-400">Optimizing emojis, Malayalam/English tone, and discount highlights</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {aiOptions.map((option, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E5DCD3] hover:border-amber-400 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                        {idx === 0 ? 'English Viral Style' : idx === 1 ? 'Kerala Manglish Mix' : 'Clean Deal Alert'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(option, idx)}
                          className="px-3 py-1.5 bg-white border border-[#E5DCD3] rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                        >
                          {copiedIdx === idx ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          {copiedIdx === idx ? 'Copied' : 'Copy'}
                        </button>
                        <button
                          onClick={() => shareToWhatsApp(option)}
                          className="px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-xs font-bold hover:bg-[#20b958] flex items-center gap-1.5 shadow-sm"
                        >
                          <Share2 size={13} /> Share Status
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans bg-white p-3 rounded-xl border border-[#E8E3DA]">
                      {option}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
