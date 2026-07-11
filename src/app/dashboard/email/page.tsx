'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { EmailCampaign } from '@/types/broadcast';
import { Mail, ArrowRight, RefreshCw, TrendingUp, CheckCircle, XCircle, Send } from 'lucide-react';

export default function EmailMarketingPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fetch_ = async () => {
        const { data } = await supabase
          .from('email_campaigns')
          .select('*')
          .eq('shop_id', user.id)
          .order('created_at', { ascending: false });
        if (data) setCampaigns(data as EmailCampaign[]);
      };

      await fetch_();
      setLoading(false);

      channel = supabase
        .channel(`email-campaigns-main:${user.id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'email_campaigns',
          filter: `shop_id=eq.${user.id}`,
        }, fetch_)
        .subscribe();
    }

    load();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('shop_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setCampaigns(data as EmailCampaign[]);
    }
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const totalSent      = campaigns.reduce((s, c) => s + (c.total_sent ?? 0), 0);
    const totalDelivered = campaigns.reduce((s, c) => s + (c.total_delivered ?? 0), 0);
    const totalFailed    = campaigns.reduce((s, c) => s + (c.total_failed ?? 0), 0);
    const successRatio   = totalSent > 0
      ? Math.round((totalDelivered / totalSent) * 100)
      : 0;
    return { totalSent, totalDelivered, totalFailed, successRatio };
  }, [campaigns]);

  const recentCampaigns = campaigns.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#6366f1] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Email Marketing</h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">
            Compose and broadcast email campaigns to your audience
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-lg border border-[#E8E3DA] hover:border-[#6366f1]/40 text-[#8B8378] hover:text-[#3E3B36] transition-all disabled:opacity-40"
            title="Refresh data"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <Link
            href="/dashboard/email/create"
            className="btn-primary rounded-lg flex items-center gap-2"
          >
            <Send size={13} strokeWidth={1.5} />
            New Campaign
          </Link>
        </div>
      </div>

      {/* Global aggregate stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Emails Sent',
            value: stats.totalSent.toLocaleString(),
            icon: <Send size={16} className="text-[#6366f1]" strokeWidth={1.5} />,
            color: 'text-[#6366f1]',
          },
          {
            label: 'Success Ratio',
            value: `${stats.successRatio}%`,
            icon: <TrendingUp size={16} className="text-[#10b981]" strokeWidth={1.5} />,
            color: 'text-[#10b981]',
          },
          {
            label: 'Total Delivered',
            value: stats.totalDelivered.toLocaleString(),
            icon: <CheckCircle size={16} className="text-[#C4A896]" strokeWidth={1.5} />,
            color: 'text-[#C4A896]',
          },
          {
            label: 'Total Failed',
            value: stats.totalFailed.toLocaleString(),
            icon: <XCircle size={16} className="text-[#f43f5e]" strokeWidth={1.5} />,
            color: 'text-[#f43f5e]',
          },
        ].map((s) => (
          <div key={s.label} className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">{s.label}</p>
              {s.icon}
            </div>
            <p className={`serif-headline text-2xl ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent campaigns preview */}
      {campaigns.length > 0 && (
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8E3DA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail size={13} className="text-[#6366f1]" strokeWidth={1.5} />
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Recent Campaigns</p>
            </div>
            <span className="text-[10px] text-[#8B8378]">{campaigns.length} total</span>
          </div>
          {recentCampaigns.map((c, idx) => {
            const statusColors: Record<string, string> = {
              completed: 'text-[#C4A896] border-[#C4A896]/40 bg-[#F5F1EA]',
              processing: 'text-[#8B8378] border-[#E8E3DA]',
              pending:    'text-[#8B8378] border-[#E8E3DA]',
              failed:     'text-[#f43f5e] border-[#f43f5e]/30 bg-rose-50',
            };
            const pillClass = statusColors[c.status] ?? 'text-[#8B8378] border-[#E8E3DA]';
            return (
              <div
                key={c.id}
                className={`px-6 py-4 flex items-center justify-between gap-4 ${idx < recentCampaigns.length - 1 ? 'border-b border-[#E8E3DA]' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#3E3B36] truncate">{c.title}</p>
                  <p className="text-[10px] text-[#8B8378] mt-0.5">{c.subject}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs text-[#8B8378]">{c.total_recipients.toLocaleString()} recipients</span>
                  <span className={`status-pill border text-[10px] ${pillClass}`}>
                    {c.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {campaigns.length === 0 && (
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-16 text-center">
          <div className="w-14 h-14 bg-[#F5F1EA] rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={22} className="text-[#8B8378]" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-[#3E3B36] font-medium mb-1">No email campaigns yet</p>
          <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-6">
            Launch your first email broadcast to get started
          </p>
          <Link href="/dashboard/email/create" className="btn-primary rounded-lg inline-flex items-center gap-2">
            <Send size={12} strokeWidth={1.5} />
            Create Campaign
          </Link>
        </div>
      )}

      {/* View History CTA — prominent, as required */}
      <div className="bg-gradient-to-r from-[#6366f1]/5 to-[#8B7BA8]/5 border border-[#6366f1]/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="serif-headline text-base text-[#3E3B36] mb-0.5">Email Campaign History</h2>
          <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">
            Full audit trail · Analytics dashboard · Data exports
          </p>
        </div>
        <Link
          href="/dashboard/email/history"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg text-xs tracking-[0.1em] uppercase transition-colors shadow-sm font-medium whitespace-nowrap"
        >
          View Email History
          <ArrowRight size={14} />
        </Link>
      </div>

    </div>
  );
}
