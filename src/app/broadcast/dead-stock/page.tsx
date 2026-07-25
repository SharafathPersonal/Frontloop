'use client';

import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  MapPin,
  Filter,
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpZA,
  Store,
  Loader2,
  X,
  Navigation,
  Globe,
  Check,
} from 'lucide-react';
import { getDeadStockProducts, getActiveShops, getCategories } from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortOrder = 'LOW_TO_HIGH' | 'HIGH_TO_LOW';

// ─── Haversine Distance Utility ────────────────────────────────────────────────

function getHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// ─── Main Component ───────────────────────────────────────────────────────────

function DeadStockDirectory() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialShopId = searchParams.get('shopId') ?? 'ALL';

  // ── Reference data ──────────────────────────────────────────────────────────
  const [shops, setShops] = useState<{ id: string; shop_name: string; city: string | null }[]>([]);
  const [categories, setCategories] = useState<string[]>(['ALL']);

  // ── Buyer Location & Distance State ─────────────────────────────────────────
  const [buyerCoords, setBuyerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [maxRadiusKm, setMaxRadiusKm] = useState(15);
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  // ── Products + pagination ────────────────────────────────────────────────────
  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedShop, setSelectedShop] = useState(initialShopId);
  const [sortOrder, setSortOrder] = useState<SortOrder>('LOW_TO_HIGH');

  const isFirstPageRef = useRef(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Auto-trigger Buyer Geolocation on Mount
  // ─────────────────────────────────────────────────────────────────────────────
  const requestBuyerLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationDenied(true);
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBuyerCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        // Do not force nearMeActive = true on load so all products display by default
        setLocationDenied(false);
        setLocatingUser(false);
      },
      (err) => {
        console.warn('Buyer geolocation denied or unavailable:', err);
        setLocationDenied(true);
        setLocatingUser(false);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    requestBuyerLocation();
  }, [requestBuyerLocation]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Load reference data once on mount
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [fetchedShops, fetchedCategories] = await Promise.all([
        getActiveShops(),
        getCategories(),
      ]);
      setShops(fetchedShops);
      setCategories(['ALL', ...fetchedCategories]);
    })();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Debounce search — 300 ms strict
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Reset to page 1 whenever a filter or search changes
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    isFirstPageRef.current = true;
    setPage(1);
  }, [debouncedSearch, selectedCategory, selectedShop, selectedCity, sortOrder]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Server-side fetch
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const isFirstPage = isFirstPageRef.current;

    async function fetchProducts() {
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);

      const result = await getDeadStockProducts(
        selectedShop,
        selectedCategory,
        debouncedSearch,
        page,
        12,
        sortOrder
      );

      if (!cancelled) {
        if (isFirstPage) {
          setProducts(result.products);
          isFirstPageRef.current = false;
        } else {
          setProducts((prev) => [...prev, ...result.products]);
        }
        setHasMore(result.hasMore);
        setTotalCount(result.totalCount);
        setLoading(false);
        setLoadingMore(false);
      }
    }

    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, selectedCategory, selectedShop, sortOrder]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Infinite scroll observer
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

  // Extract unique cities from shops
  const uniqueCities = Array.from(
    new Set(shops.map((s) => s.city).filter(Boolean) as string[])
  );

  // Filter products by Distance / Near Me & City Dropdown
  const processedProducts = products
    .map((product) => {
      let distanceKm: number | null = null;
      if (
        buyerCoords &&
        product.shop?.latitude &&
        product.shop?.longitude
      ) {
        distanceKm = getHaversineDistanceKm(
          buyerCoords.lat,
          buyerCoords.lng,
          Number(product.shop.latitude),
          Number(product.shop.longitude)
        );
      }
      return { ...product, distanceKm };
    })
    .filter((product) => {
      // City Filter
      if (
        selectedCity !== 'ALL' &&
        product.shop?.city?.toLowerCase() !== selectedCity.toLowerCase()
      ) {
        return false;
      }
      // Near Me Proximity Filter
      if (nearMeActive) {
        if (product.distanceKm !== null && product.distanceKm > maxRadiusKm) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (nearMeActive && buyerCoords) {
        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        if (a.distanceKm !== null) return -1;
        if (b.distanceKm !== null) return 1;
      }
      return 0;
    });

  const clearAllFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategory('ALL');
    setSelectedShop('ALL');
    setSelectedCity('ALL');
    setNearMeActive(false);
  };

  const hasActiveFilters =
    debouncedSearch ||
    selectedCategory !== 'ALL' ||
    selectedShop !== 'ALL' ||
    selectedCity !== 'ALL' ||
    nearMeActive;

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-outfit text-[#3E3B36]">
      {/* ── Header Banner ───────────────────────────────────────────────────── */}
      <div className="bg-[#3E3B36] text-[#F5F1EA] py-12 px-6 border-b border-[#5C4033]/20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#C4A896] uppercase bg-[#C4A896]/10 border border-[#C4A896]/20 px-3 py-1 rounded-full">
              Live Hyperlocal Marketplace
            </span>
            <h1 className="serif-headline text-3xl md:text-5xl mt-3 text-white">
              Dead Stock & Clearance Deals
            </h1>
            <p className="text-sm md:text-base text-[#D4C5B9] mt-2 max-w-xl">
              Discover verified local shop inventory at up to 80% discount near your location.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/dead-stock"
              className="bg-[#C4A896] text-[#2A2825] font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-xl hover:bg-white transition-all shadow-md"
            >
              Merchant Portal →
            </Link>
          </div>
        </div>
      </div>

      {/* ── DYNAMIC BUYER LOCATION & DISTANCE CONTROL BAR ───────────────────── */}
      <div className="max-w-7xl mx-auto px-6 -mt-6 relative z-20">
        <div className="bg-white rounded-2xl p-4 border border-[#E5DCD3] shadow-lg flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Toggle Button: Near Me / All Locations */}
            <button
              onClick={() => {
                if (!buyerCoords) requestBuyerLocation();
                else setNearMeActive((prev) => !prev);
              }}
              disabled={locatingUser}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase flex items-center gap-2 transition-all shadow-sm ${
                nearMeActive
                  ? 'bg-amber-600 text-white shadow-amber-600/20'
                  : 'bg-[#FAF6F0] text-[#5C4033] border border-[#E5DCD3] hover:bg-[#E5DCD3]'
              }`}
            >
              {locatingUser ? (
                <Loader2 size={14} className="animate-spin" />
              ) : nearMeActive ? (
                <Navigation size={14} className="text-white fill-white" />
              ) : (
                <Globe size={14} />
              )}
              {nearMeActive ? `Near Me (<${maxRadiusKm}km)` : 'All Locations'}
            </button>

            {/* Radius Selector (when Near Me active) */}
            {nearMeActive && (
              <select
                value={maxRadiusKm}
                onChange={(e) => setMaxRadiusKm(Number(e.target.value))}
                className="px-3 py-2 bg-[#FAF6F0] border border-[#E5DCD3] rounded-xl text-xs font-bold text-[#5C4033] focus:outline-none cursor-pointer"
              >
                <option value={5}>Within 5 km</option>
                <option value={15}>Within 15 km</option>
                <option value={30}>Within 30 km</option>
                <option value={50}>Within 50 km</option>
              </select>
            )}

            {/* City Fallback Dropdown */}
            <div className="relative flex-1 sm:w-44">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-[#FAF6F0] border border-[#E5DCD3] rounded-xl text-xs font-bold text-[#5C4033] focus:outline-none cursor-pointer appearance-none"
              >
                <option value="ALL">All Cities</option>
                {uniqueCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <MapPin
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Location Status Alert */}
          <div className="text-xs text-slate-500 flex items-center gap-2">
            {buyerCoords ? (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
                <Check size={13} /> GPS Location Active
              </span>
            ) : locationDenied ? (
              <span className="text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
                <MapPin size={13} className="text-amber-600" /> Location unavailable. Using City selection fallback.
              </span>
            ) : (
              <span>Select location to find nearest shop deals</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Controls & Search Bar ──────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="bg-white rounded-2xl p-4 border border-[#E5DCD3] shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center">
          {/* Search Input */}
          <div className="relative w-full lg:w-96">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={18}
            />
            <input
              id="dead-stock-search-input"
              type="text"
              placeholder="Search items, brands, categories…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-[#FAF6F0] border border-[#E5DCD3] rounded-xl text-sm focus:outline-none focus:border-[#5C4033] placeholder:text-slate-400 text-[#3E3B36]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Shop Filter */}
            <div className="relative flex-1 md:flex-none md:w-48">
              <Store
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={16}
              />
              <select
                id="dead-stock-shop-filter"
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-[#FAF6F0] border border-[#E5DCD3] rounded-xl text-sm appearance-none focus:outline-none focus:border-[#5C4033] cursor-pointer"
              >
                <option value="ALL">All Shops</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.shop_name} ({shop.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="relative flex-1 md:flex-none md:w-40">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={16}
              />
              <select
                id="dead-stock-category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-[#FAF6F0] border border-[#E5DCD3] rounded-xl text-sm appearance-none focus:outline-none focus:border-[#5C4033] cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Toggle */}
            <button
              id="dead-stock-sort-toggle"
              onClick={() =>
                setSortOrder((prev) =>
                  prev === 'LOW_TO_HIGH' ? 'HIGH_TO_LOW' : 'LOW_TO_HIGH'
                )
              }
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FAF6F0] border border-[#E5DCD3] rounded-xl text-sm font-semibold text-[#5C4033] hover:bg-[#E5DCD3] transition-colors"
            >
              {sortOrder === 'LOW_TO_HIGH' ? (
                <ArrowDownAZ size={16} />
              ) : (
                <ArrowUpZA size={16} />
              )}
              <span className="hidden sm:inline">Price Sort</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Active Filter Chips ─────────────────────────────────────────────── */}
      {hasActiveFilters && (
        <div className="max-w-7xl mx-auto px-6 mt-6 flex flex-wrap items-center gap-2">
          {nearMeActive && (
            <span className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm">
              <Navigation size={12} className="text-white fill-white" /> Proximity &lt;{maxRadiusKm}km Active
              <button onClick={() => setNearMeActive(false)} className="ml-0.5 opacity-80 hover:opacity-100">
                <X size={12} />
              </button>
            </span>
          )}
          {selectedCity !== 'ALL' && (
            <span className="px-3 py-1 bg-[#5C4033] text-white text-xs font-bold rounded-full flex items-center gap-1.5">
              City: {selectedCity}
              <button onClick={() => setSelectedCity('ALL')} className="ml-0.5 opacity-80 hover:opacity-100">
                <X size={12} />
              </button>
            </span>
          )}
          {debouncedSearch && (
            <span className="px-3 py-1 bg-[#5C4033]/10 text-[#5C4033] text-xs font-bold rounded-full flex items-center gap-1.5 border border-[#5C4033]/20">
              "{debouncedSearch}"
              <button onClick={() => setSearchQuery('')} className="ml-0.5 opacity-60 hover:opacity-100">
                <X size={12} />
              </button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs text-rose-600 font-bold hover:underline ml-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Product Grid ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E5DCD3] overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-slate-100" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : processedProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#E5DCD3] shadow-sm">
            <AlertTriangle className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-700 mb-2">No Nearby Clearance Items Found</h3>
            <p className="text-slate-500">Try expanding your location radius or switching to All Cities.</p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-4 text-sm text-[#5C4033] font-bold underline underline-offset-2"
              >
                Clear all location filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {processedProducts.map((product) => (
                <Link
                  href={`/broadcast/dead-stock/${product.id}`}
                  key={product.id}
                  className="group flex flex-col bg-white rounded-2xl border border-[#E5DCD3] shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative"
                >
                  {/* Discount Badge */}
                  <div className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-rose-500 text-white text-[10px] font-black rounded-lg shadow-md tracking-wider">
                    {product.discount_percentage}% OFF
                  </div>

                  {/* Proximity Distance Badge */}
                  {product.distanceKm !== null && (
                    <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-amber-600 text-white text-[10px] font-bold rounded-lg shadow-md flex items-center gap-1">
                      <Navigation size={10} className="fill-white" />
                      {product.distanceKm} km away
                    </div>
                  )}

                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src={product.images[0]}
                        alt={product.product_name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                        <Store size={48} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <span className="text-white text-xs font-semibold">View Deal & Directions →</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    <span className="text-[9px] tracking-widest uppercase text-slate-400 font-bold mb-1 block">
                      {product.category}
                    </span>
                    <h3 className="text-base font-bold text-[#3E3B36] line-clamp-2 leading-snug mb-3 group-hover:text-[#5C4033] transition-colors">
                      {product.product_name}
                    </h3>

                    <div className="mt-auto">
                      <div className="flex items-end gap-2 mb-4">
                        <span className="text-xl font-black text-[#5C4033]">
                          ₹{parseFloat(product.clearance_price).toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 line-through mb-1">
                          ₹{parseFloat(product.original_price).toLocaleString()}
                        </span>
                      </div>

                      <div className="h-px bg-[#E5DCD3] mb-3" />

                      {/* Store & Proximity Badge */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#FAF6F0] border border-[#E5DCD3] flex items-center justify-center shrink-0">
                          <MapPin size={11} className="text-[#5C4033]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#5C4033] truncate">
                            {product.shop?.shop_name}
                          </p>
                          <p className="text-[10px] font-medium text-slate-500 truncate">
                            {[product.shop?.city, product.shop?.district].filter(Boolean).join(', ') || 'Local Store'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* ── Infinite Scroll Sentinel ───────────────────────────────── */}
            <div ref={sentinelRef} className="mt-12 flex justify-center min-h-[60px]">
              {loadingMore && (
                <div className="flex items-center gap-2 text-[#5C4033] text-sm font-semibold">
                  <Loader2 className="animate-spin" size={20} />
                  Loading more products…
                </div>
              )}
              {!hasMore && processedProducts.length > 0 && (
                <p className="text-xs text-slate-400 font-medium tracking-wider uppercase py-4">
                  — All {totalCount} item{totalCount !== 1 ? 's' : ''} loaded —
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DeadStockPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
          <Loader2 className="animate-spin text-[#5C4033]" size={32} />
        </div>
      }
    >
      <DeadStockDirectory />
    </Suspense>
  );
}
