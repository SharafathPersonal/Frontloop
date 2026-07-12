'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Download, Users, Flame, QrCode, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import Image from 'next/image';
import Link from 'next/link';

interface ShopData {
  id: string;
  owner_phone: string;
  shop_name: string;
  whatsapp_mode: string;
  qr_express_status: string;
}

interface QRAnalytics {
  scans: number;
  credits_consumed: number;
}

interface QRLead {
  id: string;
  customer_name: string;
  whatsapp_number: string;
  tags: string[];
  created_at: string;
  serial_number: number;
  is_exported_to_vcf: boolean;
  is_saved_to_phone?: boolean;
}

export default function QRLeadsPage() {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [latestLeads, setLatestLeads] = useState<QRLead[]>([]);
  const [todayStats, setTodayStats] = useState<QRAnalytics>({ scans: 0, credits_consumed: 0 });
  const [totalAudience, setTotalAudience] = useState(0);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const [syncedCount, setSyncedCount] = useState(0);

  // Realtime subscription ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  // Load Initial Dashboard Data
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: shopData } = await supabase
          .from('shops')
          .select('id, owner_phone, shop_name, whatsapp_mode, qr_express_status')
          .eq('id', user.id)
          .single();

        if (shopData) setShop(shopData);

        // Fetch credits_used from wallets
        const { data: walletData } = await supabase
          .from('wallets')
          .select('credits_used')
          .eq('shop_id', user.id)
          .maybeSingle();

        if (walletData && walletData.credits_used) {
          setCreditsUsed(Number(walletData.credits_used));
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const { data: analyticsData } = await supabase
          .from('qr_analytics')
          .select('scans, credits_consumed')
          .eq('shop_id', user.id)
          .eq('scan_date', todayStr)
          .maybeSingle();

        if (analyticsData) {
          setTodayStats({
            scans: analyticsData.scans,
            credits_consumed: Number(analyticsData.credits_consumed)
          });
        }

        // Fetch Total Audience & Latest 5 Leads for Dashboard
        const { data: latestData, count } = await supabase
          .from('customers_master')
          .select('*', { count: 'exact' })
          .eq('shop_id', user.id)
          .contains('tags', ['IN_STORE_QR_LEAD'])
          .order('created_at', { ascending: false })
          .limit(5);

        if (count !== null) setTotalAudience(count);
        if (latestData) {
           setLatestLeads(latestData);
        }

        // Fetch Synced Count
        const { count: syncCount } = await supabase
          .from('customers_master')
          .select('*', { count: 'exact', head: true })
          .eq('shop_id', user.id)
          .contains('tags', ['IN_STORE_QR_LEAD'])
          .eq('is_saved_to_phone', true);
        if (syncCount !== null) setSyncedCount(syncCount);

        const channel = supabase
          .channel(`qr-leads-updates-${user.id}-${Date.now()}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'customers_master', filter: `shop_id=eq.${user.id}` },
            (payload) => {
              const newLead = payload.new as any;
              if (newLead.tags && newLead.tags.includes('IN_STORE_QR_LEAD')) {
                setLatestLeads(prev => [newLead, ...prev].slice(0, 5));
                setTotalAudience(prev => prev + 1);
                setCreditsUsed(prev => prev + 1);
                setTodayStats(prev => ({
                  scans: prev.scans + 1,
                  credits_consumed: prev.credits_consumed + 10
                }));
                showToast('✨ New walk-in lead captured!', 'success');
              }
            }
          )
          .subscribe();
          
        channelRef.current = channel;

      } catch (err) {
        console.error('Error loading QR data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    const cleanup = loadData();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [showToast]);


  const qrUrl = shop ? `https://wa.me/${shop.owner_phone.replace(/\D/g, '')}?text=${encodeURIComponent('Add me to Broadcast')}` : '';
  const qrImageSrc = shop ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&color=3E3B36` : '';

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrImageSrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_Code_${shop?.shop_name || 'Store'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('QR Code downloaded successfully', 'success');
    } catch (err) {
      showToast('Failed to download QR Code', 'error');
      console.error(err);
    }
  };


  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin" />
      </div>
    );
  }


  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl serif-headline text-[#3E3B36]">In-Store Lead Engine</h1>
          <p className="text-sm text-[#8B8378] mt-2 tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time walk-in capture and sync is active
          </p>
        </div>
        <Link 
          href="/dashboard/qr-leads/manage"
          className="group flex items-center gap-2 bg-[#3E3B36] text-[#F5F1EA] px-6 py-3 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-[#2A2825] transition-all shadow-xl hover:-translate-y-1"
        >
          Manage All Leads
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {shop?.whatsapp_mode === 'QR_EXPRESS' && shop?.qr_express_status !== 'CONNECTED' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-500" size={20} />
            <div>
              <p className="text-sm text-amber-900 font-bold">WhatsApp Disconnected</p>
              <p className="text-xs text-amber-700 mt-0.5">Please reconnect WhatsApp to activate your QR code and capture real-time leads.</p>
            </div>
          </div>
          <Link href="/dashboard/settings" className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border border-amber-300">
            Connect WhatsApp
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* QR Hero Section (Left Pane) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-[#3E3B36] rounded-[2rem] p-8 relative overflow-hidden flex flex-col items-center text-center shadow-2xl h-full">
            {/* Background Accent */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            
            <div className="w-16 h-16 bg-[#C4A896]/20 border border-[#C4A896]/30 rounded-2xl flex items-center justify-center mb-6 relative z-10 backdrop-blur-sm">
              <QrCode className="text-[#C4A896]" size={32} />
            </div>
            
            <h2 className="text-2xl serif-headline text-white mb-3 relative z-10">Scan & Join</h2>
            <p className="text-sm text-white/60 mb-8 leading-relaxed relative z-10 font-medium">
              Place this at your reception. Customers instantly join your broadcast list via WhatsApp.
            </p>
            
            <div className="relative w-56 h-56 bg-white p-3 rounded-[1.5rem] shadow-2xl mb-8 transform transition-transform hover:scale-105 duration-500 z-10 border-4 border-white/10">
              {qrImageSrc && (
                <Image src={qrImageSrc} alt="Store QR Code" fill className="object-contain p-2 rounded-xl" unoptimized />
              )}
            </div>
            
            <button
              onClick={handleDownloadQR}
              className="mt-auto w-full flex items-center justify-center gap-3 bg-[#C4A896] text-[#3E3B36] py-4 rounded-xl text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#b09482] transition-colors relative z-10 shadow-lg"
            >
              <Download size={16} />
              Download Display Pass
            </button>
          </div>
        </div>

        {/* Analytics & Leads (Right Pane) */}
        <div className="xl:col-span-8 flex flex-col gap-8">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[1.5rem] border border-[#E8E3DA] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#F5F1EA] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#F5F1EA] flex items-center justify-center border border-[#E8E3DA]">
                  <Users size={20} className="text-[#3E3B36]" />
                </div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#8B8378] font-bold">Total Audience</p>
              </div>
              <p className="text-4xl serif-headline text-[#3E3B36] relative z-10">{totalAudience}</p>
            </div>
            
            <div className="bg-white p-6 rounded-[1.5rem] border border-[#E8E3DA] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#C4A896]/10 rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#C4A896]/10 flex items-center justify-center border border-[#C4A896]/20">
                  <Flame size={20} className="text-[#C4A896]" />
                </div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#8B8378] font-bold">Today's Scans</p>
              </div>
              <p className="text-4xl serif-headline text-[#3E3B36] relative z-10">{todayStats.scans}</p>
            </div>

            <div className="bg-white p-6 rounded-[1.5rem] border border-[#E8E3DA] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                </div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#8B8378] font-bold">Phone Synced</p>
              </div>
              <div className="relative z-10">
                <p className="text-4xl serif-headline text-[#3E3B36] mb-4">
                  {syncedCount} <span className="text-sm text-[#8B8378] serif-headline">/ {totalAudience}</span>
                </p>
                <div className="w-full h-1.5 bg-[#F5F1EA] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                    style={{ width: `${totalAudience > 0 ? (syncedCount / totalAudience) * 100 : 0}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white rounded-[1.5rem] border border-[#E8E3DA] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col flex-1">
            <div className="p-6 md:p-8 border-b border-[#E8E3DA] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl serif-headline text-[#3E3B36]">Real-Time Intake stream</h2>
                <p className="text-xs text-[#8B8378] mt-1">Showing latest 5 connections</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9F7F4]">
                    <th className="px-8 py-5 text-[10px] tracking-[0.2em] uppercase text-[#8B8378] font-bold border-b border-[#E8E3DA]">Customer Profile</th>
                    <th className="px-8 py-5 text-[10px] tracking-[0.2em] uppercase text-[#8B8378] font-bold border-b border-[#E8E3DA]">Phone Connection</th>
                    <th className="px-8 py-5 text-[10px] tracking-[0.2em] uppercase text-[#8B8378] font-bold border-b border-[#E8E3DA]">Intake Timestamp</th>
                    <th className="px-8 py-5 text-[10px] tracking-[0.2em] uppercase text-[#8B8378] font-bold border-b border-[#E8E3DA]">Network Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E3DA] bg-white">
                  {latestLeads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-[#8B8378]">
                        <div className="flex flex-col items-center justify-center">
                          <Users size={32} className="text-[#E8E3DA] mb-4" />
                          <p className="text-sm font-medium">No walk-in scans detected yet.</p>
                          <p className="text-xs mt-1">Leads will automatically appear here.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    latestLeads.slice(0, 5).map((lead) => {
                      const isMissed = lead.tags?.includes('MISSED_LEAD');
                      return (
                        <tr key={lead.id} className="hover:bg-[#F5F1EA]/50 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-[#3E3B36] text-[#F5F1EA] flex items-center justify-center font-bold text-sm uppercase shadow-sm group-hover:bg-[#C4A896] transition-colors">
                                {lead.customer_name && lead.customer_name !== 'Unknown' ? lead.customer_name.charAt(0) : '?'}
                              </div>
                              <span className="text-sm font-bold text-[#3E3B36]">{lead.customer_name && lead.customer_name !== 'Unknown' ? lead.customer_name : 'New Customer'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-sm text-[#8B8378] font-mono font-medium tracking-wide">+{lead.whatsapp_number.replace('@s.whatsapp.net', '')}</span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-xs text-[#8B8378] font-medium tracking-wide flex flex-col sm:inline">
                              {new Date(lead.created_at).toLocaleDateString(undefined, {
                                month: 'short', day: 'numeric', year: 'numeric'
                              })}
                              <span className="sm:ml-2 text-[#C4A896]">
                                {new Date(lead.created_at).toLocaleTimeString(undefined, {
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            {isMissed ? (
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold tracking-[0.1em] border border-red-100 uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                Dropped
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold tracking-[0.1em] uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Synced
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
