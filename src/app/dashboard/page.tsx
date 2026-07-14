'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { Campaign, Shop, Wallet, Customer } from '@/types/broadcast';
import { MessageSquare, QrCode, ArrowRight, Activity, Smartphone, CheckCircle2, AlertTriangle, Users, TrendingUp, Zap, Coins, Send } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

type ActivityItem = {
  id: string;
  type: 'wa' | 'qr';
  description: string;
  created_at: string;
  icon: React.ReactNode;
};

export default function DashboardPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [waCampaigns, setWaCampaigns] = useState<Campaign[]>([]);
  const [qrLeads, setQrLeads] = useState<Customer[]>([]);
  const [digitalInvoices, setDigitalInvoices] = useState<any[]>([]);
  const [flashOffers, setFlashOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        { data: shopData },
        { data: walletData },
        { data: waData },
        { data: qrData },
        { data: invoicesData },
        { data: flashOffersData },
      ] = await Promise.all([
        supabase.from('shops').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('wallets').select('*').eq('shop_id', user.id).maybeSingle(),
        supabase.from('campaigns').select('*').eq('shop_id', user.id).order('created_at', { ascending: true }),
        supabase.from('customers_master').select('*').eq('shop_id', user.id).order('created_at', { ascending: true }),
        supabase.from('digital_invoices').select('*').eq('shop_id', user.id).order('created_at', { ascending: true }),
        supabase.from('shop_flash_offers').select('id, is_active, views_count, is_deleted').eq('shop_id', user.id).eq('is_deleted', false)
      ]);

      if (shopData) setShop(shopData);
      if (walletData) setWallet(walletData);
      if (waData) setWaCampaigns(waData);
      if (qrData) setQrLeads(qrData);
      if (invoicesData) setDigitalInvoices(invoicesData);
      if (flashOffersData) setFlashOffers(flashOffersData);

      setLoading(false);
    }

    load();
  }, []);

  const { waMetrics, waChartData } = useMemo(() => {
    let sent = 0, delivered = 0, read = 0, failed = 0;
    const timeline: Record<string, { date: string; read: number; replied: number }> = {};

    waCampaigns.forEach(c => {
      sent += c.total_sent ?? 0;
      delivered += c.total_delivered ?? 0;
      read += c.total_read ?? 0;
      failed += c.total_failed ?? 0;

      const dateStr = new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (!timeline[dateStr]) timeline[dateStr] = { date: dateStr, read: 0, replied: 0 };
      timeline[dateStr].read += c.total_read ?? 0;
      timeline[dateStr].replied += Math.floor((c.total_read ?? 0) * 0.15); // Simulated replies for visual curve
    });

    return {
      waMetrics: { sent, delivered, read, failed },
      waChartData: Object.values(timeline)
    };
  }, [waCampaigns]);



  const { qrMetrics, qrChartData } = useMemo(() => {
    const totalInvoices = digitalInvoices.length;
    const deliveredInvoices = digitalInvoices.filter(i => i.status === 'delivered').length;
    const pendingInvoices = digitalInvoices.filter(i => i.status === 'pending').length;
    const failedInvoices = digitalInvoices.filter(i => i.status === 'failed').length;
    const deliveryRate = totalInvoices > 0 ? Math.round((deliveredInvoices / totalInvoices) * 100) : 0;
    
    let cumulative = 0;
    const timeline: Record<string, { date: string; count: number }> = {};
    
    digitalInvoices.forEach(i => {
      const dateStr = new Date(i.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (!timeline[dateStr]) timeline[dateStr] = { date: dateStr, count: 0 };
      timeline[dateStr].count += 1;
    });

    const chartData = Object.values(timeline).map(pt => {
      cumulative += pt.count;
      return { date: pt.date, Total: cumulative };
    });

    return {
      qrMetrics: {
        total: totalInvoices,
        delivered: deliveredInvoices,
        pending: pendingInvoices,
        failed: failedInvoices,
        deliveryRate
      },
      qrChartData: chartData
    };
  }, [digitalInvoices]);

  const recentActivity = useMemo(() => {
    const activities: ActivityItem[] = [];
    
    waCampaigns.slice(-5).forEach(c => {
      activities.push({
        id: c.id, type: 'wa', description: `Sent WA Broadcast: ${c.title}`, created_at: c.created_at,
        icon: <MessageSquare size={14} className="text-[#25D366]" />
      });
    });

    digitalInvoices.slice(-5).forEach(i => {
      activities.push({
        id: i.id,
        type: 'qr',
        description: `POS Bill ${i.invoice_number} generated for ${i.customer_name || 'Valued Customer'} (₹${Number(i.total_amount).toFixed(2)})`,
        created_at: i.created_at,
        icon: <QrCode size={14} className="text-[#C4A896]" />
      });
    });

    return activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [waCampaigns, digitalInvoices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top Header & Dual Action Hub */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">
            {shop ? `Keep growing, ${shop.shop_name}` : 'Dashboard'}
          </h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">Omnichannel Revenue Hub</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Link href="/dashboard/campaigns/create" className="btn-primary bg-[#25D366] hover:bg-[#1DA851] text-white rounded-lg flex-1 md:flex-none flex items-center justify-center gap-2 !py-3">
            <Smartphone size={16} strokeWidth={2} /> WhatsApp Campaign
          </Link>
        </div>
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

      {/* Top Stats Matrix Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet State */}
        <div className="bg-white border border-[#E8E3DA] rounded-xl p-5 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-semibold">Wallet Balance</p>
            <Coins size={15} className="text-[#C4A896]" strokeWidth={1.5} />
          </div>
          <p className="serif-headline text-lg sm:text-2xl font-bold text-[#3E3B36] truncate">
            {wallet ? `${wallet.credits_remaining.toLocaleString()}` : '-'}
          </p>
          <span className="text-[9px] text-[#8B8378] mt-1 block">Remaining Credits</span>
        </div>

        {/* Total Sent Volume */}
        <div className="bg-white border border-[#E8E3DA] rounded-xl p-5 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-semibold">Sent Volume</p>
            <Send size={15} className="text-[#C4A896]" strokeWidth={1.5} />
          </div>
          <p className="serif-headline text-lg sm:text-2xl font-bold text-[#3E3B36] truncate">
            {waMetrics.sent.toLocaleString()}
          </p>
          <span className="text-[9px] text-[#8B8378] mt-1 block">WhatsApp Broadcasts</span>
        </div>

        {/* Live Conversion / Read Analytics */}
        <div className="bg-white border border-[#E8E3DA] rounded-xl p-5 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-semibold">WhatsApp Read</p>
            <MessageSquare size={15} className="text-[#25D366]" strokeWidth={1.5} />
          </div>
          <p className="serif-headline text-lg sm:text-2xl font-bold text-[#3E3B36] truncate">
            {waMetrics.sent > 0 ? `${Math.round((waMetrics.read / waMetrics.sent) * 100)}%` : '0%'}
          </p>
          <span className="text-[9px] text-[#8B8378] mt-1 block">Read Ratio</span>
        </div>

        {/* Live POS Invoices */}
        <div className="bg-white border border-[#E8E3DA] rounded-xl p-5 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-semibold">POS Invoices</p>
            <QrCode size={15} className="text-[#C4A896]" strokeWidth={1.5} />
          </div>
          <p className="serif-headline text-lg sm:text-2xl font-bold text-[#3E3B36] truncate">
            {qrMetrics.total.toLocaleString()}
          </p>
          <span className="text-[9px] text-[#8B8378] mt-1 block">Total Retail Bills</span>
        </div>
      </div>

      {/* Dual-Channel Analytics Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel A: WhatsApp */}
        <div className="bg-white border border-[#E8E3DA] rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center">
              <MessageSquare size={18} className="text-[#25D366]" />
            </div>
            <div>
              <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">WhatsApp Engine</h2>
              <p className="text-[10px] tracking-[0.1em] text-[#8B8378] uppercase">Broadcast Analytics</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-1">Total Sent</p>
              <p className="text-lg sm:text-2xl font-bold text-[#3E3B36] truncate">{waMetrics.sent.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-1">Delivered</p>
              <p className="text-lg sm:text-2xl font-bold text-[#3E3B36] truncate">{waMetrics.delivered.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-1">Read Ratio</p>
              <p className="text-lg sm:text-2xl font-bold text-[#3E3B36] truncate">{waMetrics.sent > 0 ? Math.round((waMetrics.read / waMetrics.sent) * 100) : 0}%</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-1">Failed</p>
              <p className="text-lg sm:text-2xl font-bold text-rose-500 truncate">{waMetrics.failed.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Channel B: Digital Bill Engine */}
        <div className="bg-white border border-[#E8E3DA] rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#F5F1EA] flex items-center justify-center border border-[#E8E3DA]">
              <QrCode size={18} className="text-[#C4A896]" />
            </div>
            <div>
              <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">Digital Bill Engine</h2>
              <p className="text-[10px] tracking-[0.1em] text-[#8B8378] uppercase">Retail Lead Intake</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-1">Total Invoices</p>
              <p className="text-lg sm:text-2xl font-bold text-[#3E3B36] truncate">{qrMetrics.total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-1">Delivery Rate</p>
              <p className="text-lg sm:text-2xl font-bold text-[#3E3B36] truncate">{qrMetrics.deliveryRate}%</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-1">Delivered Bills</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600 truncate flex items-center gap-1">
                {qrMetrics.delivered.toLocaleString()} <CheckCircle2 size={12} />
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-1">Pending/Failed</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-500 truncate">{(qrMetrics.pending + qrMetrics.failed).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ⚡ Flash Offers Feature Spotlight */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#3E3B36] to-[#2A2825] rounded-2xl p-6 border border-[#3E3B36] shadow-lg">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#C4A896]/10 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-[#C4A896]/5 translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left: Identity */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#C4A896]/20 border border-[#C4A896]/30 flex items-center justify-center flex-shrink-0">
              <Zap size={22} className="text-[#C4A896]" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="lexend-subheading text-sm font-semibold text-[#F5F1EA]">Live Flash Offers</h2>
                <span className="inline-flex items-center gap-1 bg-[#C4A896] text-[#3E3B36] text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3E3B36] animate-pulse inline-block" />
                  NEW
                </span>
              </div>
              <p className="text-[11px] text-[#F5F1EA]/60 leading-relaxed max-w-xs">
                In-store discount engine. Customers scan your QR and see live deals-zero app install, zero friction.
              </p>
            </div>
          </div>

          {/* Centre: Live stats */}
          <div className="flex items-center gap-6 md:gap-8">
            <div className="text-center">
              <p className="serif-headline text-2xl text-[#C4A896]">
                {flashOffers.filter(o => o.is_active).length}
              </p>
              <p className="text-[9px] tracking-[0.15em] text-[#F5F1EA]/50 uppercase mt-0.5">Active</p>
            </div>
            <div className="w-px h-8 bg-[#F5F1EA]/10" />
            <div className="text-center">
              <p className="serif-headline text-2xl text-[#F5F1EA]">
                {flashOffers.length}
              </p>
              <p className="text-[9px] tracking-[0.15em] text-[#F5F1EA]/50 uppercase mt-0.5">Total</p>
            </div>
            <div className="w-px h-8 bg-[#F5F1EA]/10" />
            <div className="text-center">
              <p className="serif-headline text-2xl text-[#F5F1EA]">
                {flashOffers.reduce((acc, o) => acc + (Number(o.views_count) || 0), 0).toLocaleString()}
              </p>
              <p className="text-[9px] tracking-[0.15em] text-[#F5F1EA]/50 uppercase mt-0.5">Views</p>
            </div>
          </div>

          {/* Right: CTA */}
          <Link
            href="/dashboard/flash-offers"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-[#C4A896] hover:bg-[#d4b8a6] text-[#3E3B36] px-5 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-colors shadow-md"
          >
            Open Engine <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Advanced Visual Graph Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: WA Read Trends */}
        <div className="bg-white border border-[#E8E3DA] rounded-xl p-6">
          <h3 className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mb-6 flex items-center gap-2">
            <TrendingUp size={14} className="text-[#25D366]" /> Daily WA Read Trends
          </h3>
          <div className="h-[250px] lg:h-[200px] w-full">
            {waChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={waChartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWaRead" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#25D366" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#25D366" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E3DA" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8B8378' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8B8378' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E8E3DA', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="read" stroke="#25D366" strokeWidth={2} fillOpacity={1} fill="url(#colorWaRead)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#8B8378] uppercase tracking-widest">No Data</div>
            )}
          </div>
        </div>

        {/* Chart 2: Live Shop Counter Growth */}
        <div className="bg-white border border-[#E8E3DA] rounded-xl p-6">
          <h3 className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mb-6 flex items-center gap-2">
            <Users size={14} className="text-[#C4A896]" /> Digital Bill Growth Rate
          </h3>
          <div className="h-[250px] lg:h-[200px] w-full">
            {qrChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={qrChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E3DA" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8B8378' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8B8378' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E8E3DA', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="Total" stroke="#C4A896" strokeWidth={3} dot={{ fill: '#C4A896', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#8B8378] uppercase tracking-widest">No Data</div>
            )}
          </div>
        </div>

      </div>

      {/* Real-time Retail Feed */}
      <div className="bg-white border border-[#E8E3DA] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E3DA]">
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">Recent Activity Feed</h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mt-0.5">Live events across all revenue channels</p>
          </div>
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
        </div>
        
        {recentActivity.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8B8378] uppercase tracking-widest">No recent activity detected</div>
        ) : (
          <div className="divide-y divide-[#E8E3DA]">
            {recentActivity.map((activity, idx) => (
              <div key={`${activity.id}-${idx}`} className="flex items-center justify-between px-6 py-4 hover:bg-[#F5F1EA]/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white border border-[#E8E3DA] flex items-center justify-center shadow-sm">
                    {activity.icon}
                  </div>
                  <p className="text-sm text-[#3E3B36] font-medium">{activity.description}</p>
                </div>
                <div className="text-[10px] tracking-wider text-[#8B8378] uppercase font-medium">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
