'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type {
  CampaignFormValues,
  ParsedContact,
  CreditCheckResult,
  Wallet,
  BroadcastPayload,
} from '@/types/broadcast';
import Papa from 'papaparse';
import { Upload, X, CheckCircle, AlertTriangle, Send, Users, FileText } from 'lucide-react';

type StepState = 'compose' | 'preview' | 'dispatching' | 'success' | 'error';

export default function BroadcastPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [form, setForm] = useState<CampaignFormValues>({ title: '', message_body: '', image_url: '' });
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [creditCheck, setCreditCheck] = useState<CreditCheckResult | null>(null);
  const [step, setStep] = useState<StepState>('compose');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadWallet() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('wallets').select('*').eq('shop_id', user.id).single();
      if (data) setWallet(data);
    }
    loadWallet();
  }, []);

  // Credit check recalculates whenever contacts change
  useEffect(() => {
    if (!wallet || contacts.length === 0) {
      setCreditCheck(null);
      return;
    }
    const required = contacts.length;
    const available = wallet.credits_remaining;
    setCreditCheck({
      sufficient: available >= required,
      creditsAvailable: available,
      creditsRequired: required,
      deficit: Math.max(0, required - available),
    });
  }, [wallet, contacts]);

  const parseCSV = useCallback((file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed: ParsedContact[] = result.data
          .map((row) => ({
            name: (row['name'] || row['Name'] || row['NAME'] || '').trim(),
            phone: (row['phone'] || row['Phone'] || row['PHONE'] || row['mobile'] || row['Mobile'] || '').trim(),
          }))
          .filter((c) => c.phone.length > 0);

        setContacts(parsed);
      },
      error: (err) => {
        setErrorMsg(`CSV parse error: ${err.message}`);
      },
    });
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      parseCSV(file);
    } else {
      setErrorMsg('Please upload a valid .csv file.');
    }
  }, [parseCSV]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseCSV(file);
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (!form.title.trim() || !form.message_body.trim()) {
      setErrorMsg('Please fill in campaign title and message.');
      return;
    }

    if (contacts.length === 0) {
      setErrorMsg('Please upload a contact CSV with at least one phone number.');
      return;
    }

    if (creditCheck && !creditCheck.sufficient) {
      setErrorMsg(`Insufficient credits. You need ${creditCheck.deficit} more credits.`);
      return;
    }

    setStep('dispatching');

    setStep('dispatching');

    try {
      const payload: BroadcastPayload = {
        campaign: form,
        recipients: contacts,
        creditsRequired: creditCheck!.creditsRequired,
      };

      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to dispatch broadcast');
        setStep('error');
        return;
      }

      setStep('success');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: freshWallet } = await (supabase.from('wallets') as any).select('*').eq('shop_id', user.id).single();
        if (freshWallet) setWallet(freshWallet);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
      setStep('error');
    }
  };

  const resetForm = () => {
    setForm({ title: '', message_body: '', image_url: '' });
    setContacts([]);
    setCreditCheck(null);
    setStep('compose');
    setErrorMsg(null);
  };

  // ─── SUCCESS STATE ──────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-14 h-14 bg-[#F5F1EA] border border-[#C4A896]/40 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={24} className="text-[#C4A896]" strokeWidth={1.5} />
        </div>
        <h1 className="serif-headline text-2xl text-[#3E3B36] mb-3">Campaign dispatched</h1>
        <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mb-8">
          {contacts.length} recipients queued · {contacts.length} credits deducted
        </p>
        <button onClick={resetForm} className="btn-primary rounded-lg">
          Create Another Campaign
        </button>
      </div>
    );
  }

  // ─── DISPATCHING STATE ──────────────────────────────────────────
  if (step === 'dispatching') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin mx-auto mb-6" />
        <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase">Queueing broadcast...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Page Header */}
      <div>
        <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Campaign Creator</h1>
        <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">
          Craft your broadcast message and upload your contact list
        </p>
      </div>

      {/* Credit Check Banner */}
      {creditCheck && !creditCheck.sufficient && (
        <div className="bg-[#3E3B36] rounded-xl p-5 flex items-start gap-4">
          <AlertTriangle size={18} className="text-[#C4A896] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-[#F5F1EA]/90 text-sm font-medium mb-1">Insufficient credits to dispatch</p>
            <p className="text-[#F5F1EA]/70 text-xs leading-relaxed">
              This campaign requires <span className="text-[#C4A896]">{creditCheck.creditsRequired} credits</span>.
              You currently have <span className="text-[#C4A896]">{creditCheck.creditsAvailable}</span>.
              You need <span className="text-[#C4A896]">{creditCheck.deficit} more</span>.
            </p>
          </div>
        </div>
      )}

      {/* Credit Check — Sufficient */}
      {creditCheck && creditCheck.sufficient && (
        <div className="border border-[#C4A896]/40 bg-[#F5F1EA] rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={16} className="text-[#C4A896]" strokeWidth={1.5} />
          <p className="text-xs text-[#3E3B36]">
            Credit check passed — {creditCheck.creditsRequired} credits will be deducted on dispatch.{' '}
            <span className="text-[#8B8378]">{creditCheck.creditsAvailable - creditCheck.creditsRequired} remaining after.</span>
          </p>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="bg-[#3E3B36] rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={14} className="text-[#C4A896]" strokeWidth={1.5} />
          <p className="text-[#F5F1EA]/90 text-xs">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-[#8B8378] hover:text-[#F5F1EA]">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Campaign Compose */}
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-6 space-y-5">

          <div>
            <p className="text-[10px] tracking-[0.25em] text-[#8B8378] uppercase mb-4 flex items-center gap-2">
              <FileText size={12} strokeWidth={1.5} /> Campaign Details
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
              Campaign Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-editorial"
              placeholder="e.g. Eid Collection Drop — July"
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
              Message Body
            </label>
            <textarea
              rows={6}
              value={form.message_body}
              onChange={(e) => setForm({ ...form, message_body: e.target.value })}
              className="input-editorial resize-none"
              placeholder="Hi {name}, we have an exclusive offer just for you…"
            />
            <p className="text-[10px] text-[#8B8378] mt-1.5">
              Use <code className="bg-[#F5F1EA] px-1 rounded text-[#C4A896]">{'{name}'}</code> to personalise each message.
            </p>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
              Image URL <span className="text-[#8B8378] normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={form.image_url ?? ''}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="input-editorial"
              placeholder="https://cdn.example.com/offer-banner.jpg"
            />
          </div>

          {/* Message Preview */}
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

        {/* Right: CSV Upload & Contact List */}
        <div className="space-y-5">

          {/* Dropzone */}
          <div
            className={`dropzone p-8 text-center cursor-pointer transition-all ${isDragging ? 'active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileRef.current?.click()}
            role="button"
            aria-label="Upload CSV contact file"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-10 h-10 bg-[#F5F1EA] rounded-lg flex items-center justify-center mx-auto mb-4">
              <Upload size={18} className="text-[#8B8378]" strokeWidth={1.5} />
            </div>
            <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mb-1">
              Drop CSV file here
            </p>
            <p className="text-[10px] text-[#8B8378]">
              or click to browse · Columns: name, phone
            </p>
          </div>

          {/* CSV format hint */}
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-4">
            <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-2">Expected CSV Format</p>
            <pre className="text-[11px] text-[#3E3B36] font-mono leading-relaxed">
{`name,phone
Ayesha Khan,+919876543210
Ravi Sharma,+919812345678`}
            </pre>
          </div>

          {/* Contact Preview */}
          {contacts.length > 0 && (
            <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">

              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E3DA]">
                <div className="flex items-center gap-2.5">
                  <Users size={14} className="text-[#C4A896]" strokeWidth={1.5} />
                  <p className="text-xs tracking-[0.15em] text-[#3E3B36] uppercase font-medium">
                    {contacts.length.toLocaleString()} Contacts Loaded
                  </p>
                </div>
                <button
                  onClick={() => { setContacts([]); setCreditCheck(null); }}
                  className="text-[#8B8378] hover:text-[#C4A896] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="max-h-52 overflow-y-auto">
                {contacts.slice(0, 20).map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-5 py-2.5 border-b border-[#E8E3DA]/60 last:border-0"
                  >
                    <span className="text-xs text-[#3E3B36]">{c.name || '—'}</span>
                    <span className="text-xs text-[#8B8378] font-mono">{c.phone}</span>
                  </div>
                ))}
                {contacts.length > 20 && (
                  <div className="px-5 py-3 text-center">
                    <p className="text-[10px] tracking-[0.1em] text-[#8B8378] uppercase">
                      +{(contacts.length - 20).toLocaleString()} more contacts
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Dispatch Button */}
      <div className="flex items-center justify-between bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5">
        <div>
          <p className="text-sm text-[#3E3B36] font-medium">
            {contacts.length > 0
              ? `Ready to send to ${contacts.length.toLocaleString()} contacts`
              : 'Upload contacts to proceed'}
          </p>
          <p className="text-[10px] tracking-[0.1em] text-[#8B8378] uppercase mt-0.5">
            1 credit per message · No subscription required
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={contacts.length === 0 || (creditCheck !== null && !creditCheck.sufficient)}
          className="btn-primary rounded-lg flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={12} strokeWidth={1.5} />
          Dispatch Campaign
        </button>
      </div>

    </div>
  );
}
