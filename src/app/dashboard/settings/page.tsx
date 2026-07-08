'use client';

import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Shop, Wallet } from '@/types/broadcast';
import { CheckCircle, AlertTriangle, CreditCard, User, Building } from 'lucide-react';

export default function SettingsPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [shopForm, setShopForm] = useState({ 
    shop_name: '', 
    owner_phone: '', 
    industry_type: '',
    meta_access_token: '',
    meta_phone_number_id: '',
    meta_business_account_id: '',
    meta_template_name: '' 
  });
  const [creditAmount, setCreditAmount] = useState<number>(100);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [creditStatus, setCreditStatus] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');
  const [loading, setLoading] = useState(true);

  const CREDIT_PACKS = [
    { amount: 50, label: '50 Credits', desc: 'Starter Pack' },
    { amount: 200, label: '200 Credits', desc: 'Growth Pack' },
    { amount: 500, label: '500 Credits', desc: 'Pro Pack' },
    { amount: 1000, label: '1,000 Credits', desc: 'Enterprise Pack' },
  ];

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: shopData }, { data: walletData }] = await Promise.all([
        supabase.from('shops').select('*').eq('id', user.id).single(),
        supabase.from('wallets').select('*').eq('shop_id', user.id).single(),
      ]);

      if (shopData) {
        setShop(shopData);
        setShopForm({
          shop_name: shopData.shop_name || '',
          owner_phone: shopData.owner_phone || '',
          industry_type: shopData.industry_type || '',
          meta_access_token: shopData.meta_access_token || '',
          meta_phone_number_id: shopData.meta_phone_number_id || '',
          meta_business_account_id: shopData.meta_business_account_id || '',
          meta_template_name: shopData.meta_template_name || '',
        });
      }
      if (walletData) setWallet(walletData);
      setLoading(false);
    }

    load();
  }, []);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('shops') as any)
      .update({
        shop_name: shopForm.shop_name,
        owner_phone: shopForm.owner_phone,
        industry_type: shopForm.industry_type,
        meta_access_token: shopForm.meta_access_token,
        meta_phone_number_id: shopForm.meta_phone_number_id,
        meta_business_account_id: shopForm.meta_business_account_id,
        meta_template_name: shopForm.meta_template_name,
      })
      .eq('id', user.id);

    setSaveStatus(error ? 'error' : 'saved');
    if (!error) {
      setShop((prev) => prev ? { ...prev, ...shopForm } : prev);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleTopUpCredits = async () => {
    setCreditStatus('adding');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const current = wallet?.credits_remaining ?? 0;
    const { error } = await supabase
      .from('wallets')
      .update({
        credits_remaining: current + creditAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('shop_id', user.id);

    if (error) {
      setCreditStatus('error');
      return;
    }

    setCreditStatus('added');
    setWallet((prev) => prev ? { ...prev, credits_remaining: current + creditAmount } : prev);
    setTimeout(() => setCreditStatus('idle'), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Page Header */}
      <div>
        <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Shop Settings</h1>
        <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">
          Manage your workspace configuration and credit wallet
        </p>
      </div>

      {/* ── CREDIT WALLET ───────────────────────────────────────── */}
      <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">

        <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F5F1EA] rounded-lg flex items-center justify-center">
            <CreditCard size={14} className="text-[#C4A896]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">Credit Wallet</h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">Pay-as-you-send ledger</p>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Balance display */}
          <div className="bg-[#3E3B36] rounded-xl p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] tracking-[0.25em] text-[#F5F1EA]/50 uppercase mb-1">Current Balance</p>
              <p className="serif-headline text-4xl text-[#F5F1EA]">
                {wallet ? wallet.credits_remaining.toLocaleString() : '0'}
              </p>
              <p className="text-xs text-[#C4A896] mt-1 tracking-[0.1em] uppercase">Credits</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-[0.15em] text-[#F5F1EA]/50 uppercase mb-1">Rate</p>
              <p className="text-sm text-[#F5F1EA]/80">1 Credit</p>
              <p className="text-[10px] text-[#C4A896] tracking-[0.1em]">= 1 Message</p>
            </div>
          </div>

          {/* Credit packs */}
          <div>
            <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-3">Select Credit Pack</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.amount}
                  onClick={() => setCreditAmount(pack.amount)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    creditAmount === pack.amount
                      ? 'border-[#C4A896] bg-[#F5F1EA]'
                      : 'border-[#E8E3DA] bg-[#FFFFFF] hover:border-[#C4A896]/50'
                  }`}
                >
                  <p className="text-sm font-medium text-[#3E3B36]">{pack.label}</p>
                  <p className="text-[10px] text-[#8B8378] tracking-[0.1em] uppercase mt-0.5">{pack.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
              Custom Amount
            </label>
            <input
              type="number"
              min={1}
              max={100000}
              value={creditAmount}
              onChange={(e) => setCreditAmount(Math.max(1, parseInt(e.target.value) || 1))}
              className="input-editorial max-w-xs"
              placeholder="Enter credit amount"
            />
          </div>

          {/* Action note */}
          <div className="bg-[#F5F1EA] border border-[#E8E3DA] rounded-lg p-4">
            <p className="text-xs text-[#3E3B36] leading-relaxed">
              <span className="text-[#C4A896] font-medium">Note:</span> In production, credit top-ups are processed via a payment gateway.
              This button simulates adding credits directly to your wallet for testing purposes.
            </p>
          </div>

          {/* Top up button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleTopUpCredits}
              disabled={creditStatus === 'adding'}
              className="btn-primary rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {creditStatus === 'adding' ? 'Processing...' : `Add ${creditAmount.toLocaleString()} Credits`}
            </button>
            {creditStatus === 'added' && (
              <div className="flex items-center gap-1.5 text-[#C4A896]">
                <CheckCircle size={14} strokeWidth={1.5} />
                <span className="text-xs tracking-[0.1em] uppercase">Credits added!</span>
              </div>
            )}
            {creditStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-[#8B8378]">
                <AlertTriangle size={14} strokeWidth={1.5} />
                <span className="text-xs tracking-[0.1em] uppercase">Failed to add credits</span>
              </div>
            )}
          </div>

        </div>

      </section>

      {/* ── SHOP PROFILE ────────────────────────────────────────── */}
      <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">

        <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F5F1EA] rounded-lg flex items-center justify-center">
            <Building size={14} className="text-[#C4A896]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">Shop Profile</h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">Business identity node</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="p-6 space-y-5">

          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
              Shop / Brand Name
            </label>
            <input
              type="text"
              required
              value={shopForm.shop_name}
              onChange={(e) => setShopForm({ ...shopForm, shop_name: e.target.value })}
              className="input-editorial"
              placeholder="Your shop name"
            />
          </div>

          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
              Owner WhatsApp Number
            </label>
            <input
              type="tel"
              required
              value={shopForm.owner_phone}
              onChange={(e) => setShopForm({ ...shopForm, owner_phone: e.target.value })}
              className="input-editorial"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
              Industry Type
            </label>
            <input
              type="text"
              value={shopForm.industry_type}
              onChange={(e) => setShopForm({ ...shopForm, industry_type: e.target.value })}
              className="input-editorial"
              placeholder="e.g. Fashion & Apparel"
            />
          </div>

          <div className="border-t border-[#E8E3DA] pt-4 mt-4">
            <h3 className="lexend-subheading text-sm font-medium text-[#3E3B36] mb-4">Meta API Credentials</h3>
          </div>

          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
              Meta Access Token
            </label>
            <input
              type="password"
              value={shopForm.meta_access_token}
              onChange={(e) => setShopForm({ ...shopForm, meta_access_token: e.target.value })}
              className="input-editorial"
              placeholder="EAAB..."
            />
          </div>

          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
              Phone Number ID
            </label>
            <input
              type="text"
              value={shopForm.meta_phone_number_id}
              onChange={(e) => setShopForm({ ...shopForm, meta_phone_number_id: e.target.value })}
              className="input-editorial"
              placeholder="1234567890"
            />
          </div>

          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
              Business Account ID
            </label>
            <input
              type="text"
              value={shopForm.meta_business_account_id}
              onChange={(e) => setShopForm({ ...shopForm, meta_business_account_id: e.target.value })}
              className="input-editorial"
              placeholder="0987654321"
            />
          </div>

          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
              Default Template Name
            </label>
            <input
              type="text"
              value={shopForm.meta_template_name}
              onChange={(e) => setShopForm({ ...shopForm, meta_template_name: e.target.value })}
              className="input-editorial"
              placeholder="hello_world"
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={saveStatus === 'saving'}
              className="btn-primary rounded-lg disabled:opacity-50"
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save Profile'}
            </button>
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-1.5 text-[#C4A896]">
                <CheckCircle size={14} strokeWidth={1.5} />
                <span className="text-xs tracking-[0.1em] uppercase">Saved!</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-[#8B8378]">
                <AlertTriangle size={14} strokeWidth={1.5} />
                <span className="text-xs tracking-[0.1em] uppercase">Save failed</span>
              </div>
            )}
          </div>

        </form>

      </section>

      {/* ── ACCOUNT INFO ────────────────────────────────────────── */}
      <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">

        <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F5F1EA] rounded-lg flex items-center justify-center">
            <User size={14} className="text-[#C4A896]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">Account Details</h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">Workspace identity</p>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {[
              { label: 'Workspace ID', value: shop?.id ?? '—' },
              { label: 'Created', value: shop ? new Date(shop.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
            ].map((item) => (
              <div key={item.label} className="flex items-start justify-between py-3 border-b border-[#E8E3DA] last:border-0">
                <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase">{item.label}</p>
                <p className="text-xs text-[#3E3B36] font-mono max-w-xs truncate text-right">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

      </section>

    </div>
  );
}
