'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Package, Plus, Search, ArrowUpDown, Eye, Trash2, ToggleLeft, ToggleRight, Loader2, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface DeadStockProduct {
  id: string; product_name: string; original_price: number; clearance_price: number;
  discount_percentage: number; category: string; images: string[]; is_cleared: boolean; created_at: string;
}

export default function MerchantDeadStockDashboard() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [products, setProducts] = useState<DeadStockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterCleared, setFilterCleared] = useState<'all' | 'active' | 'cleared'>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const isFetchingRef = useRef(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setShopId(user.id);
    }
    init();
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!shopId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ shopId, sortBy, includeCleared: 'true', pageSize: '100', page: '0', ...(search ? { search } : {}) });
      if (filterCleared === 'active') params.set('is_cleared', 'false');
      if (filterCleared === 'cleared') params.set('is_cleared', 'true');
      const res = await fetch(`/api/dead-stock?${params}`);
      const data = await res.json();
      let items: DeadStockProduct[] = data.products || [];
      if (filterCleared === 'active') items = items.filter(p => !p.is_cleared);
      if (filterCleared === 'cleared') items = items.filter(p => p.is_cleared);
      setProducts(items);
    } catch (err) { console.error(err); } finally { isFetchingRef.current = false; setIsLoading(false); }
  }, [shopId, search, sortBy, filterCleared]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleToggleCleared = async (product: DeadStockProduct) => {
    if (!shopId) return;
    setTogglingId(product.id);
    try {
      const res = await fetch('/api/dead-stock', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id, shop_id: shopId, is_cleared: !product.is_cleared }) });
      if (!res.ok) throw new Error('Failed');
      showToast(product.is_cleared ? 'Item marked as active!' : 'Item marked as cleared!', 'success');
      await fetchProducts();
    } catch { showToast('Failed to update status', 'error'); } finally { setTogglingId(null); }
  };

  const handleDelete = async (id: string) => {
    if (!shopId || !confirm('Permanently delete this listing?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/dead-stock?id=${id}&shopId=${shopId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      showToast('Listing deleted.', 'success');
      await fetchProducts();
    } catch { showToast('Delete failed', 'error'); } finally { setDeletingId(null); }
  };

  const activeCount = products.filter(p => !p.is_cleared).length;
  const clearedCount = products.filter(p => p.is_cleared).length;

  return (
    <div className="min-h-screen bg-[#F5F1EA]">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#3E3B36] tracking-tight">Dead Stock Manager</h1>
            <p className="text-xs text-[#8B8378] mt-1 tracking-wide">Manage your clearance listings. Toggle items as cleared once sold.</p>
          </div>
          <Link href="/dashboard/dead-stock/new" className="flex items-center gap-2 px-5 py-2.5 bg-[#3E3B36] text-[#F5F1EA] rounded-xl text-sm font-bold hover:bg-[#2a2825] transition-colors shrink-0">
            <Plus size={15} />Publish New Listing
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Listings', value: products.length, color: 'text-[#3E3B36]' },
            { label: 'Active', value: activeCount, color: 'text-emerald-700' },
            { label: 'Cleared', value: clearedCount, color: 'text-slate-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-[#E8E3DA] p-4 text-center shadow-sm">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-[#8B8378] uppercase tracking-widest mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl border border-[#E8E3DA] p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8378]" size={14} />
            <input type="text" placeholder="Search listings..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896] bg-[#F9F7F4] placeholder:text-[#8B8378]" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E8E3DA] bg-[#F9F7F4]">
              <ArrowUpDown size={13} className="text-[#8B8378]" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-transparent text-xs font-semibold text-[#3E3B36] focus:outline-none cursor-pointer">
                <option value="newest">Newest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
                <option value="discount_desc">Discount ↓</option>
              </select>
            </div>
            <div className="flex rounded-xl border border-[#E8E3DA] overflow-hidden bg-[#F9F7F4]">
              {(['all', 'active', 'cleared'] as const).map(f => (
                <button key={f} onClick={() => setFilterCleared(f)} className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${filterCleared === f ? 'bg-[#3E3B36] text-[#F5F1EA]' : 'text-[#8B8378] hover:text-[#3E3B36]'}`}>{f}</button>
              ))}
            </div>
            <button onClick={fetchProducts} className="p-2 rounded-xl border border-[#E8E3DA] hover:bg-[#F5F1EA] transition-colors bg-white">
              <RefreshCw size={14} className={`text-[#8B8378] ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Listings */}
        <div className="bg-white rounded-2xl border border-[#E8E3DA] overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[#C4A896]" /></div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Package size={32} className="text-[#C4A896]" />
              <p className="text-sm text-[#8B8378]">No listings yet. Publish your first clearance item.</p>
              <Link href="/dashboard/dead-stock/new" className="px-4 py-2 bg-[#3E3B36] text-[#F5F1EA] rounded-xl text-xs font-bold hover:bg-[#2a2825] transition-colors">+ New Listing</Link>
            </div>
          ) : (
            <div className="divide-y divide-[#E8E3DA]">
              {products.map(product => (
                <div key={product.id} className={`flex items-center gap-4 p-4 hover:bg-[#F5F1EA]/50 transition-colors ${product.is_cleared ? 'opacity-60' : ''}`}>
                  {/* Thumb */}
                  <div className="w-14 h-14 rounded-xl border border-[#E8E3DA] bg-[#F5F1EA] overflow-hidden shrink-0">
                    {product.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.images[0]} alt={product.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package size={18} className="text-[#C4A896]" /></div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#3E3B36] truncate">{product.product_name}</p>
                      {product.is_cleared
                        ? <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center gap-1"><CheckCircle2 size={10} />Cleared</span>
                        : <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center gap-1"><AlertTriangle size={10} />Live</span>
                      }
                    </div>
                    <p className="text-[10px] text-[#8B8378] mt-0.5 uppercase tracking-wide">{product.category}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-black text-[#3E3B36]">₹{product.clearance_price.toLocaleString('en-IN')}</span>
                      <span className="text-xs text-[#8B8378] line-through">₹{product.original_price.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] font-bold text-rose-600">{product.discount_percentage}% OFF</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/broadcast/dead-stock/${product.id}`} target="_blank" className="p-2 rounded-xl border border-[#E8E3DA] hover:bg-[#F5F1EA] transition-colors" title="View on marketplace">
                      <Eye size={14} className="text-[#8B8378]" />
                    </Link>
                    <button
                      onClick={() => handleToggleCleared(product)}
                      disabled={togglingId === product.id}
                      className={`p-2 rounded-xl border transition-colors ${product.is_cleared ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100' : 'border-amber-200 bg-amber-50 hover:bg-amber-100'}`}
                      title={product.is_cleared ? 'Mark as Active' : 'Mark as Cleared'}
                    >
                      {togglingId === product.id ? <Loader2 size={14} className="animate-spin text-[#8B8378]" /> : product.is_cleared ? <ToggleRight size={14} className="text-emerald-600" /> : <ToggleLeft size={14} className="text-amber-600" />}
                    </button>
                    <button onClick={() => handleDelete(product.id)} disabled={deletingId === product.id} className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors" title="Delete listing">
                      {deletingId === product.id ? <Loader2 size={14} className="animate-spin text-rose-400" /> : <Trash2 size={14} className="text-rose-500" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
