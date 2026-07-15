'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { FlashOffer, Shop } from '@/types/broadcast';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import {
  Zap, Eye, EyeOff, Plus, Pencil, Trash2, X, Loader2,
  TrendingUp, Package, Search, Sparkles, ArrowLeft,
  ChevronDown, UploadCloud, Send, MousePointerClick, Users,
  Calendar, Clock, Activity, Share2
} from 'lucide-react';

const PAGE_SIZE = 12;

type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'views-desc';
type FilterOption = 'all' | 'live' | 'scheduled' | 'concluded' | 'disabled';

const toLocalDatetimeString = (isoString?: string | null) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const renderStatusBadge = (status: string) => {
  if (status === 'draft') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#FAF6F0] text-[#5C4033] border border-[#E8E3DA] uppercase tracking-wider">
        <Calendar size={10} className="text-[#5C4033]" /> Scheduled
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
        <Activity size={10} className="text-emerald-700" /> Live Now
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-500 border border-gray-200 uppercase tracking-wider">
      <Clock size={10} className="text-gray-500" /> Concluded
    </span>
  );
};

export default function ManageOffersPage() {
  const { showToast } = useToast();
  const [shop, setShop] = useState<Shop | null>(null);
  const [offers, setOffers] = useState<FlashOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Search, Sort, Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  
  // Modal & form states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editOffer, setEditOffer] = useState<FlashOffer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Drag and Drop uploader state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formName, setFormName] = useState('');
  const [formOriginal, setFormOriginal] = useState('');
  const [formDiscount, setFormDiscount] = useState('');
  const [formPercentage, setFormPercentage] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [pricingMode, setPricingMode] = useState<'A' | 'B'>('A');
  const [formShowPercentageBadge, setFormShowPercentageBadge] = useState(true);
  const [formShowDiscountPrice, setFormShowDiscountPrice] = useState(true);
  const [formBroadcastWebPush, setFormBroadcastWebPush] = useState(false);
  const [formStartAt, setFormStartAt] = useState('');
  const [formEndAt, setFormEndAt] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState(0);

  const validateDates = (startVal: string, endVal: string): string | null => {
    if (startVal) {
      const start = new Date(startVal);
      const now = new Date();
      if (start.getTime() <= now.getTime() - 5000) {
        return "Start time must be in the future. Past timestamps are not allowed.";
      }
      if (endVal) {
        const end = new Date(endVal);
        if (end.getTime() <= start.getTime()) {
          return "End time must be after the start time.";
        }
      }
    } else if (endVal) {
      const start = new Date();
      const end = new Date(endVal);
      if (end.getTime() <= start.getTime()) {
        return "End time must be after the start time.";
      }
    }
    return null;
  };

  useEffect(() => {
    if (formStartAt || formEndAt) {
      const err = validateDates(formStartAt, formEndAt);
      setValidationError(err);
    } else {
      setValidationError(null);
    }
  }, [formStartAt, formEndAt]);

  // Infinite Scroll Anchor Ref
  const loaderRef = useRef<HTMLDivElement>(null);

  // Fetch shop metadata
  useEffect(() => {
    async function loadShop() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: shopData }, { count: subscribersCount }] = await Promise.all([
        supabase.from('shops').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }).eq('shop_id', user.id)
      ]);
      if (shopData) setShop(shopData);
      setSubscribers(subscribersCount || 0);
    }
    loadShop();
  }, []);

  // Fetch offers with pagination, filters, sorts
  const fetchOffers = useCallback(async (isInitial = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const startOffset = isInitial ? 0 : offers.length;
    const endOffset = startOffset + PAGE_SIZE - 1;

    let query = supabase
      .from('shop_flash_offers')
      .select('*')
      .eq('shop_id', user.id)
      .eq('is_deleted', false);

    // Apply filter state
    if (filterBy === 'live') {
      query = query.eq('is_active', true).eq('status', 'active');
    } else if (filterBy === 'scheduled') {
      query = query.eq('is_active', true).eq('status', 'draft');
    } else if (filterBy === 'concluded') {
      query = query.eq('is_active', true).eq('status', 'expired');
    } else if (filterBy === 'disabled') {
      query = query.eq('is_active', false);
    }

    // Apply search state
    if (searchQuery.trim()) {
      query = query.ilike('product_name', `%${searchQuery}%`);
    }

    // Apply sort state
    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sortBy === 'price-asc') {
      query = query.order('discount_price', { ascending: true });
    } else if (sortBy === 'price-desc') {
      query = query.order('discount_price', { ascending: false });
    } else if (sortBy === 'views-desc') {
      query = query.order('views_count', { ascending: false });
    }

    // Pagination bounds
    query = query.range(startOffset, endOffset);

    const { data, error } = await query;

    if (error) {
      showToast(error.message || 'Failed to fetch offers.', 'error');
    } else {
      if (data) {
        if (isInitial) {
          setOffers(data);
        } else {
          setOffers(prev => [...prev, ...data]);
        }
        setHasMore(data.length === PAGE_SIZE);
      }
    }

    setLoading(false);
    setLoadingMore(false);
  }, [filterBy, sortBy, searchQuery, offers.length, showToast]);

  // Trigger reload on filter/sort/search change
  useEffect(() => {
    fetchOffers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterBy, sortBy, searchQuery]);

  // Set up intersection observer for infinite scroll
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

  const resetForm = () => {
    setFormName('');
    setFormOriginal('');
    setFormDiscount('');
    setFormPercentage('');
    setFormDescription('');
    setFormImageUrl('');
    setPricingMode('A');
    setFormShowPercentageBadge(true);
    setFormShowDiscountPrice(true);
    setFormBroadcastWebPush(false);
    setFormStartAt('');
    setFormEndAt('');
    setValidationError(null);
  };

  const openCreate = () => { resetForm(); setEditOffer(null); setIsCreateOpen(true); };

  const openEdit = (o: FlashOffer) => {
    setFormName(o.product_name);
    setFormOriginal(String(o.original_price));
    setFormDiscount(String(o.discount_price));
    const pct = Math.round(((Number(o.original_price) - Number(o.discount_price)) / Number(o.original_price)) * 100);
    setFormPercentage(String(pct));
    setFormDescription(o.offer_description || '');
    setFormImageUrl(o.image_url || '');
    setFormShowPercentageBadge(o.show_percentage_badge !== false);
    setFormShowDiscountPrice(o.show_discount_price !== false);
    setFormBroadcastWebPush(false); // Default OFF for edit mode safety (Rule 128)
    setPricingMode('A');
    setFormStartAt(toLocalDatetimeString(o.start_at));
    setFormEndAt(toLocalDatetimeString(o.end_at));
    setValidationError(null);
    setEditOffer(o);
    setIsCreateOpen(true);
  };

  // Bidirectional calculator methods
  const handleOriginalPriceChange = (val: string) => {
    setFormOriginal(val);
    const orig = parseFloat(val);
    if (isNaN(orig) || orig <= 0) return;

    if (pricingMode === 'A') {
      const disc = parseFloat(formDiscount);
      if (!isNaN(disc) && disc > 0 && disc < orig) {
        const pct = Math.round(((orig - disc) / orig) * 100);
        setFormPercentage(String(pct));
      }
    } else {
      const pct = parseFloat(formPercentage);
      if (!isNaN(pct) && pct >= 0 && pct <= 100) {
        const disc = orig - (orig * (pct / 100));
        setFormDiscount(disc.toFixed(2));
      }
    }
  };

  const handleDiscountPriceChange = (val: string) => {
    setFormDiscount(val);
    const disc = parseFloat(val);
    const orig = parseFloat(formOriginal);
    if (isNaN(disc) || disc <= 0 || isNaN(orig) || orig <= 0) return;

    if (disc < orig) {
      const pct = Math.round(((orig - disc) / orig) * 100);
      setFormPercentage(String(pct));
    }
  };

  const handleDiscountPercentageChange = (val: string) => {
    setFormPercentage(val);
    const pct = parseFloat(val);
    const orig = parseFloat(formOriginal);
    if (isNaN(pct) || pct < 0 || pct > 100 || isNaN(orig) || orig <= 0) return;

    const disc = orig - (orig * (pct / 100));
    setFormDiscount(disc.toFixed(2));
  };

  const handleImageUpload = async (file: File) => {
    if (!shop) {
      showToast('Shop data not loaded yet.', 'error');
      return;
    }
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filePath = `${shop.id}/${Date.now()}-${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('flash-offers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('flash-offers')
        .getPublicUrl(filePath);

      setFormImageUrl(publicUrl);
      showToast('Image uploaded successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Image upload failed.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!shop) return;
    const orig = parseFloat(formOriginal);
    const disc = parseFloat(formDiscount);
    if (!formName.trim()) { showToast('Product name is required.', 'error'); return; }
    if (!formDescription.trim()) { showToast('Offer Description / Item Location is required.', 'error'); return; }
    if (isNaN(orig) || orig <= 0) { showToast('Valid original price required.', 'error'); return; }
    if (isNaN(disc) || disc <= 0) { showToast('Valid discount price required.', 'error'); return; }
    if (disc >= orig) { showToast('Discount price must be less than original price.', 'error'); return; }

    const err = validateDates(formStartAt, formEndAt);
    if (err) {
      setValidationError(err);
      showToast(err, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: editOffer?.id || undefined,
        product_name: formName.trim(),
        original_price: orig,
        discount_price: disc,
        offer_description: formDescription.trim() || null,
        show_percentage_badge: formShowPercentageBadge,
        show_discount_price: formShowDiscountPrice,
        image_url: formImageUrl.trim() || null,
        broadcast_web_push: formBroadcastWebPush,
        start_at: formStartAt ? new Date(formStartAt).toISOString() : '',
        end_at: formEndAt ? new Date(formEndAt).toISOString() : null,
        status: formStartAt ? 'draft' : 'active'
      };

      const res = await fetch('/api/flash-offers', {
        method: editOffer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to save offer.');
      }

      const savedOffer = resData.data;

      if (editOffer) {
        setOffers(prev => prev.map(o => o.id === editOffer.id ? savedOffer : o));
        showToast('Offer updated successfully.', 'success');
      } else {
        setOffers(prev => [savedOffer, ...prev]);
        showToast('Flash offer created!', 'success');
      }
      setIsCreateOpen(false); resetForm(); setEditOffer(null);
      // Refetch offers to refresh statistics and page state
      fetchOffers(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to save offer.', 'error');
    } finally { setIsSubmitting(false); }
  };

  const toggleActive = async (offer: FlashOffer) => {
    const newState = !offer.is_active;
    const now = new Date();
    const start = offer.start_at ? new Date(offer.start_at) : now;
    const end = offer.end_at ? new Date(offer.end_at) : null;
    let newStatus: 'draft' | 'active' | 'expired' = 'active';
    if (start > now) {
      newStatus = 'draft';
    } else if (end && end <= now) {
      newStatus = 'expired';
    }

    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, is_active: newState, status: newStatus } : o));
    const { error } = await supabase.from('shop_flash_offers')
      .update({ is_active: newState, status: newStatus }).eq('id', offer.id);
    if (error) {
      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, is_active: !newState } : o));
      showToast('Failed to toggle status.', 'error');
    } else {
      showToast(newState ? 'Offer activated.' : 'Offer disabled.', 'success');
    }
  };

  const softDelete = async (id: string) => {
    setOffers(prev => prev.filter(o => o.id !== id));
    const { error } = await supabase.from('shop_flash_offers')
      .update({ is_deleted: true }).eq('id', id);
    if (error) { showToast('Failed to delete.', 'error'); fetchOffers(true); }
    else { showToast('Offer removed.', 'success'); }
    setDeleteConfirm(null);
  };

  const handleAiPolish = async () => {
    if (!formName.trim()) { showToast('Enter a product name first.', 'error'); return; }
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/flash-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: formName,
          original_price: formOriginal,
          discount_price: formDiscount,
          discount_percentage: formPercentage
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');
      if (data.polished_text) setFormDescription(data.polished_text);
      showToast('AI copy generated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'AI polish failed.', 'error');
    } finally { setAiLoading(false); }
  };

  const discountPct = (orig: number, disc: number) => Math.round(((orig - disc) / orig) * 100);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/flash-offers" className="p-2 border border-[#E8E3DA] rounded-xl text-[#8B8378] hover:text-[#3E3B36] bg-white transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Manage Offers</h1>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mt-1">Full Inventory Control &amp; Optimization</p>
          </div>
        </div>
        <button onClick={openCreate} className="bg-[#3E3B36] text-[#F5F1EA] px-5 py-3 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-[#2A2825] transition-colors flex items-center gap-2">
          <Plus size={14} /> New Offer
        </button>
      </div>

      {/* Control Bar: Search, Filter, Sort */}
      <div className="bg-white border border-[#E8E3DA] rounded-xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B8378]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search offers..."
            className="w-full pl-11 pr-4 py-3 border border-[#E8E3DA] rounded-xl text-sm text-[#3E3B36] bg-white focus:outline-none focus:border-[#C4A896]"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
          {/* Filter */}
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <span className="text-[10px] tracking-wider text-[#8B8378] uppercase whitespace-nowrap">Status:</span>
            <div className="relative flex-1 sm:flex-none">
              <select
                value={filterBy}
                onChange={e => setFilterBy(e.target.value as FilterOption)}
                className="appearance-none bg-white border border-[#E8E3DA] text-xs text-[#3E3B36] py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:border-[#C4A896] cursor-pointer font-medium w-full sm:w-44"
              >
                <option value="all">All Offers</option>
                <option value="live">Live Now</option>
                <option value="scheduled">Scheduled</option>
                <option value="concluded">Concluded</option>
                <option value="disabled">Disabled Only</option>
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8B8378] pointer-events-none" />
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <span className="text-[10px] tracking-wider text-[#8B8378] uppercase whitespace-nowrap">Sort:</span>
            <div className="relative flex-1 sm:flex-none">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="appearance-none bg-white border border-[#E8E3DA] text-xs text-[#3E3B36] py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:border-[#C4A896] cursor-pointer font-medium w-full sm:w-44"
              >
                <option value="newest">Created: Newest</option>
                <option value="oldest">Created: Oldest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="views-desc">Views: High to Low</option>
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8B8378] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* List of Offers */}
      {loading && offers.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 bg-[#E8E3DA]/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#E8E3DA] rounded-xl bg-white">
          <Package size={40} className="mx-auto text-[#E8E3DA] mb-3" />
          <p className="text-sm text-[#8B8378]">No offers match your criteria.</p>
          <button onClick={openCreate} className="mt-3 text-xs text-[#C4A896] font-bold uppercase tracking-wider hover:text-[#b09482]">Create a new offer</button>
        </div>
      ) : (
        <div>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white border border-[#E8E3DA] rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F5F1EA] border-b border-[#E8E3DA]">
                <tr>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">Product</th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">Pricing / Badges</th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">Views</th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">Active Status</th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {offers.map(offer => {
                  const isPercentage = offer.show_percentage_badge !== false;
                  const isDiscounted = offer.show_discount_price !== false;
                  const pct = discountPct(Number(offer.original_price), Number(offer.discount_price));

                  return (
                    <tr key={offer.id} className="border-b border-[#E8E3DA]/60 last:border-0 hover:bg-[#F5F1EA]/30 transition-colors group">
                      <td colSpan={5} className="p-0">
                        <table className="w-full text-left border-collapse">
                          <tbody>
                            <tr className="hover:bg-[#F5F1EA]/30 transition-colors">
                              <td className="px-5 py-4 w-[40%]">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg border border-[#E8E3DA] overflow-hidden bg-[#FAFAF8] flex items-center justify-center shrink-0">
                                    {offer.image_url ? (
                                      <img src={offer.image_url} alt={offer.product_name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="font-serif font-bold text-amber-800 text-sm">{offer.product_name.charAt(0).toUpperCase()}</span>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-[#3E3B36]">{offer.product_name}</h4>
                                    {offer.offer_description && (
                                      <p className="text-xs text-[#8B8378] line-clamp-1 max-w-xs">{offer.offer_description}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 w-[20%]">
                                <div className="space-y-1">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-bold text-[#3E3B36]">₹{Number(offer.discount_price).toFixed(2)}</span>
                                    {isDiscounted && (
                                      <span className="text-xs text-[#8B8378] line-through">₹{Number(offer.original_price).toFixed(2)}</span>
                                    )}
                                  </div>
                                  {isPercentage && (
                                    <span className="inline-block text-[9px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">
                                      {pct}% OFF
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-4 w-[15%]">
                                <span className="text-xs text-[#8B8378] font-medium flex items-center gap-1">
                                  <Eye size={12} /> {offer.views_count}
                                </span>
                              </td>
                               <td className="px-5 py-4 w-[12%]">
                                 <div className="flex flex-col gap-2 items-start">
                                   {renderStatusBadge(offer.status)}
                                   {offer.status === 'draft' && offer.start_at && (
                                     <div className="text-[10px] text-[#8B8378] space-y-0.5 mt-1 font-medium">
                                       <p className="flex items-center gap-1"><Calendar size={10} /> Starts: {new Date(offer.start_at).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</p>
                                       {offer.end_at && (
                                         <p className="flex items-center gap-1"><Clock size={10} /> Ends: {new Date(offer.end_at).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</p>
                                       )}
                                     </div>
                                   )}
                                   {offer.status === 'active' && offer.end_at && (
                                     <div className="text-[10px] text-[#8B8378] space-y-0.5 mt-1 font-medium">
                                       <p className="flex items-center gap-1"><Clock size={10} /> Expires: {new Date(offer.end_at).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</p>
                                     </div>
                                   )}
                                   <button
                                     onClick={() => toggleActive(offer)}
                                     className={`relative w-11 h-6 rounded-full transition-colors ${offer.is_active ? 'bg-emerald-500' : 'bg-[#E8E3DA]'}`}
                                   >
                                     <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${offer.is_active ? 'left-[22px]' : 'left-0.5'}`} />
                                   </button>
                                 </div>
                               </td>
                              <td className="px-5 py-4 text-right w-[13%]">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => openEdit(offer)}
                                    className="p-2 border border-[#E8E3DA] rounded-lg bg-white text-[#8B8378] hover:text-[#C4A896] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(offer.id)}
                                    className="p-2 border border-[#E8E3DA] rounded-lg bg-white text-[#8B8378] hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            <tr className="bg-[#FAF9F6]">
                              <td colSpan={5} className="px-5 py-2.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 bg-[#FDFCFB] border border-[#E8E3DA]/80 rounded-lg">
                                  <div className="flex items-center gap-1.5 text-[#8B8378] text-[9px] uppercase font-bold tracking-wider shrink-0 pl-1">
                                    <TrendingUp size={11} className="text-[#C4A896]" /> Engagement Stats
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-6 w-full sm:w-auto">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-left">
                                      <span className="text-[9px] text-[#8B8378] font-medium whitespace-nowrap flex items-center gap-1"><Send size={10} className="text-amber-600" /> Total Sent:</span>
                                      <span className="text-xs font-bold text-[#3E3B36]">{offer.push_sent_count || 0}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-left">
                                      <span className="text-[9px] text-[#8B8378] font-medium whitespace-nowrap flex items-center gap-1"><MousePointerClick size={10} className="text-rose-500" /> Opened/Clicked:</span>
                                      <span className="text-xs font-bold text-[#3E3B36]">{offer.push_opened_count || 0}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-left">
                                      <span className="text-[9px] text-[#8B8378] font-medium whitespace-nowrap flex items-center gap-1"><Users size={10} className="text-purple-600" /> Subscribers:</span>
                                      <span className="text-xs font-bold text-[#3E3B36]">{subscribers}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="block lg:hidden space-y-4 w-full">
            {offers.map(offer => {
              const isPercentage = offer.show_percentage_badge !== false;
              const isDiscounted = offer.show_discount_price !== false;
              const pct = discountPct(Number(offer.original_price), Number(offer.discount_price));

              return (
                <div key={offer.id} className="bg-white border border-[#E8E3DA] rounded-xl p-5 shadow-sm space-y-4">
                  {/* Header Row */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md border border-[#E8E3DA] overflow-hidden bg-[#FAFAF8] flex items-center justify-center shrink-0">
                      {offer.image_url ? (
                        <img src={offer.image_url} alt={offer.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-serif font-bold text-amber-800 text-sm">{offer.product_name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-[#3E3B36] truncate">{offer.product_name}</h4>
                      {offer.offer_description && (
                        <p className="text-[11px] text-[#8B8378] line-clamp-1">{offer.offer_description}</p>
                      )}
                    </div>
                  </div>

                  {/* Pricing Badge Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-b border-[#E8E3DA]/30 py-2.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-[#3E3B36]">₹{Number(offer.discount_price).toFixed(0)}</span>
                      {isDiscounted && (
                        <span className="text-xs text-[#8B8378] line-through">₹{Number(offer.original_price).toFixed(0)}</span>
                      )}
                    </div>
                    {isPercentage && (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100">
                        {pct}% OFF
                      </span>
                    )}
                  </div>

                  {/* Active/Inactive Toggle & Views */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-2 items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] tracking-wider text-[#8B8378] uppercase">Status:</span>
                        <button
                          onClick={() => toggleActive(offer)}
                          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${offer.is_active ? 'bg-emerald-500' : 'bg-[#E8E3DA]'}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${offer.is_active ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                      </div>
                      {renderStatusBadge(offer.status)}
                      {offer.status === 'draft' && offer.start_at && (
                        <div className="text-[10px] text-[#8B8378] space-y-0.5 mt-1 font-medium">
                          <p className="flex items-center gap-1"><Calendar size={10} /> Starts: {new Date(offer.start_at).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</p>
                          {offer.end_at && (
                            <p className="flex items-center gap-1"><Clock size={10} /> Ends: {new Date(offer.end_at).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</p>
                          )}
                        </div>
                      )}
                      {offer.status === 'active' && offer.end_at && (
                        <div className="text-[10px] text-[#8B8378] space-y-0.5 mt-1 font-medium">
                          <p className="flex items-center gap-1"><Clock size={10} /> Expires: {new Date(offer.end_at).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-[#8B8378] flex items-center gap-1 font-medium">
                      <Eye size={12} /> {offer.views_count} views
                    </span>
                  </div>

                    {/* Engagement Stats Micro-Dashboard */}
                    <div className="bg-[#FAF9F6] border border-[#E8E3DA]/80 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-[#8B8378] text-[9px] uppercase font-bold tracking-wider pl-1">
                        <TrendingUp size={11} className="text-[#C4A896]" /> Engagement Stats
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white border border-[#E8E3DA]/45 rounded p-1.5 flex flex-col items-center">
                          <span className="text-[8px] text-[#8B8378] font-medium leading-tight">Sent</span>
                          <span className="text-xs font-bold text-[#3E3B36]">{offer.push_sent_count || 0}</span>
                        </div>
                        <div className="bg-white border border-[#E8E3DA]/45 rounded p-1.5 flex flex-col items-center">
                          <span className="text-[8px] text-[#8B8378] font-medium leading-tight">Opened</span>
                          <span className="text-xs font-bold text-[#3E3B36]">{offer.push_opened_count || 0}</span>
                        </div>
                        <div className="bg-white border border-[#E8E3DA]/45 rounded p-1.5 flex flex-col items-center">
                          <span className="text-[8px] text-[#8B8378] font-medium leading-tight">Subscribers</span>
                          <span className="text-xs font-bold text-[#3E3B36]">{subscribers}</span>
                        </div>
                      </div>
                    </div>

                  {/* Touch-Friendly Bottom Bar */}
                  <div className="flex justify-end items-center gap-3 pt-1 border-t border-[#E8E3DA]/30">
                    <button
                      onClick={() => openEdit(offer)}
                      className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-[#F5F1EA]/50 hover:bg-[#E8E3DA]/50 text-[#8B8378] hover:text-[#3E3B36] transition-colors"
                      title="Edit Offer"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(offer.id)}
                      className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-100/80 text-[#C4A896] hover:text-rose-600 transition-colors"
                      title="Delete Offer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Infinite Scroll Loader element */}
      {hasMore && (
        <div ref={loaderRef} className="py-8 flex justify-center items-center">
          {loadingMore ? (
            <div className="flex items-center gap-2 text-xs text-[#8B8378]">
              <Loader2 size={16} className="animate-spin text-[#C4A896]" /> Loading more offers...
            </div>
          ) : (
            <button onClick={() => fetchOffers(false)} className="text-xs text-[#C4A896] hover:text-[#b09482] uppercase font-bold tracking-wider py-2 px-4 border border-[#E8E3DA] bg-white rounded-xl">
              Load More
            </button>
          )}
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-[#3E3B36]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-[#E8E3DA] shadow-xl">
            <h3 className="text-sm font-bold text-[#3E3B36] mb-2">Remove Offer?</h3>
            <p className="text-xs text-[#8B8378] mb-5">This offer will be hidden from customers. Historical data is preserved.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-[#E8E3DA] rounded-lg text-xs font-bold tracking-wider uppercase text-[#8B8378] hover:bg-[#F5F1EA] transition-colors">Cancel</button>
              <button onClick={() => softDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase hover:bg-red-600 transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-[#3E3B36]/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg border border-[#E8E3DA] shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">{editOffer ? 'Edit Offer' : 'Create New Offer'}</h2>
              <button onClick={() => { setIsCreateOpen(false); resetForm(); setEditOffer(null); }} className="text-[#8B8378] hover:text-[#3E3B36] transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Product Name</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="input-editorial" placeholder="e.g. Organic Tomatoes" />
              </div>
              
              <div>
                <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Product Image</label>
                
                {formImageUrl ? (
                  <div className="relative border border-[#E8E3DA] rounded-xl overflow-hidden aspect-video bg-[#F5F1EA]/30 group">
                    <img src={formImageUrl} alt="Preview" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors min-h-[44px]"
                      >
                        <Trash2 size={14} /> Remove Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    onClick={() => document.getElementById('image-upload-input')?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragging ? 'border-[#C4A896] bg-[#F5F1EA]/50' : 'border-[#E8E3DA] hover:border-[#C4A896]/50 bg-white'
                    }`}
                  >
                    <input
                      type="file"
                      id="image-upload-input"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                    />
                    {uploadingImage ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-[#C4A896]" />
                        <p className="text-xs text-[#8B8378]">Uploading image to storage...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-10 h-10 bg-[#F5F1EA] rounded-lg flex items-center justify-center mx-auto">
                          <UploadCloud size={20} className="text-[#8B8378]" />
                        </div>
                        <p className="text-xs font-semibold text-[#3E3B36]">Drag & drop product image here</p>
                        <p className="text-[10px] text-[#8B8378]">or click to select file from device (JPEG, PNG)</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-1.5 mt-3 flex-wrap items-center">
                  <span className="text-[9px] text-[#8B8378] self-center mr-1 font-bold uppercase tracking-wider">Presets:</span>
                  {[
                    { name: 'Avocado', url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=200' },
                    { name: 'Watch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=200' },
                    { name: 'Tote Bag', url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=200' },
                    { name: 'Scarf', url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=200' },
                  ].map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setFormImageUrl(preset.url)}
                      className={`text-[8px] font-bold px-2 py-1 rounded border transition-colors ${formImageUrl === preset.url ? 'bg-[#3E3B36] text-white border-transparent' : 'bg-[#F5F1EA] text-[#3E3B36] border-[#E8E3DA] hover:bg-[#E8E3DA]'}`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bidirectional Mode Selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Pricing Entry Mode</label>
                <div className="flex border border-[#E8E3DA] rounded-xl overflow-hidden bg-gray-50/50 p-1">
                  <button
                    type="button"
                    onClick={() => setPricingMode('A')}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded-lg ${pricingMode === 'A' ? 'bg-[#3E3B36] text-[#F5F1EA] shadow-sm' : 'text-[#8B8378] hover:text-[#3E3B36]'}`}
                  >
                    Mode A: Price to %
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingMode('B')}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded-lg ${pricingMode === 'B' ? 'bg-[#3E3B36] text-[#F5F1EA] shadow-sm' : 'text-[#8B8378] hover:text-[#3E3B36]'}`}
                  >
                    Mode B: % to Price
                  </button>
                </div>
              </div>

              {/* Dynamic Inputs based on mode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Original Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formOriginal}
                    onChange={e => handleOriginalPriceChange(e.target.value)}
                    className="input-editorial"
                    placeholder="100.00"
                  />
                  {formOriginal && (
                    <span className="text-[9px] text-[#8B8378] mt-1 block">Original: ₹{Number(formOriginal).toFixed(2)}</span>
                  )}
                </div>

                {pricingMode === 'A' ? (
                  <div>
                    <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Discount Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formDiscount}
                      onChange={e => handleDiscountPriceChange(e.target.value)}
                      className="input-editorial"
                      placeholder="79.00"
                    />
                    {formOriginal && formDiscount && parseFloat(formDiscount) < parseFloat(formOriginal) && (
                      <span className="text-[9px] font-bold text-emerald-600 mt-1 block">
                        Calculated: {formPercentage}% OFF
                      </span>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Discount %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formPercentage}
                      onChange={e => handleDiscountPercentageChange(e.target.value)}
                      className="input-editorial"
                      placeholder="21"
                    />
                    {formOriginal && formPercentage && parseFloat(formPercentage) >= 0 && (
                      <span className="text-[9px] font-bold text-emerald-600 mt-1 block">
                        Calculated Price: ₹{Number(formDiscount || 0).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Scheduling Engine Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5 flex items-center gap-1"><Calendar size={12} className="text-[#5C4033]" /> Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formStartAt}
                    onChange={e => setFormStartAt(e.target.value)}
                    className="input-editorial focus:border-[#5C4033] focus:ring-[#5C4033]/20"
                    placeholder="Now"
                  />
                  <span className="text-[9px] text-[#8B8378] mt-1 block">Defaults to now if empty</span>
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5 flex items-center gap-1"><Clock size={12} className="text-[#8B8378]" /> End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formEndAt}
                    onChange={e => setFormEndAt(e.target.value)}
                    className="input-editorial focus:border-[#5C4033] focus:ring-[#5C4033]/20"
                  />
                  <span className="text-[9px] text-[#8B8378] mt-1 block">Optional (never expires)</span>
                </div>
              </div>

              {/* Broadcast Web Push Control */}
              <div className="flex items-center justify-between p-4 bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded-xl">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-[#3E3B36] uppercase tracking-wider">Broadcast via Web Push</span>
                  <span className="text-[10px] text-[#8B8378]">Instantly notify all store browsers (+2 Credits)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormBroadcastWebPush(!formBroadcastWebPush)}
                  className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                  style={{ backgroundColor: formBroadcastWebPush ? '#5C4033' : '#E8E3DA' }}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formBroadcastWebPush ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Customer UI Visibility Checkboxes */}
              <div className="bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded-xl p-4 space-y-3">
                <p className="text-[9px] tracking-wider text-[#8B8378] uppercase font-bold">Public Display Controls</p>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="show_percentage_badge"
                    checked={formShowPercentageBadge}
                    onChange={e => setFormShowPercentageBadge(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E8E3DA] text-[#3E3B36] focus:ring-[#C4A896] cursor-pointer"
                  />
                  <label htmlFor="show_percentage_badge" className="text-xs text-[#3E3B36] select-none cursor-pointer">
                    Show discount percentage badge (e.g. <span className="font-semibold text-emerald-600">30% OFF</span>)
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="show_discount_price"
                    checked={formShowDiscountPrice}
                    onChange={e => setFormShowDiscountPrice(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E8E3DA] text-[#3E3B36] focus:ring-[#C4A896] cursor-pointer"
                  />
                  <label htmlFor="show_discount_price" className="text-xs text-[#3E3B36] select-none cursor-pointer">
                    Show original slashed price next to discounted price
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Offer Description / Item Location <span className="text-red-500">*</span></label>
                  <button type="button" onClick={handleAiPolish} disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-[#C4A896] text-[#C4A896] rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-[#F5F1EA] transition-colors disabled:opacity-50">
                    {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {aiLoading ? 'Generating...' : 'AI Polish Offer Text'}
                  </button>
                </div>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)}
                  className="input-editorial min-h-[80px] resize-none" placeholder="Enter physical location in store (e.g., Aisle 3, Top Shelf) and offer details..." />
              </div>
              {validationError && (
                <div className="bg-[#FAF6F0] border border-[#5C4033]/30 rounded-xl p-4 text-[#5C4033] text-xs font-medium space-y-1 mb-4">
                  <p className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5"><Clock size={12} /> Scheduling Validation Warning</p>
                  <p>{validationError}</p>
                </div>
              )}
              <button onClick={handleSubmit} disabled={isSubmitting || !!validationError}
                className="w-full bg-[#3E3B36] text-[#F5F1EA] py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-[#2A2825] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : editOffer ? 'Update Offer' : 'Create Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
