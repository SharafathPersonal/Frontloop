'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { CampaignFormValues, CreditCheckResult, Wallet, MessageTemplate } from '@/types/broadcast';
import { Upload, X, CheckCircle, AlertTriangle, Send, FileText, Image as ImageIcon, Tag, ChevronDown, Wand2, MessageSquareText, ShieldCheck } from 'lucide-react';
import CustomConfirm from '@/components/ui/CustomConfirm';
import { Spinner } from '@/components/ui/Spinner';

type StepState = 'compose' | 'dispatching' | 'success' | 'error';
type CustomerTag = 'VIP' | 'Regular' | 'New' | 'DIGITAL_BILL';

interface RecipientTag { value: CustomerTag; label: string; count: number; }

function BroadcastPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [shopName, setShopName] = useState('Your Shop');
  const [form, setForm] = useState<CampaignFormValues>({ title: '', message_body: '', image_url: '' });
  const [selectedTags, setSelectedTags] = useState<CustomerTag[]>([]);
  const [tagOptions, setTagOptions] = useState<RecipientTag[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [creditCheck, setCreditCheck] = useState<CreditCheckResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [whatsappCreditCost, setWhatsappCreditCost] = useState(1.0);

  // QR Express Connection Status
  const [qrExpressStatus, setQrExpressStatus] = useState<string | null>(null);
  const showQrDisconnectBanner = qrExpressStatus === 'disconnected';

  // Templates state
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});

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

  // AI Polish state
  const [isPolishing, setIsPolishing] = useState(false);
  const [selectedTone, setSelectedTone] = useState('Premium');

  const handleAIPolish = async () => {
    if (!form.message_body.trim()) {
      setErrorMsg('Please write a message to polish.');
      return;
    }
    
    setIsPolishing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_message: form.message_body,
          shop_name: shopName,
          industry_type: 'Retail',
          selected_tone: selectedTone
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to polish message');
      }

      setForm(prev => ({ ...prev, message_body: data.polished_message }));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'AI Polishing failed.');
    } finally {
      setIsPolishing(false);
    }
  };

  useEffect(() => {
    async function loadWallet() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: w }, { data: s }, tagCounts, { data: tmplData }, { data: configData }] = await Promise.all([
        supabase.from('wallets').select('*').eq('shop_id', user.id).maybeSingle(),
        supabase.from('shops').select('shop_name, qr_express_status').eq('id', user.id).maybeSingle(),
        Promise.all(['VIP', 'Regular', 'New', 'DIGITAL_BILL'].map(async (tag) => {
          const { count } = await supabase
            .from('customers_master')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', user.id)
            .contains('tags', [tag]);
          return { 
            value: tag as CustomerTag, 
            label: tag === 'DIGITAL_BILL' ? 'Digital Bill Customers 🧾' : tag, 
            count: count ?? 0 
          };
        })),
        supabase.from('message_templates').select('*').eq('shop_id', user.id).eq('status', 'APPROVED'),
        supabase.from('system_settings').select('value').eq('key', 'whatsapp_credit_cost').maybeSingle()
      ]);
      if (w) setWallet(w);
      if (s) {
        if (s.shop_name) setShopName(s.shop_name);
        setQrExpressStatus(s.qr_express_status || null);
      }
      setTagOptions(tagCounts);
      if (tmplData) setTemplates(tmplData as MessageTemplate[]);
      if (configData?.value) setWhatsappCreditCost(Number(configData.value));
      
      const prefillTId = searchParams.get('template');
      if (prefillTId && tmplData) {
        const t = (tmplData as MessageTemplate[]).find(x => x.id === prefillTId);
        if (t) {
          setSelectedTemplateId(t.id);
          setForm(prev => ({ ...prev, message_body: t.body_text }));
        }
      }
    }
    loadWallet();
  }, [searchParams]);

  // Extract placeholders dynamically
  useEffect(() => {
    const matches = form.message_body.match(/\{\{(\d+)\}\}/g);
    if (matches) {
      const newParams: Record<string, string> = {};
      matches.forEach(m => {
        const key = m.replace(/[{}]/g, '');
        newParams[key] = templateParams[key] || '';
      });
      setTemplateParams(newParams);
    } else {
      setTemplateParams({});
    }
  }, [form.message_body]);

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tId = e.target.value;
    setSelectedTemplateId(tId);
    if (tId) {
      const t = templates.find(x => x.id === tId);
      if (t) {
        setForm(prev => ({ ...prev, message_body: t.body_text }));
      }
    } else {
      setForm(prev => ({ ...prev, message_body: '' }));
    }
  };

  // Recompute recipient count & credit check when tags change
  useEffect(() => {
    async function updateCount() {
      if (selectedTags.length === 0) {
        setRecipientCount(0);
        setCreditCheck(null);
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('customers_master')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', user.id)
        .overlaps('tags', selectedTags);

      const total = count ?? 0;
      setRecipientCount(total);
      if (!wallet) { setCreditCheck(null); return; }
      const available = wallet.credits_remaining;
      const totalCost = total * whatsappCreditCost;
      setCreditCheck({ 
        sufficient: available >= totalCost, 
        creditsAvailable: available, 
        creditsRequired: totalCost, 
        deficit: Math.max(0, totalCost - available) 
      });
    }

    updateCount();
  }, [wallet, selectedTags, whatsappCreditCost]);

  const toggleTag = (tag: CustomerTag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const validateImageFiles = (files: FileList | null): File | null => {
    if (!files || files.length === 0) return null;
    if (files.length > 1) {
      setErrorMsg('Strict validation failed: Exactly one image upload allowed. Multiple files rejected.');
      console.warn('[Audit Failure] Multi-file selection detected. Rejected.');
      return null;
    }
    const file = files[0];
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.type)) {
      setErrorMsg('Strict validation failed: Only PNG and JPG/JPEG files are allowed. PDF/other formats rejected.');
      console.warn(`[Audit Failure] Invalid MIME-type: ${file.type}. Rejected.`);
      return null;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrorMsg('Strict validation failed: Image file size exceeds 5MB limit.');
      console.warn(`[Audit Failure] File size: ${(file.size / (1024*1024)).toFixed(2)}MB exceeds limit. Rejected.`);
      return null;
    }
    return file;
  };

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setImageDragging(false);
    const file = validateImageFiles(e.dataTransfer.files);
    if (file) {
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = validateImageFiles(e.target.files);
    if (file) {
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImageToStorage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const res = await fetch('/api/campaigns/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setImageUploading(false);

      if (!res.ok || data.error) {
        setErrorMsg(`Image upload failed: ${data.error || 'Server error'}`);
        return null;
      }

      return data.publicUrl;
    } catch (err: unknown) {
      setImageUploading(false);
      const errMsg = err instanceof Error ? err.message : 'Network error';
      setErrorMsg(`Image upload failed: ${errMsg}`);
      return null;
    }
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
    setIsSubmitting(true);
    setErrorMsg(null);

    let imageUrl = form.image_url ?? '';
    if (imageFile) {
      const uploaded = await uploadImageToStorage();
      if (!uploaded) { setIsSubmitting(false); return; }
      imageUrl = uploaded;
    }

    const startTime = Date.now();

    try {
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
      const res = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign: { ...form, image_url: imageUrl, template_name: selectedTemplate?.template_name },
          targetTags: selectedTags,
          creditsRequired: recipientCount,
          templateParams
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Failed to dispatch broadcast'); setIsSubmitting(false); return; }

      // Enforce showing micro-spinner/toast for exactly 1-2 seconds max.
      // Since it responds instantly, we wait for a total of 1.5 seconds.
      const elapsed = Date.now() - startTime;
      const remaining = 1500 - elapsed;
      if (remaining > 0) {
        await new Promise(r => setTimeout(r, remaining));
      }

      // Immediately take user straight to the Campaign History ledger page
      router.push('/dashboard/campaigns');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Campaign Creator</h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">Craft your broadcast and select your audience</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/campaigns')}
          className="border border-[#E8E3DA] hover:border-[#C4A896] hover:bg-[#F5F1EA] transition-all text-[#3E3B36] text-xs tracking-[0.15em] uppercase font-medium rounded-lg px-4 py-2 flex-shrink-0"
        >
          View All Campaigns
        </button>
      </div>

      {/* 401 Unauthorized Banner */}
      {showQrDisconnectBanner && (
        <div className="bg-[#EF4444] rounded-xl p-5 flex items-start gap-4 shadow-lg border border-[#DC2626] animate-in fade-in duration-300">
          <AlertTriangle size={20} className="text-white flex-shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="text-white text-sm font-bold tracking-wide mb-1 uppercase">Authentication Error (401 Unauthorized)</p>
            <p className="text-white/90 text-xs leading-relaxed">
              Your linked WhatsApp device was manually logged out. The broadcast queue is explicitly LOCKED to prevent data loss. Please go to Settings and rescan the QR code to resume operations.
            </p>
          </div>
        </div>
      )}

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
            Credit check passed - {creditCheck.creditsRequired} credits will be deducted. <span className="text-[#8B8378]">{creditCheck.creditsAvailable - creditCheck.creditsRequired} remaining after dispatch.</span>
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
              disabled={isSubmitting}
              className="input-editorial disabled:opacity-50"
              placeholder="e.g. Eid Collection Drop — July"
            />
          </div>

          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Select Your Approved Template</label>
            <div className="relative">
              <select
                value={selectedTemplateId}
                onChange={handleTemplateSelect}
                disabled={isSubmitting}
                className="input-editorial appearance-none pr-10 disabled:opacity-50"
              >
                <option value="">-- Start from scratch or select template --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.template_name} ({t.category})</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8378]" pointerEvents="none" />
            </div>
          </div>

          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Message Body</label>
            <textarea
              rows={5}
              value={form.message_body}
              onChange={(e) => setForm({ ...form, message_body: e.target.value })}
              disabled={isPolishing || isSubmitting}
              className="input-editorial resize-none disabled:opacity-50"
              placeholder="Hi {{1}}, we have an exclusive offer just for you from {{2}}…"
            />
            
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={handleAIPolish}
                disabled={isPolishing || isSubmitting || !form.message_body.trim()}
                className="flex items-center gap-2 border border-[#C4A896] rounded px-3 py-1.5 tracking-[0.2em] text-xs text-[#C4A896] hover:bg-[#3E3B36] hover:border-[#3E3B36] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wand2 size={12} className={isPolishing ? 'animate-spin' : ''} />
                {isPolishing ? 'AI THINKING...' : 'AI MESSAGE POLISHER'}
              </button>
              <select
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value)}
                disabled={isPolishing || isSubmitting}
                className="bg-transparent border border-[#E8E3DA] text-[#8B8378] text-xs tracking-[0.1em] uppercase rounded px-2 py-1.5 focus:outline-none focus:border-[#C4A896] disabled:opacity-50"
              >
                <option value="Premium">Premium</option>
                <option value="Friendly">Friendly</option>
                <option value="Festive">Festive</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            
            <p className="text-[10px] text-[#8B8378] mt-2">
              💡 Quick Guide: Use <code className="bg-[#F5F1EA] px-1 rounded text-[#C4A896]">{'{{1}}'}</code>, <code className="bg-[#F5F1EA] px-1 rounded text-[#C4A896]">{'{{2}}'}</code> to dynamically insert customer name, shop name, etc.
            </p>
          </div>
          
          {Object.keys(templateParams).length > 0 && (
            <div className="bg-[#F9F7F4] border border-[#E8E3DA] rounded-xl p-5 space-y-4">
              <p className="text-xs tracking-[0.1em] text-[#3E3B36] uppercase font-medium">Template Variables</p>
              {Object.keys(templateParams).sort((a,b) => parseInt(a)-parseInt(b)).map(key => {
                let labelText = `Variable {{${key}}}`;
                if (key === '1') {
                  labelText = 'Customer Name (യൂസറുടെ പേര്)';
                } else if (key === '2') {
                  labelText = 'Shop Name (സ്ഥാപനത്തിന്റെ പേര്)';
                }
                const isAuto = key === '1' || key === '2';
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-[10px] text-[#8B8378] uppercase">{labelText}</label>
                    <input
                      type="text"
                      value={isAuto ? 'Auto-populated for each recipient' : templateParams[key]}
                      onChange={(e) => {
                        if (!isAuto) setTemplateParams({ ...templateParams, [key]: e.target.value });
                      }}
                      disabled={isSubmitting || isAuto}
                      readOnly={isAuto}
                      className={`w-full px-3 py-2 text-sm border rounded focus:outline-none ${
                        isAuto 
                          ? 'bg-[#F5F1EA] text-[#8B8378] border-[#E8E3DA] cursor-not-allowed' 
                          : 'bg-white border-[#E8E3DA] focus:border-[#C4A896]'
                      } ${isSubmitting ? 'opacity-50' : ''}`}
                      placeholder={isAuto ? '' : `Value for {{${key}}}`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {form.message_body && (
            <div className="bg-[#F5F1EA] rounded-xl p-4">
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-3">Preview</p>
              <div className="bg-[#FFFFFF] rounded-lg p-5 border-l-2 border-[#C4A896] shadow-sm">
                <p className="text-sm text-[#3E3B36] leading-relaxed whitespace-pre-wrap">
                  {(() => {
                    let preview = form.message_body;
                    preview = preview
                      .replace(/\{\{1\}\}/g, "Sharafath")
                      .replace(/\{\{2\}\}/g, "True Attendly Shop");
                    Object.keys(templateParams).forEach((key) => {
                      if (key === '1' || key === '2') return;
                      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), templateParams[key] || `{{${key}}}`);
                    });
                    return preview;
                  })()}
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
                className={`p-4 sm:p-6 md:p-8 text-center cursor-pointer transition-all ${imageDragging ? 'bg-[#F5F1EA] border-[#C4A896]' : 'hover:bg-[#F5F1EA]/30'} ${isSubmitting ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                onDragOver={(e) => { if (!isSubmitting) { e.preventDefault(); setImageDragging(true); } }}
                onDragLeave={() => setImageDragging(false)}
                onDrop={handleImageDrop}
                onClick={() => !isSubmitting && imageRef.current?.click()}
                role="button"
                aria-label="Upload campaign image"
              >
                <input ref={imageRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleImageChange} />
                <div className="w-10 h-10 bg-[#F5F1EA] rounded-lg flex items-center justify-center mx-auto mb-3">
                  <ImageIcon size={18} className="text-[#8B8378]" strokeWidth={1.5} />
                </div>
                <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mb-1">Drop flyer image here</p>
                <p className="text-[10px] text-[#8B8378]">PNG, JPG, JPEG · Max 5MB</p>
              </div>
            )}
          </div>

          {/* Audience Tag Targeting Selector */}
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
            <button
              onClick={() => !isSubmitting && setTagDropdownOpen(!tagDropdownOpen)}
              disabled={isSubmitting}
              className="w-full px-5 py-4 flex items-center justify-between border-b border-[#E8E3DA] hover:bg-[#F5F1EA]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        disabled={isSubmitting}
                        onChange={() => !isSubmitting && toggleTag(t.value)}
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
            {whatsappCreditCost} credit{whatsappCreditCost !== 1 ? 's' : ''} per message · No subscription required
          </p>
        </div>
        <button
          onClick={handleConfirmSubmit}
          disabled={selectedTags.length === 0 || recipientCount === 0 || (creditCheck !== null && !creditCheck.sufficient) || showQrDisconnectBanner || isSubmitting}
          className="btn-primary rounded-lg flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Spinner className="border-t-white border-transparent w-4 h-4" />
              <span>Queueing...</span>
            </>
          ) : (
            <>
              <Send size={12} strokeWidth={1.5} />
              <span>Dispatch Campaign</span>
            </>
          )}
        </button>
      </div>

      <CustomConfirm
        isOpen={isConfirmOpen}
        title="Execute Broadcast"
        message={`Are you sure you want to broadcast this campaign? This will permanently deduct ${(recipientCount * whatsappCreditCost).toLocaleString()} credits from your active wallet ledger.`}
        confirmText="LAUNCH CAMPAIGN"
        onConfirm={executeSubmit}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {isSubmitting && (
        <div className="fixed bottom-6 right-6 bg-[#3E3B36] text-[#F5F1EA] px-4 py-3 rounded-xl shadow-2xl border border-[#C4A896]/30 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 z-50">
          <Spinner className="border-t-[#C4A896] border-[#8B8378] w-4 h-4" />
          <span className="text-xs font-medium tracking-wide uppercase">Queueing Campaign...</span>
        </div>
      )}
    </div>
  );
}

export default function BroadcastPage() {
  return (
    <Suspense fallback={<div className="flex h-[80vh] items-center justify-center"><Spinner /></div>}>
      <BroadcastPageInner />
    </Suspense>
  );
}
