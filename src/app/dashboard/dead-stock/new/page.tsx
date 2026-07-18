'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/contexts/ToastContext';
import { Upload, X, Loader2, Package, ChevronLeft, AlertTriangle, IndianRupee, Tag, FileText } from 'lucide-react';

const CATEGORIES = ['Clothing', 'Electronics', 'Grocery', 'Furniture', 'Footwear', 'Sports', 'Toys', 'Books', 'Home Decor', 'Stationery', 'Other'];

const MAX_IMAGES = 4;

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
      const ext = file.name.split('.').pop();
      const path = `dead-stock/${shopId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
      if (error) { console.error('Upload error', error); continue; }
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      urls.push(publicUrl);
    }
    return urls;
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
        body: JSON.stringify({ shop_id: user.id, ...form, original_price: parseFloat(form.original_price), clearance_price: parseFloat(form.clearance_price), images: imageUrls }),
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
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl border border-[#E8E3DA] hover:bg-[#F5F1EA] bg-white transition-colors">
            <ChevronLeft size={16} className="text-[#8B8378]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#3E3B36]">Publish Clearance Listing</h1>
            <p className="text-xs text-[#8B8378] mt-0.5">Your item will go live on the public marketplace instantly.</p>
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      <X size={12} className="text-rose-500" />
                    </button>
                    {i === 0 && <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-slate-900/80 text-white text-[8px] font-bold rounded uppercase">Main</span>}
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
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B8378] flex items-center gap-1"><Tag size={11} />Category *</label>
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

          {/* Description */}
          <div className="bg-white rounded-2xl border border-[#E8E3DA] p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-[#8B8378] uppercase tracking-widest flex items-center gap-2"><FileText size={13} />Description &amp; Condition</h2>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B8378]">Product Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe the item, its features, size options, etc..." className="w-full px-4 py-2.5 rounded-xl border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896] bg-[#F9F7F4] resize-none placeholder:text-[#C4A896]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B8378]">Condition Notes</label>
              <textarea rows={2} value={form.condition_notes} onChange={e => setForm(prev => ({ ...prev, condition_notes: e.target.value }))} placeholder="e.g. Brand new, unopened. Box slightly damaged. Factory seconds." className="w-full px-4 py-2.5 rounded-xl border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896] bg-[#F9F7F4] resize-none placeholder:text-[#C4A896]" />
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
