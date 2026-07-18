'use client';

import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
} from 'lucide-react';
import { getDeadStockProducts, getActiveShops, getCategories } from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortOrder = 'LOW_TO_HIGH' | 'HIGH_TO_LOW';

interface FilterState {
  searchQuery: string;   // raw input (not debounced)
  debouncedSearch: string;
  selectedCategory: string;
  selectedShop: string;
  sortOrder: SortOrder;
}

// ─── Main Component ───────────────────────────────────────────────────────────

function DeadStockDirectory() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialShopId = searchParams.get('shopId') ?? 'ALL';

  // ── Reference data ──────────────────────────────────────────────────────────
  const [shops, setShops] = useState<{ id: string; shop_name: string; city: string | null }[]>([]);
  const [categories, setCategories] = useState<string[]>(['ALL']);

  // ── Products + pagination ────────────────────────────────────────────────────
  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);        // initial / reset load
  const [loadingMore, setLoadingMore] = useState(false); // append load

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedShop, setSelectedShop] = useState(initialShopId);
  const [sortOrder, setSortOrder] = useState<SortOrder>('LOW_TO_HIGH');

  // Tracks whether the next fetch is a fresh load (page=1) or an append
  const isFirstPageRef = useRef(true);

  // ── Infinite scroll sentinel ─────────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Load reference data once on mount
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
  // 2. Debounce search — 300 ms strict
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Reset to page 1 whenever a filter or search changes.
  //    We set a flag on the ref so the fetch effect knows it's a fresh start.
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    isFirstPageRef.current = true;
    setPage(1);
  }, [debouncedSearch, selectedCategory, selectedShop, sortOrder]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Server-side fetch — triggered by page or filter changes
  //    All filtering/sorting/pagination delegated entirely to Prisma.
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const isFirstPage = isFirstPageRef.current;

    async function fetchProducts() {
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);

      const result = await getDeadStockProducts(
        selectedShop === 'ALL' ? null : selectedShop,
        selectedCategory === 'ALL' ? null : selectedCategory,
        debouncedSearch || null,
        page,
        24,
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
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, selectedCategory, selectedShop, sortOrder]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Infinite Scroll via IntersectionObserver on sentinel div
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
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
  // 6. Sync URL when shop filter changes
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedShop !== 'ALL') {
      router.replace(`/broadcast/dead-stock?shopId=${selectedShop}`, { scroll: false });
    } else if (searchParams.get('shopId')) {
      router.replace('/broadcast/dead-stock', { scroll: false });
    }
  }, [selectedShop, router, searchParams]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────
  const hasActiveFilters =
    selectedShop !== 'ALL' || selectedCategory !== 'ALL' || debouncedSearch !== '';

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedShop('ALL');
    setSortOrder('LOW_TO_HIGH');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#FAF6F0] font-outfit pb-24">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-[#5C4033] text-[#FAF6F0] pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 text-rose-300 text-xs font-bold tracking-widest uppercase rounded-full mb-4 border border-rose-500/30">
            <AlertTriangle size={14} /> Factory Clearance
          </span>
          <h1 className="serif-headline text-4xl md:text-5xl lg:text-6xl mb-6">
            Hyper-Local Dead Stock
          </h1>
          <p className="max-w-2xl mx-auto text-[#C4A896] text-sm md:text-base leading-relaxed">
            Discover massive discounts on unsold inventory from premium local merchants.
            No middlemen. No shipping waits. Contact directly via WhatsApp and pick up today.
          </p>
        </div>
      </header>

      {/* ── Control Panel ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg border border-[#E5DCD3] p-4 md:p-6 flex flex-col md:flex-row gap-4">

          {/* Search Input — debounced 300ms server-side trigger */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              id="dead-stock-search"
              type="text"
              placeholder="Search products, brands, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-[#FAF6F0] border border-[#E5DCD3] rounded-xl text-sm focus:outline-none focus:border-[#5C4033] focus:ring-1 focus:ring-[#5C4033] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-4">
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
          {debouncedSearch && (
            <span className="px-3 py-1 bg-[#5C4033]/10 text-[#5C4033] text-xs font-bold rounded-full flex items-center gap-1.5 border border-[#5C4033]/20">
              "{debouncedSearch}"
              <button onClick={() => setSearchQuery('')} className="ml-0.5 opacity-60 hover:opacity-100">
                <X size={12} />
              </button>
            </span>
          )}
          {selectedShop !== 'ALL' && (
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1.5 border border-amber-200">
              Shop Filter Active
              <button onClick={() => setSelectedShop('ALL')} className="ml-0.5 opacity-60 hover:opacity-100">
                <X size={12} />
              </button>
            </span>
          )}
          {selectedCategory !== 'ALL' && (
            <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-full flex items-center gap-1.5">
              {selectedCategory}
              <button onClick={() => setSelectedCategory('ALL')} className="ml-0.5 opacity-60 hover:opacity-100">
                <X size={12} />
              </button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800 transition-colors ml-1"
          >
            Clear all
          </button>
          <span className="ml-auto text-xs text-slate-400">
            {totalCount} result{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Product Grid ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 mt-12">
        {loading && page === 1 ? (
          /* Initial skeleton loader */
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
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#E5DCD3] shadow-sm">
            <AlertTriangle className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-700 mb-2">No Dead Stock Found</h3>
            <p className="text-slate-500">Try adjusting your filters or checking back later.</p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-4 text-sm text-[#5C4033] font-bold underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  href={`/broadcast/dead-stock/${product.id}`}
                  key={product.id}
                  className="group flex flex-col bg-white rounded-2xl border border-[#E5DCD3] shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative"
                >
                  {/* Discount Badge */}
                  <div className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-rose-500 text-white text-[10px] font-black rounded-lg shadow-md tracking-wider">
                    {product.discount_percentage}% OFF
                  </div>

                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                        <Store size={48} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <span className="text-white text-xs font-semibold">View Details →</span>
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

                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#FAF6F0] border border-[#E5DCD3] flex items-center justify-center shrink-0">
                          <MapPin size={10} className="text-[#5C4033]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#5C4033] truncate">
                            {product.shop?.shop_name}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {product.shop?.city}
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
              {!hasMore && products.length > 0 && (
                <p className="text-xs text-slate-400 font-medium tracking-wider uppercase py-4">
                  — All {totalCount} item{totalCount !== 1 ? 's' : ''} loaded —
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function DeadStockPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#5C4033] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DeadStockDirectory />
    </Suspense>
  );
}
