'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { FlashOffer, Shop } from '@/types/broadcast';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import {
  Zap, Eye, EyeOff, Plus, Pencil, Trash2, X, Loader2,
  TrendingUp, Package, Download, Sparkles, Settings
} from 'lucide-react';

export default function FlashOffersPage() {
  const { showToast } = useToast();
  const [shop, setShop] = useState<Shop | null>(null);
  const [offers, setOffers] = useState<FlashOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editOffer, setEditOffer] = useState<FlashOffer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formOriginal, setFormOriginal] = useState('');
  const [formDiscount, setFormDiscount] = useState('');
  const [formPercentage, setFormPercentage] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [pricingMode, setPricingMode] = useState<'A' | 'B'>('A');
  const [formShowPercentageBadge, setFormShowPercentageBadge] = useState(true);
  const [formShowDiscountPrice, setFormShowDiscountPrice] = useState(true);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: shopData }, { data: offersData }] = await Promise.all([
      supabase.from('shops').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('shop_flash_offers').select('*')
        .eq('shop_id', user.id).eq('is_deleted', false)
        .order('created_at', { ascending: false }),
    ]);
    if (shopData) setShop(shopData);
    if (offersData) setOffers(offersData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const activeOffers = offers.filter(o => o.is_active && !o.is_deleted);
  const disabledOffers = offers.filter(o => !o.is_active && !o.is_deleted);
  const totalViews = offers.reduce((s, o) => s + (o.views_count || 0), 0);

  // Only show the latest 5 offers on this dashboard page
  const latestOffers = offers.slice(0, 5);

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
    setPricingMode('A');
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

  const handleSubmit = async () => {
    if (!shop) return;
    const orig = parseFloat(formOriginal);
    const disc = parseFloat(formDiscount);
    if (!formName.trim()) { showToast('Product name is required.', 'error'); return; }
    if (isNaN(orig) || orig <= 0) { showToast('Valid original price required.', 'error'); return; }
    if (isNaN(disc) || disc <= 0) { showToast('Valid discount price required.', 'error'); return; }
    if (disc >= orig) { showToast('Discount price must be less than original price.', 'error'); return; }

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
      };

      const res = await fetch('/api/flash-offers/create', {
        method: 'POST',
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
    } catch (err: any) {
      showToast(err.message || 'Failed to save offer.', 'error');
    } finally { setIsSubmitting(false); }
  };

  const toggleActive = async (offer: FlashOffer) => {
    const newState = !offer.is_active;
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, is_active: newState } : o));
    const { error } = await supabase.from('shop_flash_offers')
      .update({ is_active: newState }).eq('id', offer.id);
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
    if (error) { showToast('Failed to delete.', 'error'); loadData(); }
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

  // QR Code URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://broadcast.trueattendly.online';
  const portalUrl = shop?.slug ? `${appUrl}/offers/${shop.slug}` : null;
  const qrSrc = portalUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(portalUrl)}&color=3E3B36` : null;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-[#E8E3DA]/60 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-[#E8E3DA]/60 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-[#E8E3DA]/60 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Flash Offers</h1>
          <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mt-1">Live In-Store Discount Engine</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link href="/dashboard/flash-offers/manage" className="flex-1 sm:flex-none text-center border border-[#3E3B36] text-[#3E3B36] px-5 py-3 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-[#F5F1EA] transition-colors flex items-center justify-center gap-2">
            <Settings size={14} /> Manage Offers
          </Link>
          <button onClick={openCreate} className="flex-1 sm:flex-none bg-[#3E3B36] text-[#F5F1EA] px-5 py-3 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-[#2A2825] transition-colors flex items-center justify-center gap-2">
            <Plus size={14} /> New Offer
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Offers', value: activeOffers.length, icon: <Zap size={16} className="text-emerald-500" />, bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Total Views', value: totalViews.toLocaleString(), icon: <TrendingUp size={16} className="text-[#C4A896]" />, bg: 'bg-[#F5F1EA]', border: 'border-[#E8E3DA]' },
          { label: 'Disabled Offers', value: disabledOffers.length, icon: <EyeOff size={16} className="text-[#8B8378]" />, bg: 'bg-gray-50', border: 'border-gray-100' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} border ${stat.border} rounded-xl p-5 flex items-center gap-4`}>
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">{stat.icon}</div>
            <div>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">{stat.label}</p>
              <p className="serif-headline text-2xl text-[#3E3B36] leading-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* QR Section */}
      {portalUrl && (
        <div className="bg-white border border-[#E8E3DA] rounded-xl p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="bg-white p-3 rounded-xl border border-[#E8E3DA] shadow-sm flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc!} alt="Flash Offers QR" width={140} height={140} className="object-contain" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-[#3E3B36] mb-1">✨ Scan to see Today&apos;s Live Flash Offers!</p>
            <p className="text-[11px] text-[#8B8378] mb-3 break-all font-mono">{portalUrl}</p>
            <a href={qrSrc!} download={`flash-offers-qr-${shop?.slug}.png`}
              className="inline-flex items-center gap-2 bg-[#F5F1EA] border border-[#E8E3DA] text-[#3E3B36] px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase hover:bg-[#E8E3DA] transition-colors">
              <Download size={14} /> Download QR
            </a>
          </div>
        </div>
      )}

      {/* Latest 5 Offers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E3DA] pb-2">
          <h2 className="text-xs font-bold text-[#8B8378] uppercase tracking-[0.15em]">Latest 5 Offers</h2>
          {offers.length > 5 && (
            <Link href="/dashboard/flash-offers/manage" className="text-xs font-bold text-[#C4A896] hover:text-[#b09482] uppercase tracking-wider">
              View All {offers.length} Offers →
            </Link>
          )}
        </div>

        {latestOffers.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#E8E3DA] rounded-xl bg-white">
            <Package size={32} className="mx-auto text-[#E8E3DA] mb-3" />
            <p className="text-sm text-[#8B8378]">No offers found.</p>
            <button onClick={openCreate} className="mt-3 text-xs text-[#C4A896] font-bold uppercase tracking-wider hover:text-[#b09482]">Create your first offer</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestOffers.map(offer => (
              <div key={offer.id} className="bg-white border border-[#E8E3DA] rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                <div className="p-5 flex gap-4">
                  {/* Left Column: Preview Image */}
                  <div className="w-16 h-16 bg-[#FAFAF8] rounded-xl border border-black/5 flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden self-start">
                    {offer.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={offer.image_url} alt={offer.product_name} className="object-contain w-full h-full p-0.5" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-serif font-bold text-amber-800 bg-amber-50">
                        {offer.product_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Right Column: details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="text-sm font-bold text-[#3E3B36] leading-snug flex-1 truncate">{offer.product_name}</h3>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100 flex-shrink-0">
                        {discountPct(Number(offer.original_price), Number(offer.discount_price))}% OFF
                      </span>
                    </div>
                    {offer.offer_description && (
                      <p className="text-[11px] text-[#8B8378] leading-relaxed mb-1.5 line-clamp-1">{offer.offer_description}</p>
                    )}
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-base font-bold text-[#3E3B36]">₹{Number(offer.discount_price).toFixed(0)}</span>
                      <span className="text-xs text-[#8B8378] line-through">₹{Number(offer.original_price).toFixed(0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {/* Toggle */}
                      <button onClick={() => toggleActive(offer)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${offer.is_active ? 'bg-emerald-500' : 'bg-[#E8E3DA]'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${offer.is_active ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[#8B8378] flex items-center gap-1"><Eye size={12} />{offer.views_count}</span>
                        <button onClick={() => openEdit(offer)} className="p-1.5 text-[#8B8378] hover:text-[#C4A896] transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteConfirm(offer.id)} className="p-1.5 text-[#8B8378] hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Product Image (URL)</label>
                <input type="text" value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)} className="input-editorial" placeholder="https://example.com/product-image.jpg" />
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <span className="text-[9px] text-[#8B8378] self-center mr-1">Presets:</span>
                  {[
                    { name: '🥑 Avocado', url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=200' },
                    { name: '⌚ Watch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=200' },
                    { name: '👜 Tote Bag', url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=200' },
                    { name: '🧣 Scarf', url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=200' },
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
                  <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Offer Description</label>
                  <button type="button" onClick={handleAiPolish} disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-[#C4A896] text-[#C4A896] rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-[#F5F1EA] transition-colors disabled:opacity-50">
                    {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {aiLoading ? 'Generating...' : 'AI Polish Offer Text'}
                  </button>
                </div>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)}
                  className="input-editorial min-h-[80px] resize-none" placeholder="AI-generated or manual offer description..." />
              </div>
              <button onClick={handleSubmit} disabled={isSubmitting}
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
