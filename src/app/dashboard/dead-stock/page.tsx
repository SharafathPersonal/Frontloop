'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import {
  Package, Plus, Search, ArrowUpDown, Eye, Trash2,
  ToggleLeft, ToggleRight, Loader2, AlertTriangle,
  CheckCircle2, RefreshCw, QrCode, Share2, MessageCircle,
  Download, Printer, Store, ExternalLink, ChevronDown
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { QRCodeCanvas } from 'qrcode.react';

interface DeadStockProduct {
  id: string; product_name: string; original_price: number; clearance_price: number;
  discount_percentage: number; category: string; images: string[]; is_cleared: boolean; created_at: string;
}

export default function MerchantDeadStockDashboard() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [shops, setShops] = useState<{ id: string; shop_name: string; city: string | null }[]>([]);
  const [products, setProducts] = useState<DeadStockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterCleared, setFilterCleared] = useState<'all' | 'active' | 'cleared'>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const isFetchingRef = useRef(false);

  const [shopOpen, setShopOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const shopRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shopRef.current && !shopRef.current.contains(event.target as Node)) {
        setShopOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      try {
        const { data: primaryShop } = await supabase
          .from('shops')
          .select('id, shop_name, owner_phone, city')
          .eq('id', user.id)
          .single();

        if (primaryShop) {
          setShopId(primaryShop.id);

          // Find other shops registered with the same owner phone
          const { data: merchantShops } = await supabase
            .from('shops')
            .select('id, shop_name, city')
            .eq('owner_phone', primaryShop.owner_phone);

          setShops(merchantShops || [primaryShop]);
        } else {
          // Fallback
          setShopId(user.id);
        }
      } catch (err) {
        console.error('Failed to initialize merchant shops:', err);
        setShopId(user.id);
      }
    }
    init();
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!shopId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        shopId,
        sortBy,
        includeCleared: 'true',
        pageSize: '100',
        page: '0',
        ...(search ? { search } : {})
      });
      const res = await fetch(`/api/dead-stock?${params}`);
      const data = await res.json();
      let items: DeadStockProduct[] = data.products || [];
      if (filterCleared === 'active') items = items.filter(p => !p.is_cleared);
      if (filterCleared === 'cleared') items = items.filter(p => p.is_cleared);
      setProducts(items);
    } catch (err) {
      console.error('Failed to fetch shop inventory:', err);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [shopId, search, sortBy, filterCleared]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleToggleCleared = async (product: DeadStockProduct) => {
    if (!shopId) return;
    setTogglingId(product.id);
    try {
      const res = await fetch('/api/dead-stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, shop_id: shopId, is_cleared: !product.is_cleared })
      });
      if (!res.ok) throw new Error('Failed');
      showToast(product.is_cleared ? 'Listing marked as live & active!' : 'Listing marked as cleared!', 'success');
      await fetchProducts();
    } catch {
      showToast('Failed to update status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!shopId || !confirm('Permanently delete this listing? This action is irreversible.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/dead-stock?id=${id}&shopId=${shopId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      showToast('Listing deleted successfully.', 'success');
      await fetchProducts();
    } catch {
      showToast('Delete failed', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // QR Code downloader
  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const activeShop = shops.find(s => s.id === shopId);
    link.download = `clearance-qr-${activeShop?.shop_name || 'shop'}.png`;
    link.href = url;
    link.click();
    showToast('QR Code PNG download started!', 'success');
  };

  const activeShop = shops.find(s => s.id === shopId);
  const activeCount = products.filter(p => !p.is_cleared).length;
  const clearedCount = products.filter(p => p.is_cleared).length;

  // WhatsApp Status intents
  const shopStatusMsg = encodeURIComponent(
    `Check out our exclusive clearance factory outlet deals up to 70% off! Tap link to reserve items: https://trueattendenly.online/broadcast/dead-stock?shopId=${shopId}`
  );
  const shopStatusUrl = `https://wa.me/?text=${shopStatusMsg}`;

  const getProductStatusUrl = (p: DeadStockProduct) => {
    const msg = encodeURIComponent(
      `Check out this clearance deal: ${p.product_name} for only ₹${p.clearance_price} (orig. ₹${p.original_price})! Tap link to reserve item: https://trueattendenly.online/broadcast/dead-stock/${p.id}`
    );
    return `https://wa.me/?text=${msg}`;
  };

  return (
    <div className="min-h-screen bg-[#F5F1EA] font-inter pb-12">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ── HEADER & SHOP SELECTOR ───────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#E8E3DA] p-5 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#3E3B36] tracking-tight">Dead Stock Manager</h1>
            <p className="text-xs text-[#8B8378] tracking-wide">Manage factory outlet listings. Toggle items off the marketplace once cleared.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Multi-Shop Selector */}
            {shops.length > 1 && (
              <div className="relative" ref={shopRef}>
                <button
                  onClick={() => setShopOpen(!shopOpen)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E8E3DA] bg-[#F9F7F4] text-xs text-[#3E3B36] font-bold hover:border-[#C4A896] transition-all min-w-[150px] justify-between shadow-sm"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Store size={14} className="text-[#C4A896] shrink-0" />
                    <span className="truncate">
                      {shops.find(s => s.id === shopId)?.shop_name || 'Select Shop'}
                    </span>
                  </div>
                  <ChevronDown size={11} className={`text-[#C4A896] transition-transform duration-200 ${shopOpen ? 'rotate-180' : ''}`} />
                </button>

                {shopOpen && (
                  <div className="absolute right-0 mt-1.5 w-60 bg-white border border-[#E8E3DA] rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    {shops.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setShopId(s.id);
                          setShopOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-[#FAF6F0] hover:text-[#5C4033] transition-colors flex flex-col ${
                          shopId === s.id ? 'bg-[#FAF6F0] text-[#5C4033]' : 'text-[#8B8378]'
                        }`}
                      >
                        <span className="font-bold truncate">{s.shop_name}</span>
                        {s.city && <span className="text-[10px] text-[#C4A896] font-normal">{s.city}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Link href="/dashboard/dead-stock/new" className="flex items-center gap-2 px-5 py-2.5 bg-[#5C4033] text-white rounded-xl text-xs font-bold hover:bg-[#4a3329] transition-colors shrink-0 shadow-sm">
              <Plus size={14} />Publish New Listing
            </Link>
          </div>
        </div>

        {/* ── DYNAMIC IN-STORE QR CODE & STATUS MARKETING MODULE ─ */}
        {shopId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* QR Card (Spans 2 columns) */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-[#E8E3DA] p-6 shadow-sm flex flex-col sm:flex-row gap-6 items-center">
              <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#E8E3DA] flex flex-col items-center justify-center shrink-0">
                <QRCodeCanvas
                  id="qr-canvas"
                  value={`https://trueattendenly.online/broadcast/dead-stock?shopId=${shopId}`}
                  size={120}
                  level="H"
                  includeMargin={true}
                />
                <span className="text-[8px] text-[#8B8378] uppercase tracking-widest font-black mt-2">Clearance Rack Scan</span>
              </div>
              
              <div className="space-y-4 flex-1 text-center sm:text-left">
                <div>
                  <h3 className="font-bold text-sm text-[#3E3B36] flex items-center gap-1.5 justify-center sm:justify-start">
                    <QrCode size={16} className="text-[#C4A896]" />
                    Grow Your In-Store Clearance Sales
                  </h3>
                  <p className="text-xs text-[#8B8378] mt-1 leading-relaxed">
                    Drive foot traffic directly to your dead stock list. Customers scan this QR code physically at your counters to browse your live liquidation deals with zero friction.
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    onClick={downloadQRCode}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#5C4033] hover:bg-[#4a3329] text-white text-[10px] font-bold tracking-wider uppercase rounded-xl transition-all shadow-sm"
                  >
                    <Download size={12} /> Download PNG
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 border border-[#E8E3DA] hover:bg-[#F5F1EA] text-[10px] font-bold tracking-wider uppercase text-[#3E3B36] rounded-xl transition-colors"
                  >
                    <Printer size={12} /> Print Flyer
                  </button>
                </div>
              </div>
            </div>

            {/* WA Status Card (Spans 1 column) */}
            <div className="bg-white rounded-2xl border border-[#E8E3DA] p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-[#3E3B36] flex items-center gap-1.5">
                  <Share2 size={16} className="text-[#C4A896]" />
                  WhatsApp Status Loop
                </h3>
                <p className="text-xs text-[#8B8378] leading-relaxed">
                  Safely broadcast your entire clearance outlet URL to your personal WhatsApp Status. Zero Meta API dependency, zero banning risk.
                </p>
              </div>

              <a
                href={shopStatusUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20BD5C] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md text-center"
              >
                <MessageCircle size={15} /> Make Your Status
              </a>
            </div>

          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Listings', value: products.length, color: 'text-[#3E3B36]' },
            { label: 'Active (Live)', value: activeCount, color: 'text-emerald-700' },
            { label: 'Cleared (Sold)', value: clearedCount, color: 'text-slate-400' },
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
            <input
              type="text"
              placeholder="Search listings..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896] bg-[#F9F7F4] placeholder:text-[#8B8378]"
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Custom Sort Selector */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E8E3DA] bg-[#F9F7F4] text-xs text-[#3E3B36] font-semibold hover:border-[#C4A896] transition-all min-w-[120px] justify-between shadow-sm"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <ArrowUpDown size={13} className="text-[#8B8378] shrink-0" />
                  <span className="truncate">
                    {sortBy === 'newest' && 'Newest'}
                    {sortBy === 'price_asc' && 'Price ↑'}
                    {sortBy === 'price_desc' && 'Price ↓'}
                    {sortBy === 'discount_desc' && 'Discount ↓'}
                  </span>
                </div>
                <ChevronDown size={11} className={`text-[#C4A896] transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`} />
              </button>

              {sortOpen && (
                <div className="absolute right-0 mt-1.5 w-40 bg-white border border-[#E8E3DA] rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  {[
                    { value: 'newest', label: 'Newest' },
                    { value: 'price_asc', label: 'Price ↑' },
                    { value: 'price_desc', label: 'Price ↓' },
                    { value: 'discount_desc', label: 'Discount ↓' }
                  ].map(o => (
                    <button
                      key={o.value}
                      onClick={() => {
                        setSortBy(o.value);
                        setSortOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-[#FAF6F0] hover:text-[#5C4033] transition-colors ${
                        sortBy === o.value ? 'bg-[#FAF6F0] text-[#5C4033] font-bold' : 'text-[#8B8378]'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
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
              <p className="text-sm text-[#8B8378]">No clearance listings found.</p>
              <Link href="/dashboard/dead-stock/new" className="px-4 py-2 bg-[#5C4033] text-white rounded-xl text-xs font-bold hover:bg-[#4a3329] transition-colors">+ New Listing</Link>
            </div>
          ) : (
            <div className="divide-y divide-[#E8E3DA]">
              {products.map(product => (
                <div key={product.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-[#FAF6F0]/60 transition-colors ${product.is_cleared ? 'bg-slate-50 opacity-60' : ''}`}>
                  {/* Thumb + Details */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 rounded-xl border border-[#E8E3DA] bg-[#F5F1EA] overflow-hidden shrink-0 relative">
                      {product.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.images[0]} alt={product.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package size={18} className="text-[#C4A896]" /></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-[#3E3B36] truncate">{product.product_name}</p>
                        {product.is_cleared
                          ? <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center gap-1"><CheckCircle2 size={10} />Cleared</span>
                          : <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center gap-1"><AlertTriangle size={10} />Live</span>
                        }
                      </div>
                      <p className="text-[10px] text-[#8B8378] mt-0.5 uppercase tracking-wider">{product.category}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-sm font-black text-[#5C4033]">₹{product.clearance_price.toLocaleString('en-IN')}</span>
                        <span className="text-xs text-[#8B8378] line-through">₹{product.original_price.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] font-bold text-rose-600">{product.discount_percentage}% OFF</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8E3DA]">
                    
                    {/* View Details */}
                    <Link
                      href={`/broadcast/dead-stock/${product.id}`}
                      target="_blank"
                      className="p-2 rounded-xl border border-[#E8E3DA] hover:bg-[#FAF6F0] bg-white transition-colors"
                      title="View on marketplace"
                    >
                      <Eye size={14} className="text-[#8B8378]" />
                    </Link>

                    {/* WhatsApp share deal to status */}
                    {!product.is_cleared && (
                      <a
                        href={getProductStatusUrl(product)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl border border-emerald-200 hover:bg-emerald-50 bg-white transition-colors"
                        title="Share Deal to WhatsApp Status"
                      >
                        <Share2 size={14} className="text-emerald-600" />
                      </a>
                    )}

                    {/* Clear Toggle */}
                    <button
                      onClick={() => handleToggleCleared(product)}
                      disabled={togglingId === product.id}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                        product.is_cleared
                          ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700'
                      }`}
                      title={product.is_cleared ? 'Mark as Active' : 'Mark as Cleared'}
                    >
                      {togglingId === product.id ? (
                        <Loader2 size={12} className="animate-spin text-[#8B8378]" />
                      ) : product.is_cleared ? (
                        <>
                          <ToggleRight size={14} className="text-emerald-600" />
                          <span>Cleared</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={14} className="text-amber-600" />
                          <span>Clear Item</span>
                        </>
                      )}
                    </button>

                    {/* Delete listing */}
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors"
                      title="Delete listing"
                    >
                      {deletingId === product.id ? (
                        <Loader2 size={14} className="animate-spin text-rose-400" />
                      ) : (
                        <Trash2 size={14} className="text-rose-500" />
                      )}
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
