'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { Campaign, Shop, Wallet } from '@/types/broadcast';
import { Radio, TrendingUp, Users, Zap, ArrowRight, AlertTriangle, Send, Database } from 'lucide-react';

export default function DashboardPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [
        { data: shopData },
        { data: walletData },
        { data: campaignData },
        { count: contactCount },
      ] = await Promise.all([
        supabase.from('shops').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('wallets').select('*').eq('shop_id', user.id).maybeSingle(),
        supabase.from('campaigns').select('*').eq('shop_id', user.id).order('created_at', { ascending: false }).limit(6),
        supabase.from('customers_master').select('*', { count: 'exact', head: true }).eq('shop_id', user.id),
      ]);
      if (shopData) setShop(shopData);
      if (walletData) setWallet(walletData);
      if (campaignData) setCampaigns(campaignData);
      setTotalContacts(contactCount ?? 0);
      setLoading(false);
    }
    load();
  }, []);

  const totalDelivered = campaigns.filter(c => c.status === 'completed').reduce((s, c) => s + c.total_recipients, 0);

  const metrics = [
    { label: 'Credits Remaining', value: wallet ? wallet.credits_remaining.toLocaleString() : '—', icon: <Zap size={16} strokeWidth={1.5} className="text-[#C4A896]" />, low: !!(wallet && wallet.credits_remaining < 50), href: '/dashboard/settings', action: 'Top Up' },
    { label: 'Campaigns Launched', value: campaigns.length.toString(), icon: <Radio size={16} strokeWidth={1.5} className="text-[#C4A896]" />, low: false, href: '/dashboard/broadcast', action: 'New Campaign' },
    { label: 'Messages Delivered', value: totalDelivered.toLocaleString(), icon: <Send size={16} strokeWidth={1.5} className="text-[#C4A896]" />, low: false, href: '/dashboard/history', action: 'View History' },
    { label: 'Total Contacts', value: totalContacts.toLocaleString(), icon: <Database size={16} strokeWidth={1.5} className="text-[#C4A896]" />, low: false, href: '/dashboard/customers', action: 'Manage Audience' },
  ];

  const statusConfig: Record<string, { label: string; className: string }> = {
    completed: { label: 'Completed', className: 'status-pill status-completed' },
    processing: { label: 'Processing', className: 'status-pill status-processing' },
    pending: { label: 'Pending', className: 'status-pill status-pending' },
    insufficient_credits: { label: 'Insufficient Credits', className: 'status-pill status-insufficient_credits' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">
            {shop ? `Good morning, ${shop.shop_name}` : 'Dashboard'}
          </h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">Broadcast Command Centre</p>
        </div>
        <Link href="/dashboard/broadcast" className="btn-primary rounded-lg hidden sm:inline-flex items-center gap-2">
          <Radio size={12} strokeWidth={1.5} /> New Campaign
        </Link>
      </div>

      {wallet && wallet.credits_remaining < 50 && (
        <div className="bg-[#3E3B36] rounded-xl p-5 flex items-start gap-4">
          <AlertTriangle size={18} className="text-[#C4A896] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-[#F5F1EA] text-sm font-medium mb-0.5">Credit balance running low</p>
            <p className="text-[#F5F1EA]/70 text-xs leading-relaxed">
              You have <span className="text-[#C4A896]">{wallet.credits_remaining} credits</span> remaining. Top up to continue broadcasting without interruption.
            </p>
          </div>
          <Link href="/dashboard/settings" className="ml-auto text-xs tracking-[0.15em] text-[#C4A896] uppercase hover:text-[#F5F1EA] transition-colors flex-shrink-0">Top Up →</Link>
        </div>
      )}

      {/* 4 Unified Luxury Flat White Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5 hover:border-[#C4A896]/40 transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C4A896]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 bg-[#F5F1EA] rounded-lg flex items-center justify-center">{m.icon}</div>
              {m.low ? <AlertTriangle size={12} className="text-[#8B8378]" /> : <TrendingUp size={12} className="text-[#E8E3DA]" />}
            </div>
            <p className="text-[10px] tracking-[0.25em] text-[#8B8378] uppercase mb-1.5">{m.label}</p>
            <p className="serif-headline text-2xl md:text-3xl text-[#3E3B36] leading-none">{m.value}</p>
            <Link href={m.href} className="mt-3 text-[10px] tracking-[0.1em] text-[#8B8378] uppercase hover:text-[#C4A896] transition-colors inline-flex items-center gap-1">
              {m.action} <ArrowRight size={9} />
            </Link>
          </div>
        ))}
      </div>

      {/* Recent Active Campaigns — Supabase live feed */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E3DA]">
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">Recent Active Campaigns</h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mt-0.5">Last {campaigns.length} dispatches · Live feed</p>
          </div>
          <Link href="/dashboard/history" className="flex items-center gap-1.5 text-xs tracking-[0.1em] text-[#8B8378] hover:text-[#C4A896] transition-colors uppercase">
            View All <ArrowRight size={12} />
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="py-16 text-center">
            <Radio size={28} className="text-[#E8E3DA] mx-auto mb-4" strokeWidth={1} />
            <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-4">No campaigns yet</p>
            <Link href="/dashboard/broadcast" className="btn-primary rounded-lg inline-flex">Create First Campaign</Link>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-[#E8E3DA] bg-[#F5F1EA]/40">
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Campaign</p>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Recipients</p>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Status</p>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Date</p>
            </div>
            {campaigns.map((c) => {
              const s = statusConfig[c.status] ?? statusConfig.pending;
              const date = new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              return (
                <div key={c.id} className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-[#E8E3DA] last:border-0 hover:bg-[#F5F1EA]/50 transition-colors">
                  <div>
                    <p className="text-sm text-[#3E3B36] font-medium truncate">{c.title}</p>
                    <p className="text-[10px] text-[#8B8378] mt-0.5 truncate">{c.message_body.substring(0, 40)}…</p>
                  </div>
                  <div className="flex items-center gap-1.5"><Users size={12} className="text-[#8B8378]" /><span className="text-sm text-[#3E3B36]">{c.total_recipients.toLocaleString()}</span></div>
                  <div className="flex items-center"><span className={s.className}>{s.label}</span></div>
                  <div className="flex items-center"><span className="text-xs text-[#8B8378]">{date}</span></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
