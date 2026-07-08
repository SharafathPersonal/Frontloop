'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { CampaignFormValues, CreditCheckResult, Wallet } from '@/types/broadcast';
import { Upload, X, CheckCircle, AlertTriangle, Send, FileText, Image as ImageIcon, Tag, ChevronDown } from 'lucide-react';
import CustomConfirm from '@/components/ui/CustomConfirm';
import { Spinner } from '@/components/ui/Spinner';

type StepState = 'compose' | 'dispatching' | 'success' | 'error';
type CustomerTag = 'VIP' | 'Regular' | 'New';

interface RecipientTag { value: CustomerTag; label: string; count: number; }

export default function BroadcastPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [form, setForm] = useState<CampaignFormValues>({ title: '', message_body: '', image_url: '' });
  const [selectedTags, setSelectedTags] = useState<CustomerTag[]>([]);
  const [tagOptions, setTagOptions] = useState<RecipientTag[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [creditCheck, setCreditCheck] = useState<CreditCheckResult | null>(null);
  const [step, setStep] = useState<StepState>('compose');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageDragging, setImageDragging] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  // Tag dropdown state
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

  // Confirm modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    async function loadWallet() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: w }, tagCounts] = await Promise.all([
        supabase.from('wallets').select('*').eq('shop_id', user.id).maybeSingle(),
        Promise.all(['VIP', 'Regular', 'New'].map(async (tag) => {
          const { count } = await supabase
            .from('customers_master')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', user.id)
            .contains('tags', [tag]);
          return { value: tag as CustomerTag, label: tag, count: count ?? 0 };
        })),
      ]);
      if (w) setWallet(w);
      setTagOptions(tagCounts);
    }
    loadWallet();
  }, []);

  // Recompute recipient count & credit check when tags change
  useEffect(() => {
    const total = tagOptions.filter(t => selectedTags.includes(t.value)).reduce((s, t) => s + t.count, 0);
    setRecipientCount(total);
    if (!wallet || total === 0) { setCreditCheck(null); return; }
    const available = wallet.credits_remaining;
    setCreditCheck({ sufficient: available >= total, creditsAvailable: available, creditsRequired: total, deficit: Math.max(0, total - available) });
  }, [wallet, selectedTags, tagOptions]);

  const toggleTag = (tag: CustomerTag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setImageDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setErrorMsg('Please drop a valid image file (jpg, png, webp).');
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImagePreviewUrl(URL.createObjectURL(file)); }
  };

  const uploadImageToStorage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    setImageUploading(true);
    const ext = imageFile.name.split('.').pop();
    const path = `campaign-images/${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('broadcast-assets').upload(path, imageFile, { upsert: true });
    setImageUploading(false);
    if (error) { setErrorMsg(`Image upload failed: ${error.message}`); return null; }
    const { data: { publicUrl } } = supabase.storage.from('broadcast-assets').getPublicUrl(path);
    return publicUrl;
  };

  const handleConfirmSubmit = () => {
    setErrorMsg(null);
    if (!form.title.trim() || !form.message_body.trim()) { setErrorMsg('Please fill in campaign title and message.'); return; }
    if (selectedTags.length === 0) { setErrorMsg('Please select at least one target audience tag.'); return; }
    if (creditCheck && !creditCheck.sufficient) { setErrorMsg(`Insufficient credits. You need ${creditCheck.deficit} more.`); return; }
    setIsConfirmOpen(true);
  };

  const executeSubmit = async () => {
    setIsConfirmOpen(false);
    setStep('dispatching');

    let imageUrl = form.image_url ?? '';
    if (imageFile) {
      const uploaded = await uploadImageToStorage();
      if (!uploaded) { setStep('error'); return; }
      imageUrl = uploaded;
    }

    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: { ...form, image_url: imageUrl }, targetTags: selectedTags, creditsRequired: recipientCount }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Failed to dispatch broadcast'); setStep('error'); return; }
      setStep('success');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: fw } = await supabase.from('wallets').select('*').eq('shop_id', user.id).maybeSingle();
        if (fw) setWallet(fw);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred.');
      setStep('error');
    }
  };

  const resetForm = () => {
    setForm({ title: '', message_body: '', image_url: '' });
    setSelectedTags([]);
    setImageFile(null);
    setImagePreviewUrl(null);
    setCreditCheck(null);
    setStep('compose');
    setErrorMsg(null);
  };

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-14 h-14 bg-[#F5F1EA] border border-[#C4A896]/40 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={24} className="text-[#C4A896]" strokeWidth={1.5} />
        </div>
        <h1 className="serif-headline text-2xl text-[#3E3B36] mb-3">Campaign dispatched</h1>
        <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mb-8">
          {recipientCount} recipients queued · {recipientCount} credits deducted
        </p>
        <button onClick={resetForm} className="btn-primary rounded-lg">Create Another Campaign</button>
      </div>
    );
  }

  if (step === 'dispatching') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 flex flex-col items-center justify-center gap-6">
        <Spinner className="w-8 h-8 border-t-[#C4A896] border-[#E8E3DA]" />
        <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase font-medium">
          DISPATCHING ENGINES... [{recipientCount}/{recipientCount}]
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      <div>
        <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Campaign Creator</h1>
        <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">Craft your broadcast and select your audience</p>
      </div>

      {/* Credit Guard Banner */}
      {creditCheck && !creditCheck.sufficient && (
        <div className="bg-[#3E3B36] rounded-xl p-5 flex items-start gap-4">
          <AlertTriangle size={18} className="text-[#C4A896] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-[#F5F1EA]/90 text-sm font-medium mb-1">Insufficient credits to dispatch</p>
            <p className="text-[#F5F1EA]/70 text-xs leading-relaxed">
              This campaign requires <span className="text-[#C4A896]">{creditCheck.creditsRequired} credits</span>. You have <span className="text-[#C4A896]">{creditCheck.creditsAvailable}</span>. Need <span className="text-[#C4A896]">{creditCheck.deficit} more</span>.
            </p>
          </div>
        </div>
      )}

      {creditCheck && creditCheck.sufficient && (
        <div className="border border-[#C4A896]/40 bg-[#F5F1EA] rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={16} className="text-[#C4A896]" strokeWidth={1.5} />
          <p className="text-xs text-[#3E3B36]">
            Credit check passed — {creditCheck.creditsRequired} credits will be deducted. <span className="text-[#8B8378]">{creditCheck.creditsAvailable - creditCheck.creditsRequired} remaining after dispatch.</span>
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-[#3E3B36] rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={14} className="text-[#C4A896]" strokeWidth={1.5} />
          <p className="text-[#F5F1EA]/90 text-xs">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-[#8B8378] hover:text-[#F5F1EA]"><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT — Campaign Compose */}
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <FileText size={12} strokeWidth={1.5} className="text-[#8B8378]" />
            <p className="text-[10px] tracking-[0.25em] text-[#8B8378] uppercase">Campaign Details</p>
          </div>

          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Campaign Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-editorial"
              placeholder="e.g. Eid Collection Drop — July"
            />
          </div>

          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Message Body</label>
            <textarea
              rows={5}
              value={form.message_body}
              onChange={(e) => setForm({ ...form, message_body: e.target.value })}
              className="input-editorial resize-none"
              placeholder="Hi {name}, we have an exclusive offer just for you…"
            />
            <p className="text-[10px] text-[#8B8378] mt-1.5">
              Use <code className="bg-[#F5F1EA] px-1 rounded text-[#C4A896]">{'{name}'}</code> to personalise each message.
            </p>
          </div>

          {form.message_body && (
            <div className="bg-[#F5F1EA] rounded-xl p-4">
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-3">Preview</p>
              <div className="bg-[#FFFFFF] rounded-lg p-3 border border-[#E8E3DA]">
                <p className="text-sm text-[#3E3B36] leading-relaxed whitespace-pre-wrap">
                  {form.message_body.replace('{name}', 'Ayesha')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Image + Targeting */}
        <div className="space-y-5">

          {/* Dynamic Image Dropzone */}
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8E3DA] flex items-center gap-2">
              <ImageIcon size={13} strokeWidth={1.5} className="text-[#C4A896]" />
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Marketing Flyer</p>
              <span className="text-[10px] text-[#8B8378] ml-auto normal-case tracking-normal">Optional</span>
            </div>
            {imagePreviewUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreviewUrl} alt="Campaign flyer preview" className="w-full max-h-52 object-cover" />
                <button
                  onClick={() => { setImageFile(null); setImagePreviewUrl(null); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-[#3E3B36]/80 rounded-full flex items-center justify-center text-white hover:bg-[#3E3B36]"
                >
                  <X size={12} />
                </button>
                {imageUploading && (
                  <div className="absolute inset-0 bg-[#F5F1EA]/80 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`p-8 text-center cursor-pointer transition-all ${imageDragging ? 'bg-[#F5F1EA] border-[#C4A896]' : 'hover:bg-[#F5F1EA]/30'}`}
                onDragOver={(e) => { e.preventDefault(); setImageDragging(true); }}
                onDragLeave={() => setImageDragging(false)}
                onDrop={handleImageDrop}
                onClick={() => imageRef.current?.click()}
                role="button"
                aria-label="Upload campaign image"
              >
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                <div className="w-10 h-10 bg-[#F5F1EA] rounded-lg flex items-center justify-center mx-auto mb-3">
                  <ImageIcon size={18} className="text-[#8B8378]" strokeWidth={1.5} />
                </div>
                <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mb-1">Drop flyer image here</p>
                <p className="text-[10px] text-[#8B8378]">JPG, PNG, WebP · Max 5MB</p>
              </div>
            )}
          </div>

          {/* Audience Tag Targeting Selector */}
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
            <button
              onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
              className="w-full px-5 py-4 flex items-center justify-between border-b border-[#E8E3DA] hover:bg-[#F5F1EA]/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Tag size={13} strokeWidth={1.5} className="text-[#C4A896]" />
                <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">
                  {selectedTags.length === 0 ? 'Select Target Audience Tags' : `${selectedTags.join(', ')} · ${recipientCount.toLocaleString()} recipients`}
                </p>
              </div>
              <ChevronDown size={14} className={`text-[#8B8378] transition-transform ${tagDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {tagDropdownOpen && (
              <div className="p-4 space-y-2">
                {tagOptions.map((t) => (
                  <label
                    key={t.value}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTags.includes(t.value)
                        ? 'border-[#C4A896] bg-[#F5F1EA]'
                        : 'border-[#E8E3DA] hover:border-[#C4A896]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(t.value)}
                        onChange={() => toggleTag(t.value)}
                        className="w-3.5 h-3.5 accent-[#C4A896]"
                      />
                      <span className="text-sm text-[#3E3B36] font-medium">{t.label}</span>
                    </div>
                    <span className="text-xs text-[#8B8378]">{t.count.toLocaleString()} contacts</span>
                  </label>
                ))}
                {tagOptions.every(t => t.count === 0) && (
                  <p className="text-xs text-[#8B8378] text-center py-2">No contacts in database yet. Add contacts in Audience Manager.</p>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Dispatch Footer */}
      <div className="flex items-center justify-between bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5">
        <div>
          <p className="text-sm text-[#3E3B36] font-medium">
            {recipientCount > 0
              ? `Ready to send to ${recipientCount.toLocaleString()} contacts`
              : 'Select audience tags to proceed'}
          </p>
          <p className="text-[10px] tracking-[0.1em] text-[#8B8378] uppercase mt-0.5">
            1 credit per message · No subscription required
          </p>
        </div>
        <button
          onClick={handleConfirmSubmit}
          disabled={selectedTags.length === 0 || recipientCount === 0 || (creditCheck !== null && !creditCheck.sufficient)}
          className="btn-primary rounded-lg flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={12} strokeWidth={1.5} />
          Dispatch Campaign
        </button>
      </div>

      <CustomConfirm
        isOpen={isConfirmOpen}
        title="Execute Broadcast"
        message={`Are you sure you want to broadcast this campaign? This will permanently deduct ${recipientCount.toLocaleString()} credits from your active wallet ledger.`}
        confirmText="LAUNCH CAMPAIGN"
        onConfirm={executeSubmit}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
