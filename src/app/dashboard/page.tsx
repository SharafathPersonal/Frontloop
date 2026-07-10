'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { Campaign, Shop, Wallet } from '@/types/broadcast';
import { Radio, ArrowRight, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channelCampaigns: any;
    let channelWallet: any;
    let channelShop: any;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fetchAllData = async () => {
        const [
          { data: shopData },
          { data: walletData },
          { data: campaignData },
        ] = await Promise.all([
          supabase.from('shops').select('*').eq('id', user.id).maybeSingle(),
          supabase.from('wallets').select('*').eq('shop_id', user.id).maybeSingle(),
          supabase.from('campaigns').select('*').eq('shop_id', user.id).order('created_at', { ascending: true }),
        ]);
        if (shopData) setShop(shopData);
        if (walletData) setWallet(walletData);
        if (campaignData) setCampaigns(campaignData);
      };

      await fetchAllData();
      setLoading(false);

      // Subscribe to campaigns
      channelCampaigns = supabase
        .channel(`dashboard-campaigns:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'campaigns', filter: `shop_id=eq.${user.id}` },
          () => fetchAllData()
        )
        .subscribe();

      // Subscribe to wallets
      channelWallet = supabase
        .channel(`dashboard-wallet:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'wallets', filter: `shop_id=eq.${user.id}` },
          () => fetchAllData()
        )
        .subscribe();

      // Subscribe to shops
      channelShop = supabase
        .channel(`dashboard-shop:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'shops', filter: `id=eq.${user.id}` },
          () => fetchAllData()
        )
        .subscribe();
    }

    load();

    return () => {
      if (channelCampaigns) supabase.removeChannel(channelCampaigns);
      if (channelWallet) supabase.removeChannel(channelWallet);
      if (channelShop) supabase.removeChannel(channelShop);
    };
  }, []);

  const { totalSent, totalDelivered, totalRead, totalFailed, chartData } = useMemo(() => {
    let s = 0, d = 0, r = 0, f = 0;
    const timeline: Record<string, { date: string; sent: number; delivered: number; read: number; failed: number }> = {};

    campaigns.forEach(c => {
      const sent = c.total_sent ?? 0;
      const failed = c.total_failed ?? 0;
      const read = c.total_read ?? 0;
      const delivered = c.total_delivered ?? 0;

      s += sent;
      d += delivered;
      r += read;
      f += failed;

      const dateStr = new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (!timeline[dateStr]) {
        timeline[dateStr] = { date: dateStr, sent: 0, delivered: 0, read: 0, failed: 0 };
      }
      timeline[dateStr].sent += sent;
      timeline[dateStr].delivered += delivered;
      timeline[dateStr].read += read;
      timeline[dateStr].failed += failed;
    });

    let cumulativeS = 0;
    let cumulativeD = 0;
    let cumulativeR = 0;
    const finalChartData = Object.values(timeline).map(pt => {
      cumulativeS += pt.sent;
      cumulativeD += pt.delivered;
      cumulativeR += pt.read;
      return {
        date: pt.date,
        'Total Sent': cumulativeS,
        'Delivered': cumulativeD,
        'Read': cumulativeR
      };
    });

    return { totalSent: s, totalDelivered: d, totalRead: r, totalFailed: f, chartData: finalChartData };
  }, [campaigns]);

  const statusConfig: Record<string, { label: string; className: string }> = {
    completed: { label: 'Completed', className: 'status-pill status-completed' },
    processing: { label: 'Processing', className: 'status-pill status-processing' },
    pending: { label: 'Pending', className: 'status-pill status-pending' },
    failed: { label: 'Failed', className: 'status-pill status-failed' },
    insufficient_credits: { label: 'Insufficient Credits', className: 'status-pill status-insufficient_credits' },
    paused_logout: { label: 'Paused — Session Expired', className: 'status-pill text-orange-600 bg-orange-50 border border-orange-200' },
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
        <Link href="/dashboard/campaigns/create" className="btn-primary rounded-lg hidden sm:inline-flex items-center gap-2">
          <Radio size={12} strokeWidth={1.5} /> New Campaign
        </Link>
      </div>

      {shop?.whatsapp_mode === 'QR_EXPRESS' && shop?.qr_express_status === 'disconnected' && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 flex items-start gap-4 shadow-sm animate-pulse">
          <AlertTriangle size={20} className="text-rose-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="text-rose-800 text-sm font-bold mb-1 uppercase tracking-widest">Action Required: Session Expired</p>
            <p className="text-rose-700 text-xs leading-relaxed">
              Your WhatsApp Session was disconnected from your phone. Campaign queue has been safely paused. Please click here to re-scan the QR code and resume your broadcasts.
            </p>
          </div>
          <Link href="/dashboard/settings" className="ml-auto text-xs tracking-[0.15em] text-rose-600 font-bold bg-white px-3 py-1.5 rounded-full shadow-sm hover:bg-rose-600 hover:text-white transition-colors uppercase flex-shrink-0 border border-rose-200">Re-Connect →</Link>
        </div>
      )}

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

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sent */}
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5 hover:border-[#3E3B36] transition-all relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#3E3B36] flex-shrink-0" />
            <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">Total Sent</p>
          </div>
          <p className="serif-headline text-2xl md:text-3xl text-[#3E3B36] leading-none">{totalSent.toLocaleString()}</p>
        </div>
        
        {/* Delivered */}
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5 hover:border-indigo-400 transition-all relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-500 flex-shrink-0" />
            <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">Delivered</p>
          </div>
          <p className="serif-headline text-2xl md:text-3xl text-[#3E3B36] leading-none">{totalDelivered.toLocaleString()}</p>
        </div>

        {/* Read */}
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5 hover:border-emerald-400 transition-all relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 flex-shrink-0" />
            <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">Read / Viewed</p>
          </div>
          <p className="serif-headline text-2xl md:text-3xl text-[#3E3B36] leading-none">{totalRead.toLocaleString()}</p>
        </div>

        {/* Failed */}
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5 hover:border-rose-400 transition-all relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-rose-500 flex-shrink-0" />
            <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">Failed</p>
          </div>
          <p className="serif-headline text-2xl md:text-3xl text-[#3E3B36] leading-none">{totalFailed.toLocaleString()}</p>
        </div>
      </div>

      {/* Cumulative Chart Area */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-6 overflow-hidden">
        <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36] mb-1">Cumulative Performance</h2>
        <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-6">Historical broadcast growth trajectory</p>
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C4A896" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#C4A896" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E3DA" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8B8378' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8B8378' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E8E3DA', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} 
                  itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                />
                <Area type="monotone" dataKey="Total Sent" stroke="#C4A896" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
                <Area type="monotone" dataKey="Read" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRead)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center pb-8">
              <Radio size={24} className="text-[#E8E3DA] mb-3" />
              <p className="text-xs text-[#8B8378] tracking-[0.1em] uppercase">No campaigns recorded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Active Campaigns — Supabase live feed */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E3DA]">
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">Recent Dispatches</h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mt-0.5">Last 6 active broadcasts</p>
          </div>
          <Link href="/dashboard/campaigns" className="flex items-center gap-1.5 text-xs tracking-[0.1em] text-[#8B8378] hover:text-[#C4A896] transition-colors uppercase">
            View All Campaigns <ArrowRight size={12} />
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="py-16 text-center">
            <Radio size={28} className="text-[#E8E3DA] mx-auto mb-4" strokeWidth={1} />
            <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-4">No campaigns yet</p>
            <Link href="/dashboard/campaigns/create" className="btn-primary rounded-lg inline-flex">Create First Campaign</Link>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-[#E8E3DA] bg-[#F5F1EA]/40">
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Campaign</p>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Recipients</p>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Status</p>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Date</p>
            </div>
            {campaigns.slice().reverse().slice(0, 6).map((c) => {
              const s = statusConfig[c.status] ?? statusConfig.pending;
              const date = new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              return (
                <Link key={c.id} href={`/dashboard/campaigns/${c.id}`} className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-[#E8E3DA] last:border-0 hover:bg-[#F5F1EA]/50 transition-colors">
                  <div>
                    <p className="text-sm text-[#3E3B36] font-medium truncate">{c.title}</p>
                    <p className="text-[10px] text-[#8B8378] mt-0.5 truncate">{c.message_body.substring(0, 40)}…</p>
                  </div>
                  <div className="flex items-center"><span className="text-sm text-[#3E3B36]">{c.total_recipients.toLocaleString()}</span></div>
                  <div className="flex items-center"><span className={s.className}>{s.label}</span></div>
                  <div className="flex items-center"><span className="text-xs text-[#8B8378]">{date}</span></div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

