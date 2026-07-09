'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Campaign, CampaignStatus } from '@/types/broadcast';
import { Clock, Search, Filter, Download } from 'lucide-react';

const STATUS_FILTERS: { label: string; value: CampaignStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
  { label: 'Insufficient Credits', value: 'insufficient_credits' },
];

export default function HistoryPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filtered, setFiltered] = useState<Campaign[]>([]);
  const [activeFilter, setActiveFilter] = useState<CampaignStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: any;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fetchCampaigns = async () => {
        const { data } = await supabase
          .from('campaigns')
          .select('*')
          .eq('shop_id', user.id)
          .order('created_at', { ascending: false });

        if (data) {
          setCampaigns(data);
        }
      };

      await fetchCampaigns();
      setLoading(false);

      channel = supabase
        .channel(`history-campaigns:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'campaigns', filter: `shop_id=eq.${user.id}` },
          () => fetchCampaigns()
        )
        .subscribe((status: string) => {
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('[History Campaigns] Realtime channel error — retrying…');
            setTimeout(() => channel?.subscribe(), 3000);
          }
        });
    }

    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Apply filters whenever dependencies change
  useEffect(() => {
    let result = campaigns;

    if (activeFilter !== 'all') {
      result = result.filter((c) => c.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) => c.title.toLowerCase().includes(q) || c.message_body.toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [campaigns, activeFilter, searchQuery]);

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['id', 'title', 'message_body', 'status', 'total_recipients', 'created_at'];
    const rows = filtered.map((c) =>
      [c.id, `"${c.title}"`, `"${c.message_body.replace(/"/g, '""')}"`, c.status, c.total_recipients, c.created_at].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
    completed: { label: 'Completed', className: 'status-pill status-completed' },
    processing: { label: 'Processing', className: 'status-pill status-processing' },
    pending: { label: 'Pending', className: 'status-pill status-pending' },
    failed: { label: 'Failed', className: 'status-pill status-failed' },
    insufficient_credits: { label: 'Insufficient Credits', className: 'status-pill status-insufficient_credits' },
    paused_logout: { label: 'Paused (Session Expired)', className: 'status-pill status-failed bg-orange-100 text-orange-700' },
  };

  const totalDelivered = campaigns
    .filter((c) => c.status === 'completed')
    .reduce((s, c) => s + c.total_recipients, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase">Loading audit ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Delivery Ledger</h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">
            Full audit trail of all broadcast campaigns
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="hidden sm:flex items-center gap-2 text-xs tracking-[0.15em] text-[#8B8378] hover:text-[#C4A896] transition-colors uppercase border border-[#E8E3DA] rounded-lg px-4 py-2.5"
        >
          <Download size={12} strokeWidth={1.5} />
          Export
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Campaigns', value: campaigns.length },
          { label: 'Messages Delivered', value: totalDelivered.toLocaleString() },
          { label: 'Completed', value: campaigns.filter((c) => c.status === 'completed').length },
        ].map((s) => (
          <div key={s.label} className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5">
            <p className="text-[10px] tracking-[0.25em] text-[#8B8378] uppercase mb-2">{s.label}</p>
            <p className="serif-headline text-2xl text-[#3E3B36]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8378]" strokeWidth={1.5} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-editorial pl-9"
            placeholder="Search campaigns..."
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={12} className="text-[#8B8378]" strokeWidth={1.5} />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border transition-colors ${
                activeFilter === f.value
                  ? 'border-[#C4A896] text-[#C4A896] bg-[#F5F1EA]'
                  : 'border-[#E8E3DA] text-[#8B8378] hover:border-[#C4A896] hover:text-[#C4A896]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

      </div>

      {/* Table */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Clock size={28} className="text-[#E8E3DA] mx-auto mb-4" strokeWidth={1} />
            <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase">No campaigns found</p>
          </div>
        ) : (
          <>
            {/* Header Row */}
            <div className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-[#E8E3DA]">
              <div className="col-span-2">
                <p className="text-xs text-[#8B8378] tracking-[0.2em] font-medium uppercase pb-0">Campaign</p>
              </div>
              <p className="text-xs text-[#8B8378] tracking-[0.2em] font-medium uppercase">Recipients</p>
              <p className="text-xs text-[#8B8378] tracking-[0.2em] font-medium uppercase">Status</p>
              <p className="text-xs text-[#8B8378] tracking-[0.2em] font-medium uppercase">Date</p>
            </div>

            {/* Data Rows */}
            {filtered.map((campaign) => {
              const status = statusConfig[campaign.status];
              const date = new Date(campaign.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              const time = new Date(campaign.created_at).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={campaign.id}
                  className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-[#E8E3DA] last:border-0 hover:bg-[#F5F1EA]/40 transition-colors"
                >
                  <div className="col-span-2">
                    <p className="text-sm text-[#3E3B36] font-medium">{campaign.title}</p>
                    <p className="text-[11px] text-[#8B8378] mt-0.5 line-clamp-1">
                      {campaign.message_body}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-[#3E3B36]">{campaign.total_recipients.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center">
                    <span className={status.className}>{status.label}</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-xs text-[#3E3B36]">{date}</span>
                    <span className="text-[10px] text-[#8B8378]">{time}</span>
                  </div>
                </div>
              );
            })}
          </>
        )}

      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase text-center">
          Showing {filtered.length} of {campaigns.length} records
        </p>
      )}

    </div>
  );
}
