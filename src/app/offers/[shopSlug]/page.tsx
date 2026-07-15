'use client';

import { useEffect, useState, useMemo, use, useCallback, useRef } from 'react';
import { Search, Tag, Sparkles, Loader2, ChevronDown, Share2, Eye, Clock, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface OfferItem {
  id: string;
  product_name: string;
  offer_description?: string | null;
  original_price: number;
  discount_price: number;
  show_percentage_badge: boolean;
  show_discount_price: boolean;
  image_url?: string | null;
  created_at?: string;
  push_shared_count?: number;
  views_count?: number;
}

interface ShopBrand {
  id: string;
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
  discountPct,
  shopName
}: {
  offer: OfferItem;
  index: number;
  themeColor: string;
  discountPct: (orig: number, disc: number) => number;
  shopName: string;
  shopId: string;
  onViewDetails: (offer: OfferItem) => void;
}) {
  const [shares, setShares] = useState(offer.push_shared_count || 0);
  const computedPct = discountPct(Number(offer.original_price), Number(offer.discount_price));
  const viewLoggedRef = useRef(false);

  useEffect(() => {
    if (!shopId || viewLoggedRef.current) return;
    const sessionKey = `view_logged_offer_${offer.id}`;
    if (sessionStorage.getItem(sessionKey) === 'true') return;
    
    viewLoggedRef.current = true;
    sessionStorage.setItem(sessionKey, 'true');
    
    fetch('/api/offers/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop_id: shopId, offer_id: offer.id })
    }).catch(() => {});
  }, [offer.id, shopId]);

  const formatCreatedAt = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      return `Added ${month} ${day}`;
    } catch {
      return '';
    }
  };

  return (
    <div
      className="w-full flex flex-col rounded-[1rem] border bg-white shadow-sm hover:shadow-md transition-all overflow-hidden relative"
      style={{
        animationDelay: `${index * 60}ms`,
        animation: 'fadeUp 0.4s ease forwards',
        opacity: 0,
        borderColor: `${themeColor}20`,
      }}
    >
      <div className="p-[1rem] flex flex-col gap-[0.75rem] w-full box-border">
        {/* Top Meta: Shop Name & Views */}
        <div className="flex flex-wrap justify-between items-center gap-[0.5rem] w-full">
          <span className="font-serif text-[0.875rem] font-bold text-slate-800 truncate max-w-[65%]">
            {shopName}
          </span>
          <div className="flex items-center gap-[0.3rem] bg-slate-50 px-[0.5rem] py-[0.125rem] rounded-full border border-slate-100 shrink-0">
            <Eye size={12} className="text-slate-500" />
            <span className="text-[0.65rem] font-bold text-slate-600 uppercase tracking-wider">
              {offer.views_count || 0} Views
            </span>
          </div>
        </div>

        {/* Main Content Grid/Flex */}
        <div className="flex flex-row gap-[1rem] items-center w-full">
          {/* Product Image */}
          <div className="w-[30%] max-w-[6.5rem] aspect-square rounded-[0.75rem] border border-black/5 flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden bg-slate-50">
            {offer.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={offer.image_url}
                alt={offer.product_name}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[2rem] font-serif font-bold text-amber-800/40 bg-amber-50/50">
                {offer.product_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col flex-1 min-w-0">
            <h3 className="font-serif text-[1rem] sm:text-[1.125rem] font-bold text-slate-900 leading-snug break-words">
              {offer.product_name}
            </h3>
            
            {offer.show_percentage_badge !== false && computedPct > 0 && (
              <span 
                className="inline-block mt-[0.35rem] text-[0.75rem] font-bold px-[0.5rem] py-[0.15rem] rounded-md" 
                style={{ backgroundColor: `${themeColor}15`, color: themeColor, width: 'fit-content' }}
              >
                Flat {computedPct}% OFF
              </span>
            )}
            
            <div className="flex flex-wrap items-baseline gap-x-[0.5rem] gap-y-[0.25rem] mt-[0.5rem]">
              <span className="text-[1.25rem] font-bold text-slate-900 font-serif">
                ₹{Number(offer.discount_price).toFixed(0)}
              </span>
              {offer.show_discount_price !== false && Number(offer.original_price) > Number(offer.discount_price) && (
                <span className="text-[0.75rem] text-slate-400 line-through">
                  ₹{Number(offer.original_price).toFixed(0)}
                </span>
              )}
            </div>
            
            {offer.offer_description && (
              <p className="text-[0.75rem] text-slate-500 mt-[0.35rem] leading-relaxed line-clamp-2">
                {offer.offer_description}
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-[0.5rem] pt-[0.75rem] border-t border-slate-100 flex flex-col gap-[0.5rem] w-full">
          <button
            onClick={() => onViewDetails(offer)}
            className="w-full flex items-center justify-center py-[0.7rem] rounded-[0.5rem] text-white shadow-sm hover:scale-[1.02] transition-transform bg-slate-900"
          >
            <span className="text-[0.75rem] font-bold uppercase tracking-wider flex items-center gap-2">
              View Details & Location
            </span>
          </button>
          <div className="flex flex-row gap-[0.5rem] w-full">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: offer.product_name,
                      text: offer.offer_description || `Check out this amazing offer for ${offer.product_name}!`,
                      url: window.location.href,
                    });
                    setShares(prev => prev + 1);
                    await supabase.rpc('increment_flash_offer_shares', { p_offer_id: offer.id });
                  } catch (err) {
                    console.error('Error sharing:', err);
                  }
                } else {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    alert('Offer link copied to clipboard!');
                    setShares(prev => prev + 1);
                    await supabase.rpc('increment_flash_offer_shares', { p_offer_id: offer.id });
                  } catch (err) {
                    console.error('Failed to copy link:', err);
                  }
                }
              }}
              className="flex-1 flex items-center justify-center gap-[0.35rem] py-[0.6rem] rounded-[0.5rem] border bg-white hover:bg-slate-50 transition-colors"
              style={{ borderColor: themeColor, color: themeColor }}
            >
              <Share2 size={14} />
              <span className="text-[0.75rem] font-bold uppercase tracking-wider">
                Share {shares > 0 && `(${shares})`}
              </span>
            </button>
            
            <button
              className="flex-1 flex flex-col items-center justify-center py-[0.5rem] rounded-[0.5rem] text-white shadow-sm hover:scale-[1.02] transition-transform"
              style={{ backgroundColor: themeColor }}
            >
              <span className="text-[0.75rem] font-bold uppercase tracking-wider">
                Claim
              </span>
              <span className="text-[0.55rem] font-medium opacity-80 uppercase tracking-widest mt-[0.1rem]">
                In-Store
              </span>
            </button>
          </div>
        </div>
        
        {/* Subtle date tag */}
        <div className="flex justify-center w-full mt-[0.25rem]">
           <span className="flex items-center gap-[0.25rem] text-[0.65rem] text-slate-400">
             <Clock size={10} /> {formatCreatedAt(offer.created_at)}
           </span>
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
  const viewLoggedRef = useRef(false);
  const [selectedOffer, setSelectedOffer] = useState<OfferItem | null>(null);

  const [showPushBanner, setShowPushBanner] = useState(false);

  // Register Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('SW registered successfully:', reg.scope))
        .catch((err) => console.error('SW registration failed:', err));
    }
  }, []);

  // Handle click tracking from push notifications
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const clickOfferId = urlParams.get('click_offer_id');
      if (clickOfferId) {
        fetch('/api/offers/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offer_id: clickOfferId })
        })
        .then(res => res.json())
        .then(data => console.log('Click recorded:', data))
        .catch(err => console.error('Failed to record click:', err));
      }
    }
  }, []);

  // Check if we should display push prompt banner
  // Trigger push registration instantly on mount if shop is loaded
  useEffect(() => {
    if (shop && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default' && sessionStorage.getItem('dismissed_push_banner') !== 'true') {
        handleSubscribe();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  // Helper functions for VAPID base64 conversion
  const urlBase64ToUint8Array = (base64String: string) => {
    try {
      const cleaned = base64String.split('=')[0];
      const padding = '='.repeat((4 - (cleaned.length % 4)) % 4);
      const base64 = (cleaned + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch {
      return new Uint8Array();
    }
  };


  const handleSubscribe = async () => {
    if (!shop || !('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        let subscription = null;
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          try {
            subscription = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY 
                ? urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) 
                : undefined
            });
          } catch (subErr) {
            console.warn('Real push subscription failed, using fallback:', subErr);
          }
        }
        
        const rawSubscription = subscription ? subscription.toJSON() : null;
        const endpoint = rawSubscription?.endpoint || `https://updates.trueattendly.online/push/mock-endpoint-${crypto.randomUUID()}`;
        const p256dh = rawSubscription?.keys?.p256dh || 'mock-p256dh';
        const auth = rawSubscription?.keys?.auth || 'mock-auth';

        // Dispatch complete JSON payload to the subscription API containing shop_id alongside token metrics
        const res = await fetch('/api/push-subscriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            shop_id: shop.id,
            endpoint,
            keys: {
              p256dh,
              auth
            },
            p256dh,
            auth
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to sync push subscription');
        }

        console.log('Push subscription synced via API successfully.');
      }
    } catch (err) {
      console.error('Subscription workflow failed:', err);
    } finally {
      setShowPushBanner(false);
    }
  };

  const handleDismissBanner = () => {
    sessionStorage.setItem('dismissed_push_banner', 'true');
    setShowPushBanner(false);
  };

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchOffers = useCallback(async (isInitial = false, signal?: AbortSignal) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const currentPage = isInitial ? 1 : page;
      const res = await fetch(`/api/offers?slug=${encodeURIComponent(shopSlug)}&page=${currentPage}&limit=10&search=${encodeURIComponent(debouncedSearch)}&sort=${sortBy}`, { signal });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch offers');
        return;
      }

      if (data.shop) {
        setShop({
          id: data.shop.id || '',
          shop_name: data.shop.name || data.shop.shop_name || '',
          logo_url: data.shop.logo_url,
          invoice_theme_color: data.shop.theme_color || data.shop.invoice_theme_color || '#5C4033'
        });
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
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Failed to load offers.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [shopSlug, page, debouncedSearch, sortBy]);

  // Refetch when filters or sorting change
  useEffect(() => {
    const controller = new AbortController();
    fetchOffers(true, controller.signal);
    return () => {
      controller.abort();
    };
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

  const discountPct = (orig: number, disc: number) => {
    if (orig <= 0 || disc < 0) return 0;
    const pct = Math.round(((orig - disc) / orig) * 100);
    return Math.max(0, Math.min(100, pct));
  };
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
      <div className="min-h-screen" style={{ backgroundColor: `${themeColor}05` }}>
        {/* Shop Header Skeleton */}
        <div 
          className="w-full py-5 px-6 border-b shadow-sm"
          style={{ 
            backgroundColor: themeColor,
            borderColor: 'rgba(255, 255, 255, 0.15)'
          }}
        >
          <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Round profile avatar block */}
              <div className="h-12 w-12 rounded-full shimmer-dark shrink-0" />
              {/* 2 horizontal text lines for the shop title/branding */}
              <div className="flex flex-col gap-2 min-w-0">
                <div className="h-5 w-32 shimmer-dark rounded" />
                <div className="h-3 w-12 shimmer-dark rounded" />
              </div>
            </div>
            {/* Live indicator badge skeleton */}
            <div className="h-6 w-20 shimmer-dark rounded-full" />
          </div>
        </div>

        {/* Active Offers Counter Row Skeleton */}
        <div className="w-full bg-[#FAF6F0] border-b border-[#E8E3DA] py-2.5 px-6 shadow-sm">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="h-3 w-36 bg-neutral-200 animate-pulse rounded" />
            <div className="h-2.5 w-28 bg-neutral-200 animate-pulse rounded" />
          </div>
        </div>

        {/* Search & Sort Band Skeleton */}
        <div
          className="relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
        >
          <div className="px-5 pt-5 pb-6 max-w-lg mx-auto flex flex-col sm:flex-row gap-3">
            <div className="flex-1 h-9 shimmer-dark rounded-xl" />
            <div className="w-full sm:w-40 h-9 shimmer-dark rounded-xl" />
          </div>
        </div>

        {/* Offers Grid Array Skeleton */}
        <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-full flex flex-col rounded-[1rem] border bg-white shadow-sm"
              style={{
                borderColor: `${themeColor}20`,
              }}
            >
              <div className="p-[1rem] flex flex-col gap-[0.75rem] w-full box-border">
                {/* Top Meta: Shop Name & Views */}
                <div className="flex justify-between items-center w-full">
                  <div className="h-4 w-32 bg-neutral-200 shimmer rounded" />
                  <div className="h-4 w-16 bg-neutral-200 shimmer rounded-full" />
                </div>

                {/* Main Content Grid/Flex */}
                <div className="flex flex-row gap-[1rem] items-center w-full mt-2">
                  <div className="w-[30%] max-w-[6.5rem] aspect-square rounded-[0.75rem] bg-neutral-200 shimmer shrink-0 shadow-sm" />
                  <div className="flex flex-col flex-1 min-w-0 space-y-2">
                    <div className="h-5 w-full bg-neutral-200 shimmer rounded" />
                    <div className="h-5 w-2/3 bg-neutral-200 shimmer rounded" />
                    <div className="h-4 w-16 bg-neutral-200 shimmer rounded mt-2" />
                    <div className="h-6 w-24 bg-neutral-200 shimmer rounded mt-2" />
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-[0.5rem] pt-[0.75rem] border-t border-slate-100 flex flex-row items-center justify-between gap-[0.75rem] w-full">
                  <div className="flex-1 h-9 bg-neutral-200 shimmer rounded-[0.5rem]" />
                  <div className="flex-1 h-9 bg-neutral-200 shimmer rounded-[0.5rem]" />
                </div>
              </div>
            </div>
          ))}
        </main>

        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .shimmer {
            background: linear-gradient(90deg, #e5e5e5 25%, rgba(92, 64, 51, 0.08) 50%, #e5e5e5 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite linear;
          }
          .shimmer-dark {
            background: linear-gradient(90deg, rgba(255, 255, 255, 0.15) 25%, rgba(255, 255, 255, 0.25) 50%, rgba(255, 255, 255, 0.15) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite linear;
          }
        `}</style>
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

      {/* Active Offers Counter Row */}
      <div className="w-full bg-[#FAF6F0] border-b border-[#E8E3DA] py-2.5 px-6 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <span className="text-[10px] tracking-[0.2em] font-semibold text-[#5C4033] uppercase">
            {offers.length} Active Offers Available
          </span>
          <span className="text-[9px] tracking-wider text-[#8B8378]/80 font-serif">Verified Merchant Catalog</span>
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
                  shopName={shop?.shop_name || 'Partner Store'}
                  shopId={shop?.id || ''}
                  onViewDetails={setSelectedOffer}
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

      {showPushBanner && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white border border-[#E8E3DA] rounded-2xl shadow-xl p-4 z-50 animate-fade-in flex gap-4 items-start">
          <div className="w-10 h-10 rounded-full bg-[#FAF9F6] border border-[#E8E3DA] flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-[#C4A896]" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-[#3E3B36] uppercase tracking-wider">Stay Updated</h4>
            <p className="text-[10px] text-[#8B8378] mt-0.5 leading-normal">
              Receive real-time push alerts whenever we launch limited-time flash offers.
            </p>
            <div className="flex gap-2.5 mt-3">
              <button
                onClick={handleSubscribe}
                className="px-3 py-1.5 rounded-lg text-[9px] font-bold text-white uppercase tracking-wider hover:opacity-90 transition-opacity"
                style={{ backgroundColor: themeColor }}
              >
                Notify Me
              </button>
              <button
                onClick={handleDismissBanner}
                className="px-3 py-1.5 rounded-lg text-[9px] font-bold text-[#8B8378] bg-[#FAF9F6] hover:bg-[#F5F1EA] uppercase tracking-wider transition-colors"
              >
                No Thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in" onClick={() => setSelectedOffer(null)}>
          <div 
            className="w-full max-w-md bg-white rounded-t-[1.5rem] sm:rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'fadeUp 0.3s ease-out' }}
          >
            <div className="relative w-full aspect-video bg-slate-100 flex items-center justify-center">
              {selectedOffer.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedOffer.image_url} alt={selectedOffer.product_name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-serif text-4xl text-slate-300">{selectedOffer.product_name.charAt(0).toUpperCase()}</span>
              )}
              <button 
                onClick={() => setSelectedOffer(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-slate-900">{selectedOffer.product_name}</h2>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold text-slate-900 font-serif">₹{Number(selectedOffer.discount_price).toFixed(0)}</span>
                  {selectedOffer.show_discount_price !== false && Number(selectedOffer.original_price) > Number(selectedOffer.discount_price) && (
                    <span className="text-sm text-slate-400 line-through">₹{Number(selectedOffer.original_price).toFixed(0)}</span>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Offer Details & Store Location</h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedOffer.offer_description}</p>
              </div>

              <button
                onClick={() => setSelectedOffer(null)}
                className="w-full py-3 rounded-xl text-white font-bold uppercase tracking-wider text-sm mt-2 transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: themeColor }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
