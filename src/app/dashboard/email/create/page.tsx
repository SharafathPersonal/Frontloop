'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Send, AlertTriangle, CheckCircle, X, Mail, Image as ImageIcon, Wand2, Upload } from 'lucide-react';
import Link from 'next/link';
import CustomConfirm from '@/components/ui/CustomConfirm';
import { Spinner } from '@/components/ui/Spinner';

type CustomerTag = 'VIP' | 'Regular' | 'New' | 'DIGITAL_BILL';
interface RecipientTag { value: CustomerTag; label: string; count: number; }

export default function EmailCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', subject: '', html_body: '' });
  const [selectedTags, setSelectedTags] = useState<CustomerTag[]>([]);
  const [tagOptions, setTagOptions] = useState<RecipientTag[]>([]);
  const [csvEmails, setCsvEmails] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);
  const [recipientCount, setRecipientCount] = useState(0);
  const [creditsAvailable, setCreditsAvailable] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [emailCreditCost, setEmailCreditCost] = useState(0.5);

  // AI & Image State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageDragging, setImageDragging] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: wallet }, tagCounts, { data: configData }] = await Promise.all([
        supabase.from('wallets').select('credits_remaining').eq('shop_id', user.id).maybeSingle(),
        Promise.all((['VIP', 'Regular', 'New', 'DIGITAL_BILL'] as CustomerTag[]).map(async (tag) => {
          const { count } = await supabase
            .from('customers_master')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', user.id)
            .contains('tags', [tag]);
          return { 
            value: tag, 
            label: tag === 'DIGITAL_BILL' ? 'Digital Bill Customers 🧾' : tag, 
            count: count ?? 0 
          };
        })),
        supabase.from('system_settings').select('value').eq('key', 'email_credit_cost').maybeSingle()
      ]);
      if (wallet) setCreditsAvailable(wallet.credits_remaining);
      setTagOptions(tagCounts);
      if (configData?.value) setEmailCreditCost(Number(configData.value));
    }
    load();
  }, []);

  useEffect(() => {
    async function updateCount() {
      let dbCount = 0;
      if (selectedTags.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { count } = await supabase
            .from('customers_master')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', user.id)
            .overlaps('tags', selectedTags);
          dbCount = count ?? 0;
        }
      }
      setRecipientCount(dbCount + csvEmails.length);
    }
    updateCount();
  }, [selectedTags, csvEmails]);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = text.match(emailRegex) || [];
      const uniqueEmails = Array.from(new Set(matches.map(m => m.toLowerCase())));
      
      setCsvEmails(uniqueEmails);
    };
    reader.readAsText(file);
  };

  const validateImageFiles = (files: FileList | null): File | null => {
    if (!files || files.length === 0) return null;
    const file = files[0];
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setErrorMsg('Only PNG and JPG files are allowed.');
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image file size exceeds 5MB limit.');
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

  const handleAIGeneration = async () => {
    if (!aiPrompt.trim()) {
      setErrorMsg('Please enter a topic for the AI to generate the email.');
      return;
    }
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImageToStorage();
        if (!imageUrl) throw new Error('Image upload failed before AI generation.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { data: shop } = await supabase.from('shops').select('shop_name').eq('id', user?.id).maybeSingle();

      const res = await fetch('/api/ai/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, shop_name: shop?.shop_name || 'Our Shop', image_url: imageUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI Generation failed');
      
      setForm(prev => ({
        ...prev,
        subject: data.subject || prev.subject,
        html_body: data.html_body || prev.html_body
      }));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'AI Generation failed';
      setErrorMsg(errMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTag = (tag: CustomerTag) =>
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleConfirmSubmit = () => {
    setErrorMsg(null);
    if (!form.title.trim() || !form.subject.trim() || !form.html_body.trim()) {
      setErrorMsg('Please fill in all fields: title, subject, and email body.');
      return;
    }
    if (selectedTags.length === 0 && csvEmails.length === 0) {
      setErrorMsg('Please select at least one target audience tag or upload a CSV file.');
      return;
    }
    const totalCost = recipientCount * emailCreditCost;
    if (creditsAvailable < totalCost) {
      setErrorMsg(`Insufficient credits. Need ${totalCost.toFixed(2)}, have ${Number(creditsAvailable).toFixed(2)}.`);
      return;
    }
    setIsConfirmOpen(true);
  };

  const executeSubmit = async () => {
    setIsConfirmOpen(false);
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: form, targetTags: selectedTags, targetEmails: csvEmails }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Failed to dispatch email campaign.'); setIsSubmitting(false); return; }
      router.push('/dashboard/email/history');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred.');
      setIsSubmitting(false);
    }
  };

  const totalCost = recipientCount * emailCreditCost;
  const sufficient = creditsAvailable >= totalCost && recipientCount > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <Link href="/dashboard/email" className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] text-[#8B8378] hover:text-[#6366f1] transition-colors uppercase mb-6">
          <ArrowLeft size={12} /> Back to Email Marketing
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">New Email Campaign</h1>
            <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">Compose and send to your audience</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-[#3E3B36] rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={14} className="text-[#C4A896]" strokeWidth={1.5} />
          <p className="text-[#F5F1EA]/90 text-xs flex-1">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="text-[#8B8378] hover:text-[#F5F1EA]"><X size={14} /></button>
        </div>
      )}

      {sufficient && (
        <div className="border border-[#6366f1]/30 bg-[#6366f1]/5 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={16} className="text-[#6366f1]" strokeWidth={1.5} />
          <p className="text-xs text-[#3E3B36]">
            Credit check passed — <span className="font-medium">{(recipientCount * emailCreditCost).toLocaleString()} credits</span> will be deducted.
          </p>
        </div>
      )}

      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Mail size={12} strokeWidth={1.5} className="text-[#6366f1]" />
          <p className="text-[10px] tracking-[0.25em] text-[#8B8378] uppercase">Campaign Details</p>
        </div>

        <div>
          <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Campaign Title</label>
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            disabled={isSubmitting || isGenerating} className="input-editorial disabled:opacity-50" placeholder="e.g. Summer Sale Email Blast" />
        </div>

        {/* AI & Image Section */}
        <div className="bg-[#6366f1]/5 border border-[#6366f1]/20 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Wand2 size={14} className="text-[#6366f1]" />
            <p className="text-xs font-semibold text-[#6366f1] uppercase tracking-widest">AI Email Architect</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-2">Hero Image (Optional)</label>
              <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden h-32 flex flex-col items-center justify-center relative cursor-pointer hover:border-[#6366f1]/50 transition-colors"
                onDragOver={(e) => { e.preventDefault(); setImageDragging(true); }}
                onDragLeave={() => setImageDragging(false)}
                onDrop={handleImageDrop}
                onClick={() => imageRef.current?.click()}
              >
                {imagePreviewUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreviewUrl(null); }} className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black transition-colors">
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <input ref={imageRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleImageChange} />
                    <ImageIcon size={18} className="text-[#8B8378] mb-2" />
                    <p className="text-[10px] text-[#8B8378] uppercase tracking-widest">Upload Image</p>
                  </>
                )}
                {imageUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <Spinner className="w-4 h-4 border-t-[#6366f1] border-transparent" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col justify-between h-full">
              <div>
                <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-2">Topic / Prompt</label>
                <textarea rows={3} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} disabled={isSubmitting || isGenerating}
                  className="input-editorial resize-none text-xs h-20" placeholder="e.g. Announce our new summer collection with a 20% discount code SUMMER20..." />
              </div>
              <button onClick={handleAIGeneration} disabled={isSubmitting || isGenerating || !aiPrompt.trim()}
                className="mt-2 w-full py-2.5 bg-[#6366f1] text-white text-xs font-semibold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 hover:bg-[#4f46e5] disabled:opacity-50 transition-colors">
                {isGenerating ? <Spinner className="w-3 h-3 border-t-white border-transparent" /> : <Wand2 size={12} />}
                {isGenerating ? 'Generating...' : 'Generate Modern Email'}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Email Subject Line</label>
          <input type="text" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
            disabled={isSubmitting || isGenerating} className="input-editorial disabled:opacity-50" placeholder="e.g. 🎉 Exclusive offer just for you!" />
        </div>

        <div>
          <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Email Body (HTML or Plain Text)</label>
          <textarea rows={12} value={form.html_body} onChange={e => setForm({ ...form, html_body: e.target.value })}
            disabled={isSubmitting || isGenerating} className="input-editorial resize-none disabled:opacity-50 font-mono text-xs leading-relaxed"
            placeholder="<p>Hello,</p><p>We have an exclusive offer just for you...</p>" />
          <p className="text-[10px] text-[#8B8378] mt-1.5">HTML is supported. You can freely edit the AI generated code above.</p>
        </div>

        <div>
          <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-3">Target Audience Tags</label>
          <div className="space-y-2 mb-6">
            {tagOptions.map(t => (
              <label key={t.value} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                selectedTags.includes(t.value) ? 'border-[#6366f1]/40 bg-[#6366f1]/5' : 'border-[#E8E3DA] hover:border-[#6366f1]/30'
              }`}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedTags.includes(t.value)} disabled={isSubmitting}
                    onChange={() => !isSubmitting && toggleTag(t.value)} className="w-3.5 h-3.5 accent-[#6366f1]" />
                  <span className="text-sm text-[#3E3B36] font-medium">{t.label}</span>
                </div>
                <span className="text-xs text-[#8B8378]">{t.count.toLocaleString()} contacts</span>
              </label>
            ))}
          </div>

          <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-3">Custom Audience (CSV/Excel)</label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => csvFileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-[#F9F7F4] border border-[#E8E3DA] hover:border-[#6366f1]/30 rounded-lg text-sm text-[#3E3B36] font-medium transition-colors"
            >
              <Upload size={14} className="text-[#8B8378]" />
              Upload Contacts
            </button>
            <input type="file" accept=".csv,.txt" ref={csvFileRef} onChange={handleCsvUpload} className="hidden" />
            
            {csvFileName && (
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-[#10B981]/10 text-[#10B981] px-2 py-1 rounded font-bold">{csvEmails.length.toLocaleString()} emails found</span>
                <span className="text-[#8B8378] truncate max-w-[200px]">{csvFileName}</span>
                <button onClick={() => { setCsvFileName(null); setCsvEmails([]); }} className="text-red-400 hover:text-red-600"><X size={14} /></button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dispatch footer */}
      <div className="flex items-center justify-between bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5">
        <div>
          <p className="text-sm text-[#3E3B36] font-medium">
            {recipientCount > 0 ? `Ready to send to ${recipientCount.toLocaleString()} recipients` : 'Select tags or upload CSV to see recipient count'}
          </p>
          <p className="text-[10px] tracking-[0.1em] text-[#8B8378] uppercase mt-0.5">{emailCreditCost} credit{emailCreditCost !== 1 ? 's' : ''} per email · Deduplicates automatically</p>
        </div>
        <button
          onClick={handleConfirmSubmit}
          disabled={(selectedTags.length === 0 && csvEmails.length === 0) || recipientCount === 0 || !sufficient || isSubmitting}
          className="btn-primary rounded-lg flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: sufficient ? '#6366f1' : undefined }}
        >
          {isSubmitting ? (
            <><Spinner className="border-t-white border-transparent w-4 h-4" /><span>Sending...</span></>
          ) : (
            <><Send size={12} strokeWidth={1.5} /><span>Dispatch Email</span></>
          )}
        </button>
      </div>

      {/* Safety Confirmation Modal */}
      <CustomConfirm
        isOpen={isConfirmOpen}
        title="Confirm Email Dispatch"
        message={`Are you sure you want to launch this campaign to ${recipientCount.toLocaleString()} total recipients? This will deduct ${(recipientCount * emailCreditCost).toLocaleString()} credits from your wallet.`}
        confirmText="YES, DISPATCH"
        cancelText="Cancel"
        onConfirm={executeSubmit}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {isSubmitting && (
        <div className="fixed bottom-6 right-6 bg-[#3E3B36] text-[#F5F1EA] px-4 py-3 rounded-xl shadow-2xl border border-[#6366f1]/30 flex items-center gap-3 z-50">
          <Spinner className="border-t-[#6366f1] border-[#8B8378] w-4 h-4" />
          <span className="text-xs font-medium tracking-wide uppercase">Dispatching Campaign...</span>
        </div>
      )}
    </div>
  );
}
