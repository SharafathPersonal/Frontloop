'use client';

import { useEffect, useState, useMemo, use, useCallback, useRef } from 'react';
import { Search, Tag, Sparkles, Loader2, ChevronDown } from 'lucide-react';

interface OfferItem {
  id: string;
  product_name: string;
  offer_description?: string | null;
  original_price: number;
  discount_price: number;
  show_percentage_badge: boolean;
  show_discount_price: boolean;
  image_url?: string | null;
}

interface ShopBrand {
  shop_name: string;
  logo_url?: string | null;
  invoice_theme_color: string;
}

// Fuzzy match: handles typos, case-insensitive, partial matches
function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q)) return true;
  // Subsequence match for typo tolerance
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

function getContrastColor(hexColor: string): string {
  if (!hexColor || hexColor.length < 6) return '#FFFFFF';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#1E293B' : '#FFFFFF';
}

function OfferCardComponent({
  offer,
  index,
  themeColor,
  discountPct
}: {
  offer: OfferItem;
  index: number;
  themeColor: string;
  discountPct: (orig: number, disc: number) => number;
}) {
  // Simulated initial time based on index (e.g. 1h 45m 12s, 2h 30m 05s, 58m 40s)
  const initialSeconds = index === 0 ? 6312 : index === 1 ? 9005 : index === 2 ? 3520 : (7200 + (index * 1200)) % 14400;
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => (prev > 0 ? prev - 1 : initialSeconds));
    }, 1000);
    return () => clearInterval(interval);
  }, [initialSeconds]);

  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [hrs, mins, secs].map(v => String(v).padStart(2, '0')).join(':');
  };

  const computedPct = discountPct(Number(offer.original_price), Number(offer.discount_price));

  return (
    <div
      className="rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all flex gap-4"
      style={{
        animationDelay: `${index * 60}ms`,
        animation: 'fadeUp 0.4s ease forwards',
        opacity: 0,
        borderColor: `${themeColor}20`,
        background: 'linear-gradient(135deg, #FCFBF9, #F5F1EA)'
      }}
    >
      {/* Left side: product image or placeholder */}
      <div className="w-20 h-20 bg-white rounded-xl border border-black/5 overflow-hidden flex items-center justify-center shrink-0 shadow-sm relative">
        {offer.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={offer.image_url}
            alt={offer.product_name}
            className="object-contain w-full h-full p-1"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl font-serif font-bold text-amber-800 bg-amber-50">
            {offer.product_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Right side: details */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex justify-between items-start gap-1">
            <h3 className="font-serif text-[11px] font-bold text-slate-800 tracking-wider uppercase truncate">
              {offer.product_name}
            </h3>
            {offer.show_percentage_badge !== false && (
              <span className="text-[11px] font-serif font-bold" style={{ color: themeColor }}>
                {computedPct}% OFF
              </span>
            )}
          </div>

          {offer.offer_description && (
            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 leading-normal">
              {offer.offer_description}
            </p>
          )}

          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-sm font-bold text-slate-900 font-serif">₹{Number(offer.discount_price).toFixed(0)}</span>
            {offer.show_discount_price !== false && (
              <span className="text-[10px] text-slate-400 line-through">₹{Number(offer.original_price).toFixed(0)}</span>
            )}
          </div>
        </div>

        {/* Bottom row: timer, button, label */}
        <div className="flex items-end justify-between mt-3 pt-2 border-t border-black/[0.03]">
          {/* Timer */}
          <div className="flex flex-col">
            <span className="text-[7px] text-slate-400 uppercase tracking-widest">Ends In</span>
            <span className="font-mono text-[10px] font-bold text-amber-800 mt-0.5">{formatTime(seconds)}</span>
          </div>

          {/* Button */}
          <div className="flex flex-col items-center">
            <button
              className="px-3.5 py-1 rounded text-[8px] font-bold uppercase tracking-wider text-white shadow-sm hover:scale-[1.02] transition-transform"
              style={{ backgroundColor: themeColor }}
            >
              View Details
            </button>
            <span className="text-[6px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Available In-Store Only
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicOffersPage({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { shopSlug } = use(params);
  const [shop, setShop] = useState<ShopBrand | null>(null);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price-asc' | 'price-desc'>('newest');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const loaderRef = useRef<HTMLDivElement>(null);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchOffers = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const currentPage = isInitial ? 1 : page;
      const res = await fetch(`/api/offers?slug=${encodeURIComponent(shopSlug)}&page=${currentPage}&limit=10&search=${encodeURIComponent(debouncedSearch)}&sort=${sortBy}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch offers');
        return;
      }

      if (data.shop) {
        setShop(data.shop);
      }

      const newOffers = data.offers || [];
      if (isInitial) {
        setOffers(newOffers);
        setPage(2);
      } else {
        setOffers(prev => [...prev, ...newOffers]);
        setPage(prev => prev + 1);
      }
      setHasMore(newOffers.length === 10);
    } catch {
      setError('Failed to load offers.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [shopSlug, page, debouncedSearch, sortBy]);

  // Refetch when filters or sorting change
  useEffect(() => {
    fetchOffers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sortBy]);

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          fetchOffers(false);
        }
      },
      { threshold: 0.1 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasMore, loading, loadingMore, fetchOffers]);

  const discountPct = (orig: number, disc: number) => Math.round(((orig - disc) / orig) * 100);
  const themeColor = shop?.invoice_theme_color || '#5C4033';
  const contrastColor = useMemo(() => getContrastColor(themeColor), [themeColor]);

  // Extract initials for luxury monogram logo
  const initials = useMemo(() => {
    if (!shop?.shop_name) return 'AB';
    const parts = shop.shop_name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return shop.shop_name.substring(0, 2).toUpperCase();
  }, [shop?.shop_name]);

  if (loading && offers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: `${themeColor}05` }}>
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: themeColor }} />
          <p className="text-sm text-gray-500">Loading offers...</p>
        </div>
      </div>
    );
  }

  if (error && offers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: `${themeColor}05` }}>
        <div className="text-center max-w-sm">
          <Tag size={40} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Shop Not Found</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: `${themeColor}05` }}>
      {/* ── Zone 1: Premium Luxury Brand Header ── */}
      <div 
        className="w-full py-5 px-6 border-b transition-colors shadow-sm"
        style={{ 
          backgroundColor: themeColor,
          color: contrastColor,
          borderColor: `${contrastColor}15`
        }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {shop?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shop.logo_url}
                alt={shop.shop_name}
                className="h-12 w-12 rounded-full object-contain bg-white p-1 border border-opacity-10 shadow-sm"
              />
            ) : (
              <div 
                className="h-12 w-12 rounded-full border flex items-center justify-center text-sm font-serif font-bold tracking-wider bg-white/20 p-1 border-opacity-10 shadow-sm uppercase"
              >
                {initials}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <h1 className="text-xl font-serif font-bold tracking-tight text-current truncate leading-tight">
                {shop?.shop_name}
              </h1>
              <span className="text-[9px] uppercase tracking-widest opacity-80 mt-0.5">Est. 2021</span>
            </div>
          </div>

          {/* Live indicator badge */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-serif font-bold uppercase tracking-wider bg-white/10 border"
            style={{ borderColor: `${contrastColor}20` }}
          >
            <span>Live Offers</span>
            <span className="flex h-1.5 w-1.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Zone 2: Gradient Search & Sort Band ───────────────────────────────── */}
      <header
        className="relative overflow-hidden animate-fade-in"
        style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/20 translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative z-10 px-5 pt-5 pb-6 max-w-lg mx-auto">
          {/* Controls: Search & Sort side by side */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search active offers..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-sm text-white placeholder-white/50 text-xs border border-white/20 focus:outline-none focus:border-white/40 transition-colors"
              />
            </div>
            <div className="relative shrink-0 w-full sm:w-40">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="w-full appearance-none bg-white/15 backdrop-blur-sm border border-white/20 text-xs text-white py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:border-white/40 cursor-pointer font-medium"
              >
                <option value="newest" className="text-slate-800 bg-white">Newest First</option>
                <option value="oldest" className="text-slate-800 bg-white">Oldest First</option>
                <option value="price-asc" className="text-slate-800 bg-white">Price: Low to High</option>
                <option value="price-desc" className="text-slate-800 bg-white">Price: High to Low</option>
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
            </div>
          </div>
        </div>
      </header>

      {/* Offers Grid */}
      <main className="px-4 py-6 max-w-lg mx-auto">
        {offers.length === 0 ? (
          <div className="text-center py-16">
            <Tag size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">{searchQuery ? 'No matching offers found.' : 'No offers available right now.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer, i) => (
              <OfferCardComponent
                key={offer.id}
                offer={offer}
                index={i}
                themeColor={themeColor}
                discountPct={discountPct}
              />
            ))}
          </div>
        )}

        {/* Load More / Infinite Scroll Target */}
        {hasMore && (
          <div ref={loaderRef} className="py-8 flex justify-center items-center">
            {loadingMore ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 size={16} className="animate-spin" style={{ color: themeColor }} /> Loading more offers...
              </div>
            ) : (
              <button onClick={() => fetchOffers(false)} className="text-[10px] uppercase font-bold tracking-wider py-2 px-4 border border-black/10 bg-white rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                Load More
              </button>
            )}
          </div>
        )}

        {/* Premium Platform Branding Footer */}
        <a
          href="https://trueattendly.online"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-6 mt-8 group"
          style={{ borderTop: `1px solid ${themeColor}26` }}
          aria-label="Powered by True Attendly – Visit our platform"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-light.png"
            alt="True Attendly"
            className="h-4 w-4 object-contain"
            style={{ filter: 'invert(1) brightness(2) contrast(2)', opacity: 0.8 }}
          />
          <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
            Powered by{' '}
            <span
              className="tracking-wide font-semibold text-sm"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              True Attendly
            </span>
          </span>
        </a>
      </main>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
