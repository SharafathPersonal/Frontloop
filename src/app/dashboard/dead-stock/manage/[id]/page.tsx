'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getProductDetails } from '../../../../broadcast/dead-stock/actions';
import { updateProduct, deleteProduct, toggleProductClearedStatus, createProduct } from '../../actions';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, CheckCircle, ShieldAlert, Trash2, Save, Loader2, ImagePlus, X, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import BackButton from '@/components/ui/BackButton';
import CustomConfirm from '@/components/ui/CustomConfirm';
import { useToast } from '@/contexts/ToastContext';

export default function DeadStockDetailPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === 'new';
  const { showToast } = useToast();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  
  // Custom Confirm State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    onConfirm: () => {},
  });
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formOriginal, setFormOriginal] = useState('');
  const [formClearance, setFormClearance] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setShopId(user.id);

      if (isNew) {
        setLoading(false);
        return;
      }
      
      const data = await getProductDetails(params.id as string);
      if (data) {
        setProduct(data);
        setFormName(data.product_name);
        setFormCategory(data.category);
        setFormOriginal(String(data.original_price));
        setFormClearance(String(data.clearance_price));
        setFormDesc(data.description || '');
        setFormImages(data.images || []);
      }
      setLoading(false);
    }
    load();
  }, [params.id, isNew]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shopId) return;
    
    if (formImages.length >= 3) {
      showToast("You can only upload a maximum of 3 images.", 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${shopId}/dead-stock-${Date.now()}-${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('flash-offers')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('flash-offers')
        .getPublicUrl(filePath);

      setFormImages(prev => [...prev, publicUrl]);
      showToast('Image uploaded successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Image upload failed.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFormImages(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSave = async () => {
    const orig = parseFloat(formOriginal);
    const clear = parseFloat(formClearance);
    
    if (!formName.trim() || !formCategory.trim() || isNaN(orig) || isNaN(clear)) {
      showToast("Please fill out all required fields correctly (Product Name, Category, Prices).", 'error');
      return;
    }
    
    if (clear >= orig) {
      showToast("Clearance price must be strictly lower than the original price.", 'error');
      return;
    }
    
    const pct = Math.round(((orig - clear) / orig) * 100);
    
    setConfirmConfig({
      isOpen: true,
      title: isNew ? 'Publish New Item' : 'Save Changes',
      message: isNew 
        ? 'Are you sure you want to add this new item to your Dead Stock inventory?' 
        : 'Are you sure you want to save these changes to your item?',
      confirmText: isNew ? 'PUBLISH' : 'SAVE',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setSaving(true);
        
        const payload = {
          product_name: formName,
          category: formCategory,
          original_price: orig,
          clearance_price: clear,
          discount_percentage: pct,
          description: formDesc,
          images: formImages
        };
        
        if (isNew) {
          if (!shopId) {
            showToast("Authentication error. Shop ID not found.", 'error');
            setSaving(false); return;
          }
          const result = await createProduct({
            ...payload,
            shop_id: shopId,
            is_cleared: false
          });
          if (result.success) {
            showToast('Item successfully added to inventory!', 'success');
            router.push('/dashboard/dead-stock/manage');
          } else {
            showToast('Failed to create product.', 'error');
          }
        } else {
          const result = await updateProduct(product.id, payload);
          if (result.success) {
            showToast('Item changes saved successfully!', 'success');
            router.push('/dashboard/dead-stock/manage');
          } else {
            showToast('Failed to update product.', 'error');
          }
        }
        setSaving(false);
      }
    });
  };

  const confirmDelete = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Item',
      message: 'Are you sure you want to permanently delete this item? This action is irreversible.',
      confirmText: 'DELETE',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setSaving(true);
        const res = await deleteProduct(product.id);
        if (res.success) {
          showToast('Item deleted successfully.', 'success');
          router.push('/dashboard/dead-stock/manage');
        } else {
          showToast('Failed to delete item.', 'error');
          setSaving(false);
        }
      }
    });
  };

  const confirmToggleStatus = () => {
    const actionName = !product.is_cleared ? "CLEARED" : "LIVE";
    setConfirmConfig({
      isOpen: true,
      title: 'Update Status',
      message: `Are you sure you want to mark this item as ${actionName}?`,
      confirmText: `MARK AS ${actionName}`,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setSaving(true);
        const res = await toggleProductClearedStatus(product.id, !product.is_cleared);
        if (res.success) {
          showToast(`Item marked as ${actionName.toLowerCase()}!`, 'success');
          setProduct({ ...product, is_cleared: !product.is_cleared });
        } else {
          showToast('Failed to update status.', 'error');
        }
        setSaving(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#C4A896]" />
        <p className="text-xs text-[#8B8378] font-bold tracking-widest uppercase mt-4">Loading Data...</p>
      </div>
    );
  }

  if (!product && !isNew) {
    return <div className="p-10 text-center text-[#8B8378]">Product not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-outfit">
      <CustomConfirm
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#E8E3DA] pb-4 gap-4">
        <div className="flex flex-col items-start">
          <BackButton href="/dashboard/dead-stock/manage" label="Back to Inventory" />
          <div className="mt-2">
            <h1 className="text-xl md:text-2xl font-bold text-[#3E3B36]">{isNew ? 'Create New Listing' : 'Edit Item Details'}</h1>
            <p className="text-[10px] text-[#8B8378] uppercase tracking-[0.15em] mt-0.5">{isNew ? 'Add a new dead stock product' : `Record ID: ${product.id}`}</p>
          </div>
        </div>
        
        {!isNew && product && (
          <div className="flex flex-wrap items-center gap-3">
             <button 
                onClick={confirmToggleStatus}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase border transition-all shadow-sm ${
                  product.is_cleared 
                    ? 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {product.is_cleared ? <><ShieldAlert size={14} /> Mark as Live</> : <><CheckCircle size={14} /> Mark as Cleared</>}
              </button>
              <button 
                onClick={confirmDelete}
                disabled={saving}
                className="p-2 border border-[#E8E3DA] rounded-lg bg-white text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm"
                title="Delete Item"
              >
                <Trash2 size={16} />
              </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#E8E3DA] rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
        
        {/* Basic Information */}
        <div>
          <h2 className="text-sm font-bold text-[#3E3B36] uppercase tracking-wider border-b border-[#E8E3DA]/60 pb-2 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5 font-bold">Product Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formName} 
                onChange={e => setFormName(e.target.value)} 
                placeholder="e.g., Premium Office Chair"
                className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A896]/30 focus:border-[#C4A896] text-[#3E3B36] transition-all" 
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5 font-bold">Category <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formCategory} 
                onChange={e => setFormCategory(e.target.value)} 
                placeholder="e.g., Furniture, Electronics"
                className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A896]/30 focus:border-[#C4A896] text-[#3E3B36] transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Pricing Strategy */}
        <div>
          <h2 className="text-sm font-bold text-[#3E3B36] uppercase tracking-wider border-b border-[#E8E3DA]/60 pb-2 mb-4 flex items-center justify-between">
            Pricing Strategy
            {formOriginal && formClearance && parseFloat(formOriginal) > 0 && parseFloat(formOriginal) > parseFloat(formClearance) && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 font-bold">
                {Math.round(((parseFloat(formOriginal) - parseFloat(formClearance)) / parseFloat(formOriginal)) * 100)}% DISCOUNT APPLIED
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5 font-bold">Original Price (₹) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B8378] font-bold">₹</span>
                <input 
                  type="number" 
                  value={formOriginal} 
                  onChange={e => setFormOriginal(e.target.value)} 
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A896]/30 focus:border-[#C4A896] text-[#3E3B36] transition-all" 
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5 font-bold">Clearance Price (₹) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B8378] font-bold">₹</span>
                <input 
                  type="number" 
                  value={formClearance} 
                  onChange={e => setFormClearance(e.target.value)} 
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A896]/30 focus:border-[#C4A896] text-[#3E3B36] transition-all font-bold text-emerald-700" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Product Media */}
        <div>
          <div className="flex items-center justify-between border-b border-[#E8E3DA]/60 pb-2 mb-4">
            <h2 className="text-sm font-bold text-[#3E3B36] uppercase tracking-wider">Product Media</h2>
            <span className="text-[10px] font-bold text-[#8B8378] tracking-widest uppercase">{formImages.length}/3 Uploaded</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {formImages.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl border border-[#E8E3DA] overflow-hidden bg-[#FAF9F6] group">
                <img src={img} alt={`Product ${idx+1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={() => removeImage(idx)}
                    className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                    title="Remove Image"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            
            {formImages.length < 3 && (
              <div className="aspect-square rounded-xl border-2 border-dashed border-[#E8E3DA] bg-[#FAF9F6] hover:bg-[#F5F1EA] hover:border-[#C4A896] transition-colors relative flex flex-col items-center justify-center text-center p-4 cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  disabled={uploadingImage}
                />
                {uploadingImage ? (
                  <>
                    <Loader2 size={24} className="text-[#C4A896] animate-spin mb-2" />
                    <span className="text-[10px] font-bold text-[#8B8378] tracking-widest uppercase">Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={24} className="text-[#8B8378] mb-2" />
                    <span className="text-[10px] font-bold text-[#8B8378] tracking-widest uppercase">Add Image</span>
                  </>
                )}
              </div>
            )}
          </div>
          <p className="text-[10px] text-[#8B8378] mt-3">Upload clear, well-lit photos. The first image will be used as the primary thumbnail. High-quality images increase conversion rates.</p>
        </div>

        {/* Detailed Description */}
        <div>
          <h2 className="text-sm font-bold text-[#3E3B36] uppercase tracking-wider border-b border-[#E8E3DA]/60 pb-2 mb-4">Detailed Description</h2>
          <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5 font-bold">Condition Notes / Story</label>
          <textarea 
            value={formDesc} 
            onChange={e => setFormDesc(e.target.value)} 
            rows={5}
            placeholder="Explain why this item is on clearance. E.g., 'Minor box damage, but product is brand new and untouched. Perfect for...'"
            className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A896]/30 focus:border-[#C4A896] text-[#3E3B36] resize-y transition-all" 
          />
        </div>

        {/* Submit Actions */}
        <div className="border-t border-[#E8E3DA] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-[#8B8378]">Ensure all details are accurate before saving.</p>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full sm:w-auto bg-[#3E3B36] text-[#F5F1EA] px-8 py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-[#2A2825] transition-colors flex items-center justify-center gap-2 min-w-[200px] shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            {isNew ? 'Publish New Item' : 'Save Changes'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
