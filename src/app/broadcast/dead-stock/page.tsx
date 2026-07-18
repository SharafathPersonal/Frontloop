'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search, MapPin, X, SlidersHorizontal, Loader2,
  Package, ChevronDown, ArrowUpDown, IndianRupee,
  Store, ExternalLink, MessageSquare, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// ─── Theme tokens (aligned to platform globals.css) ──────────────
// bg: #FAF6F0 · border: #E5DCD3 · brown: #5C4033 · accent: #C4A896
// charcoal: #3E3B36 · muted: #8B8378

const CATEGORIES = [
  'All', 'Clothing', 'Electronics', 'Grocery', 'Furniture',
  'Footwear', 'Sports', 'Toys', 'Books', 'Home Decor', 'Stationery', 'Other',
];
const SORT_OPTIONS = [
  { value: 'newest',       label: 'Newest First' },
  { value: 'price_asc',   label: 'Price ↑ Low to High' },
  { value: 'price_desc',  label: 'Price ↓ High to Low' },
  { value: 'discount_desc', label: 'Deepest Discount' },
];

interface ShopJoin {
  id: string; shop_name: string; location_address: string | null;
  city: string | null; district: string | null; state: string | null;
  contact_number: string | null; owner_phone: string;
  logo_url: string | null; google_maps_url: string | null;
}
interface DeadStockProduct {
  id: string; product_name: string; original_price: number;
  clearance_price: number; discount_percentage: number;
  category: string; images: string[]; is_cleared: boolean;
  created_at: string; shop: ShopJoin;
}

// ─── Product Card ─────────────────────────────────────────────────
function ProductCard({ product }: { product: DeadStockProduct }) {
  const img = product.images?.[0];
  const city = product.shop?.city || product.shop?.district || '';
  const disc = product.discount_percentage ||
    Math.round(((product.original_price - product.clearance_price) / product.original_price) * 100);
  const saved = product.original_price - product.clearance_price;

  return (
    <Link href={`/broadcast/dead-stock/${product.id}`} className="group block h-full">
      <article className="h-full flex flex-col bg-white border border-[#E5DCD3] rounded-2xl overflow-hidden shadow-sm hover:shadow-[0_8px_32px_rgba(92,64,51,0.12)] hover:-translate-y-1 transition-all duration-300">

        {/* Image */}
        <div className="relative aspect-[4/3] bg-[#FAF6F0] overflow-hidden flex-shrink-0">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={product.product_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Package size={28} className="text-[#C4A896]" />
              <span className="text-[9px] text-[#8B8378] uppercase tracking-widest font-semibold">No Photo</span>
            </div>
          )}

          {/* Dead Stock badge — top left */}
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#3E3B36]/95 text-[#FAF6F0] text-[9px] font-black tracking-[0.18em] uppercase shadow-lg backdrop-blur-sm border border-[#E5DCD3]/20">
              ⚠ DEAD STOCK
            </span>
          </div>

          {/* Discount — top right */}
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-block px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black shadow-lg">
              {disc}% OFF
            </span>
          </div>

          {/* Clearance ribbon — bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-gradient-to-t from-[#5C4033]/80 to-transparent">
            <span className="text-[9px] text-[#C4A896] font-bold tracking-[0.2em] uppercase">
              Factory Clearance
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-4 gap-3">
          {/* Category */}
          <span className="text-[9px] tracking-[0.22em] uppercase text-[#C4A896] font-bold">
            {product.category}
          </span>

          {/* Name */}
          <h3 className="text-sm font-semibold text-[#3E3B36] leading-snug line-clamp-2 group-hover:text-[#5C4033] transition-colors flex-1">
            {product.product_name}
          </h3>

          {/* Pricing */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-[#5C4033]">
                ₹{product.clearance_price.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-[#8B8378] line-through">
                ₹{product.original_price.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              Save ₹{saved.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Shop info */}
          <div className="pt-3 mt-auto border-t border-[#E5DCD3]">
            <p className="text-xs font-semibold text-[#3E3B36] truncate">{product.shop?.shop_name}</p>
            {city && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={9} className="text-[#C4A896] shrink-0" />
                <span className="text-[10px] text-[#8B8378] truncate">{city}</span>
              </div>
            )}
          </div>
        </div>

      </article>
    </Link>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white border border-[#E5DCD3] rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-[#E5DCD3]" />
      <div className="p-4 space-y-3">
        <div className="h-2.5 bg-[#E5DCD3] rounded w-1/4" />
        <div className="h-4 bg-[#E5DCD3] rounded w-4/5" />
        <div className="h-3 bg-[#E5DCD3] rounded w-3/5" />
        <div className="h-6 bg-[#E5DCD3] rounded-lg w-2/5 mt-4" />
        <div className="pt-3 border-t border-[#E5DCD3] space-y-1.5">
          <div className="h-3 bg-[#E5DCD3] rounded w-3/4" />
          <div className="h-2.5 bg-[#E5DCD3] rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Content Component (wrapped in Suspense) ─────────────────
function DeadStockMarketplaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopIdParam = searchParams.get('shopId');

  const [products, setProducts]       = useState<DeadStockProduct[]>([]);
  const [shops, setShops]             = useState<{ id: string; shop_name: string; city: string | null }[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [selectedShopDetails, setSelectedShopDetails] = useState<ShopJoin | null>(null);
  
  const [isLoading, setIsLoading]     = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [page, setPage]               = useState(0);
  const observerRef                   = useRef<HTMLDivElement>(null);
  const isFetchingRef                 = useRef(false);

  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState('All');
  const [sortBy, setSortBy]           = useState('newest');
  const [city, setCity]               = useState('');
  const [minPrice, setMinPrice]       = useState('');
  const [maxPrice, setMaxPrice]       = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 12;

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

  // Sync shopId from URL query parameter
  useEffect(() => {
    if (shopIdParam) {
      setSelectedShopId(shopIdParam);
    } else {
      setSelectedShopId('');
    }
  }, [shopIdParam]);

  // Fetch shop metadata list for dropdown
  useEffect(() => {
    async function loadShops() {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('id, shop_name, city')
          .eq('marketplace_active', true)
          .eq('is_blocked', false)
          .order('shop_name');
        if (error) throw error;
        if (data) setShops(data);
      } catch (err) {
        console.error('Failed to load registered shops:', err);
      }
    }
    loadShops();
  }, []);

  // Fetch selected shop detailed profile for premium banner
  useEffect(() => {
    async function loadShopDetails() {
      if (selectedShopId) {
        try {
          const { data, error } = await supabase
            .from('shops')
            .select('id, shop_name, location_address, city, district, state, contact_number, owner_phone, logo_url, google_maps_url')
            .eq('id', selectedShopId)
            .single();
          if (error) throw error;
          if (data) {
            setSelectedShopDetails(data as ShopJoin);
          }
        } catch (err) {
          console.error('Failed to load shop details:', err);
        }
      } else {
        setSelectedShopDetails(null);
      }
    }
    loadShopDetails();
  }, [selectedShopId]);

  const fetchProducts = useCallback(async (pageIndex: number, reset = false) => {
    if (isFetchingRef.current && !reset) return;
    isFetchingRef.current = true;
    if (reset) setIsLoading(true); else setIsLoadingMore(true);
    try {
      const p = new URLSearchParams({
        page: String(pageIndex), pageSize: String(PAGE_SIZE), sortBy,
        ...(search && search !== '' ? { search } : {}),
        ...(category !== 'All' ? { category } : {}),
        ...(city ? { city } : {}),
        ...(minPrice ? { minPrice } : {}),
        ...(maxPrice ? { maxPrice } : {}),
        ...(selectedShopId ? { shopId: selectedShopId } : {}),
      });
      const res  = await fetch(`/api/dead-stock?${p}`);
      const data = await res.json();
      const incoming: DeadStockProduct[] = data.products || [];
      if (reset) setProducts(incoming); else setProducts(prev => [...prev, ...incoming]);
      setHasMore(incoming.length === PAGE_SIZE);
      setPage(pageIndex);
    } catch (err) {
      console.error('Dead stock fetch error', err);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [search, category, sortBy, city, minPrice, maxPrice, selectedShopId]);

  // Re-fetch on filter change
  useEffect(() => { setHasMore(true); fetchProducts(0, true); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, category, sortBy, city, minPrice, maxPrice, selectedShopId]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isFetchingRef.current)
        fetchProducts(page + 1);
    }, { threshold: 0.1 });
    const el = observerRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, page, fetchProducts]);

  const handleShopChange = (id: string) => {
    setSelectedShopId(id);
    const params = new URLSearchParams(window.location.search);
    if (id) {
      params.set('shopId', id);
    } else {
      params.delete('shopId');
    }
    router.push(`/broadcast/dead-stock?${params.toString()}`);
  };

  const clearAll = () => {
    setSearch(''); setCategory('All'); setSortBy('newest');
    setCity(''); setMinPrice(''); setMaxPrice(''); handleShopChange('');
  };

  const hasActive = search || category !== 'All' || city || minPrice || maxPrice || sortBy !== 'newest' || selectedShopId;
  const activeCount = [
    search, category !== 'All' ? category : '', city, minPrice, maxPrice, selectedShopId
  ].filter(Boolean).length;

  const waPhone = selectedShopDetails ? (selectedShopDetails.contact_number ?? selectedShopDetails.owner_phone ?? '').replace(/\D/g, '') : '';
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hello, I'm interested in viewing the clearance deals listed at your outlet.`)}` : '';

  return (
    <div className="min-h-screen bg-[#FAF6F0] font-inter">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E5DCD3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: 15, paddingBottom: 15 }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Left: logo + eyebrow + title inline */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Platform logo */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-dark-v2.png"
                alt="True Attendly"
                className="h-6 w-6 object-contain rounded-md flex-shrink-0"
              />
              <div className="flex items-center gap-2">
                <span className="text-[9px] tracking-[0.28em] text-[#C4A896] uppercase font-bold">Hyper-Local</span>
                <span className="w-4 h-px bg-[#E5DCD3]" />
                <span className="text-[9px] tracking-[0.28em] text-[#C4A896] uppercase font-bold">Clearance Marketplace</span>
              </div>
              <span className="text-[#E5DCD3]">/</span>
              <h1 className="serif-headline text-lg sm:text-xl text-[#5C4033] leading-none">
                Dead Stock &amp; Factory Clearance
              </h1>
            </div>
            {/* Right: live badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#E5DCD3] bg-[#FAF6F0] text-[10px] font-bold tracking-wide text-[#5C4033] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {!isLoading && products.length > 0 ? `${products.length}+ Deals` : 'Live Listings'}
            </span>
          </div>
        </div>
      </div>

      {/* ── PREMIUM SINGLE SHOP HERO BANNER (If shopId query parameter is present) ── */}
      {selectedShopDetails && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="relative overflow-hidden bg-white border border-[#E5DCD3] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#C4A896]/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />

            <div className="flex gap-4 sm:gap-5 items-start sm:items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-[#E5DCD3] bg-[#FAF6F0] flex items-center justify-center shrink-0 overflow-hidden">
                {selectedShopDetails.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedShopDetails.logo_url} alt={selectedShopDetails.shop_name} className="w-full h-full object-cover" />
                ) : (
                  <Store size={32} className="text-[#C4A896]" />
                )}
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#5C4033] text-white text-[9px] font-bold tracking-wider uppercase">
                  Verified Clearance Partner
                </span>
                <h2 className="serif-headline text-xl sm:text-2xl text-[#3E3B36]">{selectedShopDetails.shop_name}</h2>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8B8378]">
                  {selectedShopDetails.location_address && (
                    <span className="truncate max-w-[250px]">{selectedShopDetails.location_address}</span>
                  )}
                  {selectedShopDetails.city && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-[#C4A896]" />
                      {selectedShopDetails.city}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full md:w-auto mt-4 md:mt-0">
              {selectedShopDetails.google_maps_url && (
                <a
                  href={selectedShopDetails.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5DCD3] bg-white text-xs font-semibold text-[#3E3B36] hover:bg-[#FAF6F0] transition-colors flex-1 md:flex-none"
                >
                  <ExternalLink size={13} /> Maps Location
                </a>
              )}
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#20BD5C] transition-colors flex-1 md:flex-none"
                >
                  <MessageSquare size={13} /> WhatsApp Shop
                </a>
              )}
              <button
                onClick={() => handleShopChange('')}
                className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors flex-1 md:flex-none"
              >
                <X size={13} /> Close Shop View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STICKY FILTER BAR ────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-[#E5DCD3] shadow-[0_1px_12px_rgba(92,64,51,0.06)] mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Row 1: Search + Controls */}
          <div className="flex flex-wrap items-center gap-3 py-3">

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C4A896]" size={14} />
              <input
                type="text"
                placeholder="Search products or shops…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#E5DCD3] text-sm text-[#3E3B36] bg-[#FAF6F0] focus:outline-none focus:border-[#C4A896] placeholder:text-[#8B8378]/60 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B8378] hover:text-[#5C4033]">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Shop-Wise Dropdown Selector */}
            <div className="relative" ref={shopRef}>
              <button
                onClick={() => setShopOpen(!shopOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5DCD3] bg-[#FAF6F0] text-xs text-[#5C4033] font-semibold hover:border-[#C4A896] transition-all min-w-[140px] justify-between"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Store size={13} className="text-[#C4A896] shrink-0" />
                  <span className="truncate">
                    {selectedShopId
                      ? shops.find(s => s.id === selectedShopId)?.shop_name || 'Selected Shop'
                      : 'All Shops'}
                  </span>
                </div>
                <ChevronDown size={11} className={`text-[#C4A896] transition-transform duration-200 ${shopOpen ? 'rotate-180' : ''}`} />
              </button>

              {shopOpen && (
                <div className="absolute left-0 mt-1.5 w-60 bg-white border border-[#E5DCD3] rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    onClick={() => {
                      handleShopChange('');
                      setShopOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-[#FAF6F0] hover:text-[#5C4033] transition-colors flex items-center justify-between ${
                      !selectedShopId ? 'bg-[#FAF6F0] text-[#5C4033]' : 'text-[#8B8378]'
                    }`}
                  >
                    All Shops
                  </button>
                  <div className="max-h-60 overflow-y-auto divide-y divide-[#FAF6F0]">
                    {shops.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          handleShopChange(s.id);
                          setShopOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-[#FAF6F0] hover:text-[#5C4033] transition-colors flex flex-col ${
                          selectedShopId === s.id ? 'bg-[#FAF6F0] text-[#5C4033]' : 'text-[#8B8378]'
                        }`}
                      >
                        <span className="font-bold truncate">{s.shop_name}</span>
                        {s.city && <span className="text-[10px] text-[#C4A896] font-normal">{s.city}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold tracking-wide transition-all ${
                showFilters
                  ? 'bg-[#5C4033] text-[#FAF6F0] border-[#5C4033]'
                  : 'bg-white text-[#5C4033] border-[#E5DCD3] hover:border-[#C4A896]'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Advanced Filters</span>
              {activeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#C4A896] text-white text-[8px] font-black flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>

            {/* Sort */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5DCD3] bg-white text-xs text-[#5C4033] font-semibold hover:border-[#C4A896] transition-all min-w-[130px] justify-between"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <ArrowUpDown size={12} className="text-[#C4A896] shrink-0" />
                  <span className="truncate">
                    {SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Sort'}
                  </span>
                </div>
                <ChevronDown size={11} className={`text-[#C4A896] transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`} />
              </button>

              {sortOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white border border-[#E5DCD3] rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  {SORT_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => {
                        setSortBy(o.value);
                        setSortOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-[#FAF6F0] hover:text-[#5C4033] transition-colors ${
                        sortBy === o.value ? 'bg-[#FAF6F0] text-[#5C4033] font-bold' : 'text-[#8B8378]'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear all */}
            {hasActive && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[#E5DCD3] bg-white text-[#8B8378] text-xs font-semibold hover:border-[#C4A896] hover:text-[#5C4033] transition-colors ml-auto sm:ml-0"
              >
                <X size={12} />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Row 2: Expanded filters */}
          {showFilters && (
            <div className="pb-4 space-y-3 border-t border-[#E5DCD3] pt-3 animate-in fade-in duration-200">

              {/* Category pills */}
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      category === cat
                        ? 'bg-[#5C4033] text-[#FAF6F0] border-[#5C4033]'
                        : 'bg-white text-[#5C4033] border-[#E5DCD3] hover:border-[#C4A896]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* City + Price row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* City */}
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#C4A896]" size={12} />
                  <input
                    type="text"
                    placeholder="City / District Proximity"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="pl-7 pr-3 py-1.5 rounded-xl border border-[#E5DCD3] text-xs text-[#3E3B36] w-48 bg-[#FAF6F0] focus:outline-none focus:border-[#C4A896] placeholder:text-[#8B8378]/60 transition-colors"
                  />
                </div>

                {/* Price range */}
                <div className="flex items-center gap-1.5">
                  <IndianRupee size={12} className="text-[#C4A896] shrink-0" />
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    className="w-24 px-2.5 py-1.5 rounded-xl border border-[#E5DCD3] text-xs bg-[#FAF6F0] focus:outline-none focus:border-[#C4A896] placeholder:text-[#8B8378]/60"
                  />
                  <span className="text-[#8B8378] text-xs">–</span>
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    className="w-24 px-2.5 py-1.5 rounded-xl border border-[#E5DCD3] text-xs bg-[#FAF6F0] focus:outline-none focus:border-[#C4A896] placeholder:text-[#8B8378]/60"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PRODUCT GRID ─────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Active filter chips */}
        {hasActive && !isLoading && (
          <div className="flex flex-wrap gap-2 mb-6">
            {search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E5DCD3] text-[11px] text-[#5C4033] font-semibold">
                &ldquo;{search}&rdquo;
                <button onClick={() => setSearch('')}><X size={10} /></button>
              </span>
            )}
            {category !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E5DCD3] text-[11px] text-[#5C4033] font-semibold">
                {category}
                <button onClick={() => setCategory('All')}><X size={10} /></button>
              </span>
            )}
            {city && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E5DCD3] text-[11px] text-[#5C4033] font-semibold">
                <MapPin size={9} /> {city}
                <button onClick={() => setCity('')}><X size={10} /></button>
              </span>
            )}
            {selectedShopId && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E5DCD3] text-[11px] text-[#5C4033] font-semibold">
                <Store size={9} /> {selectedShopDetails?.shop_name || 'Selected Shop'}
                <button onClick={() => handleShopChange('')}><X size={10} /></button>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E5DCD3] text-[11px] text-[#5C4033] font-semibold">
                ₹{minPrice || '0'} – ₹{maxPrice || '∞'}
                <button onClick={() => { setMinPrice(''); setMaxPrice(''); }}><X size={10} /></button>
              </span>
            )}
          </div>
        )}

        {/* Results meta */}
        {!isLoading && products.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs text-[#8B8378]">
              Showing <span className="font-bold text-[#5C4033]">{products.length}</span> listings
              {hasMore ? ' — scroll for more' : ' — all loaded'}
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>

        /* Empty state */
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center bg-white rounded-3xl border border-[#E5DCD3] px-4 shadow-sm">
            <div className="w-20 h-20 rounded-2xl bg-[#FAF6F0] border border-[#E5DCD3] flex items-center justify-center mb-5">
              <Package size={32} className="text-[#C4A896]" />
            </div>
            <h3 className="serif-headline text-2xl text-[#5C4033] mb-2">No clearance deals found</h3>
            <p className="text-sm text-[#8B8378] max-w-xs leading-relaxed">
              No dead stock products match your search/filters right now. Try expanding your search or selecting another shop.
            </p>
            {hasActive && (
              <button
                onClick={clearAll}
                className="mt-6 px-6 py-3 rounded-xl bg-[#5C4033] text-[#FAF6F0] text-sm font-semibold hover:bg-[#C4A896] transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>

        /* Grid */
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={observerRef} className="h-12 flex items-center justify-center mt-6">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-[#8B8378] text-xs font-medium">
              <Loader2 size={14} className="animate-spin text-[#C4A896]" />
              Loading more deals…
            </div>
          )}
          {!isLoadingMore && !hasMore && products.length > 0 && (
            <p className="text-[10px] text-[#8B8378] tracking-widest uppercase font-semibold">
              — All listings loaded —
            </p>
          )}
        </div>

      </main>
    </div>
  );
}

export default function DeadStockMarketplacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-[#C4A896] mx-auto mb-4" />
          <p className="text-xs text-[#8B8378] tracking-[0.2em] uppercase font-semibold">Loading Marketplace...</p>
        </div>
      </div>
    }>
      <DeadStockMarketplaceContent />
    </Suspense>
  );
}
