'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Wallet } from '@/types/broadcast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { Upload, X, CheckCircle, AlertTriangle, Users, UserPlus, Tag, ArrowRight } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

type CustomerTag = 'VIP' | 'Regular' | 'New';

interface CustomerRow {
  customer_name: string;
  whatsapp_number: string;
  tags: CustomerTag[];
}

const TAG_OPTIONS: { value: CustomerTag; label: string; desc: string }[] = [
  { value: 'VIP', label: 'VIP', desc: 'High-value, priority customers' },
  { value: 'Regular', label: 'Regular', desc: 'Established returning customers' },
  { value: 'New', label: 'New', desc: 'Recently added contacts' },
];

export default function CustomersUploadPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [totalInDB, setTotalInDB] = useState(0);

  // Upload/Parse states
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTag, setSelectedTag] = useState<CustomerTag>('Regular');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'uploading' | 'done' | 'error'>('idle');
  const [uploadMsg, setUploadMsg] = useState('');

  // Manual insertion state
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualTag, setManualTag] = useState<CustomerTag>('New');
  const [manualStatus, setManualStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDbTotal = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase.from('customers_master').select('*', { count: 'exact', head: true }).eq('shop_id', user.id);
    if (count !== null) setTotalInDB(count);
  }, []);

  useEffect(() => {
    async function initUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: w } = await supabase.from('wallets').select('*').eq('shop_id', user.id).maybeSingle();
      if (w) setWallet(w);
      await fetchDbTotal();
    }
    initUser();
  }, [fetchDbTotal]);

  const validatePhone = (num: string) => {
    return num.replace(/\D/g, '').match(/[0-9]{10}$/)?.[0] || null;
  };

  const parseFile = useCallback((file: File) => {
    setUploadStatus('parsing');
    setUploadMsg('');
    
    const processData = (data: Record<string, any>[]) => {
      let rejected = 0;
      const parsed: CustomerRow[] = [];
      data.forEach(row => {
        const name = (row['name'] || row['Name'] || row['NAME'] || '').trim();
        const rawPhone = (row['phone'] || row['Phone'] || row['PHONE'] || row['mobile'] || row['Mobile'] || '').toString().trim();
        const validPhone = validatePhone(rawPhone);
        if (validPhone) {
          parsed.push({ customer_name: name, whatsapp_number: validPhone, tags: [selectedTag] });
        } else if (rawPhone.length > 0) {
          rejected++;
        }
      });
      setCustomers(parsed);
      setUploadStatus('idle');
      if (rejected > 0) {
        setUploadMsg(`Skipped ${rejected} rows with invalid phone formats.`);
      }
    };

    if (file.name.endsWith('.csv')) {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => processData(result.data),
        error: (err) => { setUploadMsg(`CSV parse error: ${err.message}`); setUploadStatus('error'); },
      });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
          processData(json);
        } catch (err: any) {
          setUploadMsg(`Excel parse error: ${err.message}`);
          setUploadStatus('error');
        }
      };
      reader.onerror = () => { setUploadMsg('Failed to read Excel file.'); setUploadStatus('error'); };
      reader.readAsBinaryString(file);
    } else {
      setUploadMsg('Unsupported file format.');
      setUploadStatus('error');
    }
  }, [selectedTag]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleBulkUpload = async () => {
    if (customers.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploadStatus('uploading');
    const CHUNK_SIZE = 500;
    let errorOccurred = false;

    for (let i = 0; i < customers.length; i += CHUNK_SIZE) {
      const chunk = customers.slice(i, i + CHUNK_SIZE).map((c) => ({
        shop_id: user.id,
        customer_name: c.customer_name,
        whatsapp_number: c.whatsapp_number,
        tags: c.tags,
      }));
      const { error } = await supabase.from('customers_master').upsert(chunk, { onConflict: 'shop_id,whatsapp_number' });
      if (error) { errorOccurred = true; break; }
    }

    if (errorOccurred) {
      setUploadMsg('Upload failed. Some records may not have been saved.');
      setUploadStatus('error');
    } else {
      setUploadMsg(`${customers.length} contacts merged successfully.`);
      setUploadStatus('done');
      await fetchDbTotal();
      setCustomers([]);
    }
  };

  const handleManualInsert = async () => {
    const validPhone = validatePhone(manualPhone);
    if (!validPhone) {
      setManualStatus('error');
      alert('Invalid phone format. Please enter a valid 10-digit number.');
      return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setManualStatus('saving');
    const { error } = await supabase.from('customers_master').upsert(
      [{ shop_id: user.id, customer_name: manualName.trim(), whatsapp_number: validPhone, tags: [manualTag] }],
      { onConflict: 'shop_id,whatsapp_number' }
    );

    if (error) {
      setManualStatus('error');
    } else {
      setManualStatus('saved');
      setManualName('');
      setManualPhone('');
      await fetchDbTotal();
      setTimeout(() => setManualStatus('idle'), 2500);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Upload Contacts</h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">
            Sync recipients to your active database
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/customers/management"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#3E3B36] hover:bg-[#C4A896] text-[#F5F1EA] text-xs tracking-[0.15em] uppercase rounded-lg transition-colors"
          >
            Manage Audience <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Bulk CSV/XLSX Upload (col-span-2) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Tag selector */}
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Tag size={14} className="text-[#C4A896]" strokeWidth={1.5} />
              <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase">Upload Tag Classification</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setSelectedTag(t.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedTag === t.value
                      ? 'border-[#C4A896] bg-[#F5F1EA]'
                      : 'border-[#E8E3DA] hover:border-[#C4A896]/50'
                  }`}
                >
                  <p className="text-sm font-medium text-[#3E3B36]">{t.label}</p>
                  <p className="text-[10px] text-[#8B8378] mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Drop Zone */}
          <div
            className={`dropzone p-10 text-center cursor-pointer transition-all relative ${isDragging ? 'active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            role="button"
            aria-label="Upload CSV/Excel contact file"
          >
            {uploadStatus === 'parsing' && (
              <div className="absolute inset-0 z-10 bg-[#FFFFFF]/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
                <div className="flex flex-col items-center gap-3">
                  <Spinner />
                  <p className="text-[10px] tracking-[0.25em] text-[#8B8378] uppercase font-medium">Parsing Recipient Registries...</p>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = ''; }} />
            <div className="w-12 h-12 bg-[#F5F1EA] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Upload size={20} className="text-[#8B8378]" strokeWidth={1.5} />
            </div>
            <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mb-1">
              {isDragging ? 'Release to upload' : 'Drop .csv or .xlsx file here'}
            </p>
            <p className="text-[10px] text-[#8B8378]">or click to browse · Columns: name, phone</p>
            <div className="mt-4 inline-flex items-center gap-2 border border-[#E8E3DA] rounded-lg px-3 py-1.5">
              <Tag size={10} className="text-[#C4A896]" />
              <span className="text-[10px] tracking-[0.1em] text-[#8B8378] uppercase">Will be tagged as: {selectedTag}</span>
            </div>
          </div>

          {uploadMsg && uploadStatus !== 'parsing' && uploadStatus !== 'uploading' && (
            <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-4 flex items-center justify-between">
              <p className="text-[11px] text-[#8B8378]">{uploadMsg}</p>
            </div>
          )}

          {/* Parsed Preview before upload */}
          {customers.length > 0 && (
            <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E3DA]">
                <div className="flex items-center gap-2.5">
                  <Users size={14} className="text-[#C4A896]" strokeWidth={1.5} />
                  <p className="text-xs tracking-[0.15em] text-[#3E3B36] uppercase font-medium">{customers.length.toLocaleString()} Valid Contacts Parsed</p>
                </div>
                <button onClick={() => { setCustomers([]); setUploadStatus('idle'); }} className="text-[#8B8378] hover:text-[#C4A896] transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="px-5 py-4 flex items-center gap-4 border-b border-[#E8E3DA]">
                <button onClick={handleBulkUpload} disabled={uploadStatus === 'uploading'} className="btn-primary rounded-lg flex items-center gap-2 disabled:opacity-50">
                  {uploadStatus === 'uploading' ? <Spinner /> : <Upload size={12} strokeWidth={1.5} />}
                  {uploadStatus === 'uploading' ? 'Merging Database...' : 'Commit Upload to Database'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT — Quick Manual Insertion Sidebar */}
        <div className="space-y-5">
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8E3DA] flex items-center gap-3">
              <div className="w-7 h-7 bg-[#F5F1EA] rounded-lg flex items-center justify-center">
                <UserPlus size={13} className="text-[#C4A896]" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">Quick Add</h2>
                <p className="text-[10px] tracking-[0.1em] text-[#8B8378] uppercase">Single contact entry</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Customer Name</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="input-editorial"
                  placeholder="Ayesha Khan"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">WhatsApp Number</label>
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="input-editorial"
                  placeholder="10 digit number"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Tag</label>
                <div className="space-y-1.5">
                  {TAG_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setManualTag(t.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                        manualTag === t.value
                          ? 'border-[#C4A896] bg-[#F5F1EA] text-[#3E3B36]'
                          : 'border-[#E8E3DA] text-[#8B8378] hover:border-[#C4A896]/50'
                      }`}
                    >
                      {t.label} · <span className="text-[10px]">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleManualInsert}
                disabled={!manualPhone.trim() || manualStatus === 'saving'}
                className="btn-primary rounded-lg w-full flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {manualStatus === 'saving' ? <Spinner /> : <UserPlus size={12} strokeWidth={1.5} />}
                {manualStatus === 'saving' ? 'Adding...' : 'Add Contact'}
              </button>
              {manualStatus === 'saved' && (
                <div className="flex items-center justify-center gap-1.5 text-[#C4A896]">
                  <CheckCircle size={14} strokeWidth={1.5} />
                  <span className="text-xs tracking-[0.1em] uppercase">Contact added!</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-[#3E3B36] rounded-xl p-5">
            <p className="text-[10px] tracking-[0.25em] text-[#F5F1EA]/50 uppercase mb-1">Database Total</p>
            <p className="serif-headline text-4xl text-[#F5F1EA] leading-none">{totalInDB.toLocaleString()}</p>
            <p className="text-[10px] tracking-[0.15em] text-[#C4A896] uppercase mt-1.5">Contacts on record</p>
          </div>
        </div>
      </div>
    </div>
  );
}
