'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/contexts/ToastContext';
import { Upload, X, Loader2, Package, AlertTriangle, IndianRupee, Tag, FileText, ChevronDown, MapPin, Sparkles } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';
import LocationAutocomplete, { LocationData } from '@/components/ui/LocationAutocomplete';

const CATEGORIES = ['Clothing', 'Electronics', 'Grocery', 'Furniture', 'Footwear', 'Sports', 'Toys', 'Books', 'Home Decor', 'Stationery', 'Other'];

const MAX_IMAGES = 4;

/**
 * Client-side Canvas Image Compression
 * Resizes large photos to max 1600px dimension and converts to 82% WebP format
 * significantly reducing bandwidth and Supabase Storage usage.
 */
async function compressImage(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  if (file.size < 300 * 1024) return file;

  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
          type: 'image/webp',
          lastModified: Date.now(),
        });
        resolve(compressedFile);
      }, 'image/webp', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
  });
}

export default function NewDeadStockPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [form, setForm] = useState({
    product_name: '',
    original_price: '',
    clearance_price: '',
    category: 'Clothing',
    description: '',
    condition_notes: '',
  });

  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setCategoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const discountPct = form.original_price && form.clearance_price
    ? Math.max(0, Math.round(((parseFloat(form.original_price) - parseFloat(form.clearance_price)) / parseFloat(form.original_price)) * 100))
    : 0;

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_IMAGES - imageFiles.length;
    const newFiles = Array.from(files).slice(0, remaining);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setImageFiles(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  }, [imageFiles.length]);

  const removeImage = (idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => { URL.revokeObjectURL(prev[idx]); return prev.filter((_, i) => i !== idx); });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const uploadImages = async (shopId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of imageFiles) {
      // Client-side image compression prior to Supabase upload
      const compressedFile = await compressImage(file);
      const ext = compressedFile.name.split('.').pop() || 'webp';
      const path = `dead-stock/${shopId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, compressedFile, { upsert: true, contentType: compressedFile.type });
      if (error) { console.error('Upload error', error); continue; }
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      urls.push(publicUrl);
    }
    return urls;
  };

  const [storeLocation, setStoreLocation] = useState<LocationData | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiGeneratingStory, setIsAiGeneratingStory] = useState(false);

  const inferCategoryFromProduct = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('shoe') || lower.includes('boot') || lower.includes('sneaker') || lower.includes('sandal') || lower.includes('footwear') || lower.includes('heel') || lower.includes('slipper') || lower.includes('chappal')) return 'Footwear';
    if (lower.includes('shirt') || lower.includes('pant') || lower.includes('dress') || lower.includes('jeans') || lower.includes('t-shirt') || lower.includes('cloth') || lower.includes('jacket') || lower.includes('saree') || lower.includes('kurti')) return 'Clothing';
    if (lower.includes('phone') || lower.includes('laptop') || lower.includes('mobile') || lower.includes('headphone') || lower.includes('charger') || lower.includes('tv') || lower.includes('camera') || lower.includes('electronic') || lower.includes('watch')) return 'Electronics';
    if (lower.includes('chair') || lower.includes('table') || lower.includes('desk') || lower.includes('sofa') || lower.includes('bed') || lower.includes('furniture') || lower.includes('cabinet')) return 'Furniture';
    if (lower.includes('ball') || lower.includes('bat') || lower.includes('racket') || lower.includes('gym') || lower.includes('sport') || lower.includes('fitness')) return 'Sports';
    if (lower.includes('toy') || lower.includes('game') || lower.includes('doll') || lower.includes('puzzle')) return 'Toys';
    if (lower.includes('book') || lower.includes('novel') || lower.includes('notebook')) return 'Books';
    if (lower.includes('pen') || lower.includes('paper') || lower.includes('office') || lower.includes('stationery')) return 'Stationery';
    if (lower.includes('food') || lower.includes('rice') || lower.includes('snack') || lower.includes('grocery') || lower.includes('oil') || lower.includes('tea')) return 'Grocery';
    if (lower.includes('lamp') || lower.includes('decor') || lower.includes('curtain') || lower.includes('mirror')) return 'Home Decor';
    return 'Other';
  };

  const handleAutoCategory = () => {
    if (!form.product_name.trim()) {
      showToast('Please enter a Product Name first.', 'error');
      return;
    }
    const cat = inferCategoryFromProduct(form.product_name);
    setForm(prev => ({ ...prev, category: cat }));
    showToast(`AI Category set to: ${cat}`, 'success');
  };

  const handleGenerateAiDescription = async () => {
    let activeCat = form.category.trim();
    if ((!activeCat || activeCat === 'Clothing') && form.product_name.trim()) {
      activeCat = inferCategoryFromProduct(form.product_name);
      setForm(prev => ({ ...prev, category: activeCat }));
    }

    const missing: string[] = [];
    if (!form.product_name.trim()) missing.push('Product Name');
    if (!activeCat) missing.push('Category');
    if (!form.original_price.trim() || parseFloat(form.original_price) <= 0) missing.push('Original Price');
    if (!form.clearance_price.trim() || parseFloat(form.clearance_price) <= 0) missing.push('Clearance Price');

    if (missing.length > 0) {
      showToast(`Please complete the required fields first: ${missing.join(', ')}.`, 'error');
      return;
    }

    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/ai/status-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'description',
          product_name: form.product_name,
          category: activeCat,
          original_price: form.original_price,
          clearance_price: form.clearance_price,
        }),
      });
      const data = await res.json();
      if (res.ok && (data.description || data.condition_notes)) {
        setForm((prev) => ({
          ...prev,
          description: data.description || prev.description,
          condition_notes: data.condition_notes || prev.condition_notes,
        }));
        showToast('AI Description & Condition Story generated!', 'success');
      } else {
        throw new Error(data.error || 'Failed to generate AI story');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI generation failed';
      showToast(msg, 'error');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleGenerateAiStory = async () => {
    let activeCat = form.category.trim();
    if ((!activeCat || activeCat === 'Clothing') && form.product_name.trim()) {
      activeCat = inferCategoryFromProduct(form.product_name);
      setForm(prev => ({ ...prev, category: activeCat }));
    }

    const missing: string[] = [];
    if (!form.product_name.trim()) missing.push('Product Name');
    if (!activeCat) missing.push('Category');
    if (!form.original_price.trim() || parseFloat(form.original_price) <= 0) missing.push('Original Price');
    if (!form.clearance_price.trim() || parseFloat(form.clearance_price) <= 0) missing.push('Clearance Price');

    if (missing.length > 0) {
      showToast(`Please complete the required fields first: ${missing.join(', ')}.`, 'error');
      return;
    }

    setIsAiGeneratingStory(true);
    try {
      const res = await fetch('/api/ai/status-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'description',
          product_name: form.product_name,
          category: activeCat,
          original_price: form.original_price,
          clearance_price: form.clearance_price,
        }),
      });
      const data = await res.json();
      if (res.ok && (data.condition_notes || data.description)) {
        setForm((prev) => ({
          ...prev,
          condition_notes: data.condition_notes || data.description || prev.condition_notes,
        }));
        showToast('AI Condition Story generated!', 'success');
      } else {
        throw new Error(data.error || 'Failed to generate AI story');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI story generation failed';
      showToast(msg, 'error');
    } finally {
      setIsAiGeneratingStory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_name || !form.original_price || !form.clearance_price || !form.category) {
      showToast('Please fill all required fields.', 'error'); return;
    }
    if (parseFloat(form.clearance_price) >= parseFloat(form.original_price)) {
      showToast('Clearance price must be lower than original price.', 'error'); return;
    }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { showToast('Not authenticated', 'error'); return; }
      const imageUrls = await uploadImages(user.id);
      const res = await fetch('/api/dead-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: user.id,
          ...form,
          original_price: parseFloat(form.original_price),
          clearance_price: parseFloat(form.clearance_price),
          images: imageUrls,
          ...(storeLocation ? {
            location_address: storeLocation.location_address,
            city: storeLocation.city,
            district: storeLocation.district,
            state: storeLocation.state,
            latitude: storeLocation.latitude,
            longitude: storeLocation.longitude,
            google_maps_url: storeLocation.google_maps_url,
          } : {}),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      showToast('Listing published to marketplace!', 'success');
      router.push('/dashboard/dead-stock');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      showToast(msg, 'error');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#F5F1EA]">
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col mb-2">
          <div className="w-fit">
             <BackButton href="/dashboard/dead-stock" label="Back" />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-[#3E3B36]">Publish Clearance Listing</h1>
              <p className="text-xs text-[#8B8378] mt-0.5">Your item will go live on the public marketplace instantly.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Image Upload */}
          <div className="bg-white rounded-2xl border border-[#E8E3DA] p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-[#8B8378] uppercase tracking-widest flex items-center gap-2"><Upload size={13} />Product Images (up to {MAX_IMAGES})</h2>
            
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging ? 'border-[#C4A896] bg-[#F5F1EA]' : 'border-[#E8E3DA] hover:border-[#C4A896] hover:bg-[#F9F7F4]'}`}
              onClick={() => imageFiles.length < MAX_IMAGES && fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Package size={24} className="mx-auto text-[#C4A896] mb-2" />
              <p className="text-sm font-semibold text-[#3E3B36]">Drop images here or click to upload</p>
              <p className="text-xs text-[#8B8378] mt-1">JPG, PNG, WebP — Max 4 images</p>
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[#E8E3DA] group">
                    <Image src={src} alt={`Preview ${i + 1}`} fill unoptimized className="object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10">
                      <X size={12} className="text-rose-500" />
                    </button>
                    {i === 0 && <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-slate-900/80 text-white text-[8px] font-bold rounded uppercase z-10">Main</span>}
                  </div>
                ))}
                {imageFiles.length < MAX_IMAGES && (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-[#E8E3DA] flex items-center justify-center hover:border-[#C4A896] transition-colors">
                    <span className="text-[#C4A896] text-2xl font-thin">+</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Store Location Setup (Google Places Autocomplete & GPS) */}
          <div className="bg-white rounded-2xl border border-[#E8E3DA] p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-[#8B8378] uppercase tracking-widest flex items-center gap-2">
              <MapPin size={13} /> Store Location (Google Places & GPS)
            </h2>
            <p className="text-xs text-[#8B8378]">
              Select your store address so nearby buyers can filter and get directions to your shop.
            </p>
            <LocationAutocomplete
              onLocationSelect={(loc) => setStoreLocation(loc)}
            />
          </div>

          {/* Product Details */}
          <div className="bg-white rounded-2xl border border-[#E8E3DA] p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-[#8B8378] uppercase tracking-widest flex items-center gap-2"><Package size={13} />Product Details</h2>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B8378]">Product Name *</label>
              <input
                type="text" required
                value={form.product_name}
                onChange={e => setForm(prev => ({ ...prev, product_name: e.target.value }))}
                placeholder="e.g. Nike Air Force 1 (Dead Stock, Size 9)"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896] bg-[#F9F7F4] placeholder:text-[#C4A896]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B8378] flex items-center gap-1"><Tag size={11} />Category *</label>
                <button
                  type="button"
                  onClick={handleAutoCategory}
                  className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer"
                  title="Auto-detect category from Product Name"
                >
                  <Sparkles size={11} className="text-amber-600" />
                  Auto AI Category
                </button>
              </div>
              <select required value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896] bg-[#F9F7F4]">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-2xl border border-[#E8E3DA] p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-[#8B8378] uppercase tracking-widest flex items-center gap-2"><IndianRupee size={13} />Pricing</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B8378]">Original Price (₹) *</label>
                <input type="number" required min="1" step="0.01" value={form.original_price} onChange={e => setForm(prev => ({ ...prev, original_price: e.target.value }))} placeholder="2999" className="w-full px-4 py-2.5 rounded-xl border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896] bg-[#F9F7F4] placeholder:text-[#C4A896]" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B8378]">Clearance Price (₹) *</label>
                <input type="number" required min="1" step="0.01" value={form.clearance_price} onChange={e => setForm(prev => ({ ...prev, clearance_price: e.target.value }))} placeholder="799" className="w-full px-4 py-2.5 rounded-xl border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896] bg-[#F9F7F4] placeholder:text-[#C4A896]" />
              </div>
            </div>
            {discountPct > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                <span className="text-sm font-black text-emerald-700">{discountPct}% OFF</span>
                <span className="text-xs text-emerald-600">— Saving ₹{(parseFloat(form.original_price || '0') - parseFloat(form.clearance_price || '0')).toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Description & AI Story Notes */}
          <div className="bg-white rounded-2xl border border-[#E8E3DA] p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-bold text-[#8B8378] uppercase tracking-widest flex items-center gap-2">
                <FileText size={13} /> Description &amp; Condition Notes / Story
              </h2>
              <button
                type="button"
                onClick={handleGenerateAiDescription}
                disabled={isAiGenerating}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                title="Auto-generate description & condition story using Product Name, Category & Prices"
              >
                {isAiGenerating ? (
                  <Loader2 size={13} className="animate-spin text-amber-200" />
                ) : (
                  <Sparkles size={13} className="text-amber-200 fill-amber-200" />
                )}
                <span>{isAiGenerating ? 'Generating Story…' : '✨ Generate AI Story'}</span>
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B8378]">Product Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe the item, its features, size options, etc..." className="w-full px-4 py-2.5 rounded-xl border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896] bg-[#F9F7F4] resize-none placeholder:text-[#C4A896]" />
            </div>

            <div className="space-y-2 pt-1 border-t border-[#E8E3DA]/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B8378]">
                  Condition Notes / Story
                </label>
                <button
                  type="button"
                  onClick={handleGenerateAiStory}
                  disabled={isAiGeneratingStory}
                  className="px-3 py-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  title="Generate AI story for Condition Notes using Product Name, Category & Price"
                >
                  {isAiGeneratingStory ? (
                    <Loader2 size={12} className="animate-spin text-amber-200" />
                  ) : (
                    <Sparkles size={12} className="text-amber-200 fill-amber-200" />
                  )}
                  <span>{isAiGeneratingStory ? 'Generating AI Story…' : 'Generate Story with AI'}</span>
                </button>
              </div>

              <textarea
                rows={3}
                value={form.condition_notes}
                onChange={e => setForm(prev => ({ ...prev, condition_notes: e.target.value }))}
                placeholder="e.g. Brand new dead stock boots in original box. Factory clearance deal."
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896] bg-[#F9F7F4] resize-none placeholder:text-[#C4A896]"
              />

              {form.condition_notes && (
                <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <Sparkles size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[10px] uppercase tracking-wider text-amber-800 block mb-0.5">Condition Story Active</span>
                    <p className="leading-relaxed text-[#3E3B36] font-medium">{form.condition_notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">This listing will be published as <strong>Dead Stock / Factory Clearance</strong> on the public marketplace. Mark as &quot;Cleared&quot; from your dashboard once the item is sold.</p>
          </div>

          {/* Submit */}
          <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#3E3B36] text-[#F5F1EA] font-bold text-sm tracking-wide hover:bg-[#2a2825] transition-all disabled:opacity-60 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Publishing...</> : <><Package size={16} />Publish to Marketplace</>}
          </button>

        </form>
      </div>
    </div>
  );
}
