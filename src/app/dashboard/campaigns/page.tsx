'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { Campaign } from '@/types/broadcast';
import { Radio, ArrowRight, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ── Status display config (all valid statuses) ────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed:            { label: 'Completed',           className: 'status-pill status-completed' },
  processing:           { label: 'Processing',          className: 'status-pill status-processing' },
  pending:              { label: 'Pending',             className: 'status-pill status-pending' },
  failed:               { label: 'Failed',              className: 'status-pill status-failed' },
  insufficient_credits: { label: 'Insufficient Credits', className: 'status-pill status-insufficient_credits' },
  paused_logout:        { label: 'Paused',              className: 'status-pill status-failed' },
};

// ── Chart bar colours ────────────────────────────────────────────────────────
const CHART_COLOURS = {
  Sent:      '#3E3B36',
  Delivered: '#6366f1',
  Read:      '#10b981',
  Failed:    '#f43f5e',
} as const;

function cleanFailureReason(reason?: string | null): string {
  if (!reason) return '';
  if (reason.includes('\n') || reason.includes('stack') || reason.includes('Error:') || reason.includes(' at ')) {
    const firstLine = reason.split('\n')[0].replace(/^Error:\s*/, '').trim();
    if (firstLine.length > 80) {
      return firstLine.substring(0, 80) + '...';
    }
    return firstLine;
  }
  return reason;
}

export default function CampaignsLedgerPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Data loading + realtime subscription ─────────────────────────────────
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Re-usable fetch closure — called on mount and on each realtime event
      const fetchCampaigns = async () => {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('shop_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) setCampaigns(data as Campaign[]);
      };

      await fetchCampaigns();
      setLoading(false);

      // Subscribe to any change on this shop's campaigns rows
      channel = supabase
        .channel(`campaigns-ledger:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'campaigns', filter: `shop_id=eq.${user.id}` },
          () => fetchCampaigns(),   // always re-fetch to get full row with latest counters
        )
        .subscribe((status: string) => {
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('[Campaigns Ledger] Realtime channel error — retrying in 3 s…');
            setTimeout(() => channel?.subscribe(), 3_000);
          }
        });
    }

    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // ── Manual refresh ────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('shop_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setCampaigns(data as Campaign[]);
    }
    setRefreshing(false);
  };

  // ── Chart aggregation ─────────────────────────────────────────────────────
  // Includes ALL statuses (processing, completed, failed, etc.) so the chart
  // always renders partial progress instead of staying blank.
  const chartData = useMemo(() => {
    // Group by calendar date (oldest → newest for left-to-right chart flow)
    const chronological = [...campaigns].reverse();

    const timeline: Record<string, {
      name: string;
      Sent: number;
      Delivered: number;
      Read: number;
      Failed: number;
    }> = {};

    chronological.forEach((c) => {
      // Skip campaigns that have zero activity on every metric (pure 'pending' no-ops)
      const hasSomeData =
        (c.total_sent      ?? 0) > 0 ||
        (c.total_delivered ?? 0) > 0 ||
        (c.total_read      ?? 0) > 0 ||
        (c.total_failed    ?? 0) > 0 ||
        (c.total_recipients ?? 0) > 0;

      if (!hasSomeData) return;

      const dateStr = new Date(c.created_at).toLocaleDateString('en-GB', {
        day:   'numeric',
        month: 'short',
      });

      if (!timeline[dateStr]) {
        timeline[dateStr] = { name: dateStr, Sent: 0, Delivered: 0, Read: 0, Failed: 0 };
      }

      // Source metrics DIRECTLY from database columns — zero if null.
      // For in-progress campaigns this reflects real partial progress.
      timeline[dateStr].Sent      += c.total_sent      ?? 0;
      timeline[dateStr].Delivered += c.total_delivered ?? 0;
      timeline[dateStr].Read      += c.total_read      ?? 0;
      timeline[dateStr].Failed    += c.total_failed    ?? 0;
    });

    return Object.values(timeline);
  }, [campaigns]);

  // ── Summary stats (all campaigns regardless of status) ───────────────────
  const summaryStats = useMemo(() => {
    const totalSent      = campaigns.reduce((s, c) => s + (c.total_sent      ?? 0), 0);
    const totalFailed    = campaigns.reduce((s, c) => s + (c.total_failed    ?? 0), 0);
    const processing     = campaigns.filter((c) => c.status === 'processing').length;
    return { totalSent, totalFailed, processing };
  }, [campaigns]);

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Campaigns Ledger</h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">
            Unified broadcast tracking and analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-lg border border-[#E8E3DA] hover:border-[#C4A896] text-[#8B8378] hover:text-[#3E3B36] transition-all disabled:opacity-40"
            title="Refresh data"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <Link href="/dashboard/campaigns/create" className="btn-primary rounded-lg">
            New Campaign
          </Link>
        </div>
      </div>

      {/* Summary stats strip (always visible) */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Campaigns',    value: campaigns.length },
            { label: 'Messages Sent',      value: summaryStats.totalSent.toLocaleString() },
            { label: 'Currently Dispatching', value: summaryStats.processing },
          ].map((s) => (
            <div key={s.label} className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5">
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1">{s.label}</p>
              <p className="serif-headline text-2xl text-[#3E3B36]">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Aggregate chart — shown for ANY campaign with data */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36] mb-1">
              Aggregate Campaign Analytics
            </h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">
              Volume and delivery performance — including in-progress campaigns
            </p>
          </div>
          {/* Live indicator dot when any campaign is dispatching */}
          {summaryStats.processing > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase text-[#C4A896]">
              <span className="w-2 h-2 rounded-full bg-[#C4A896] animate-pulse" />
              {summaryStats.processing} live
            </div>
          )}
        </div>

        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E3DA" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#8B8378' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#8B8378' }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: '#F5F1EA' }}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E8E3DA',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  }}
                  formatter={(value, name) => [Number(value ?? 0).toLocaleString(), String(name)]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#8B8378', paddingTop: '12px' }} />
                <Bar dataKey="Sent"      fill={CHART_COLOURS.Sent}      radius={[4,4,0,0]} />
                <Bar dataKey="Delivered" fill={CHART_COLOURS.Delivered} radius={[4,4,0,0]} />
                <Bar dataKey="Read"      fill={CHART_COLOURS.Read}      radius={[4,4,0,0]} />
                <Bar dataKey="Failed"    fill={CHART_COLOURS.Failed}    radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3">
              <Radio size={28} className="text-[#E8E3DA]" strokeWidth={1} />
              <div>
                <p className="text-xs text-[#8B8378] tracking-[0.1em] uppercase">
                  {campaigns.length > 0
                    ? 'Waiting for first message to be dispatched…'
                    : 'No campaigns yet'}
                </p>
                {campaigns.length > 0 && (
                  <p className="text-[10px] text-[#8B8378] mt-1 normal-case tracking-normal">
                    Chart updates live as messages are sent.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaign history table */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E8E3DA]">
          <h2 className="serif-headline text-sm font-medium text-[#3E3B36]">Campaign History</h2>
          <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mt-0.5">
            Click any row to view detailed analytics
          </p>
        </div>

        {campaigns.length === 0 ? (
          <div className="py-16 text-center">
            <Radio size={28} className="text-[#E8E3DA] mx-auto mb-4" strokeWidth={1} />
            <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase">No campaigns recorded</p>
          </div>
        ) : (
          <div>
            {/* Table header (desktop only) */}
            <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-3 border-b border-[#E8E3DA] bg-[#F5F1EA]/40">
              <p className="col-span-2 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Campaign Name</p>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Recipients</p>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Sent / Failed</p>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Status</p>
            </div>

            {campaigns.map((c) => {
              const statusCfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
              const date = new Date(c.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              });
              // Strip the appended [Tags: …] suffix for display
              const displayTitle = c.title.replace(/\s+\[Tags:\s*[^\]]+\]/, '');
              const tagMatch     = c.title.match(/\[Tags:\s*([^\]]+)\]/);
              const sentCount    = c.total_sent    ?? 0;
              const failedCount  = c.total_failed  ?? 0;

              return (
                <div key={c.id} className="border-b border-[#E8E3DA] last:border-0 hover:bg-[#F5F1EA]/50 transition-colors">
                  {/* Mobile View: Stacked Card */}
                  <Link
                    href={`/dashboard/campaigns/${c.id}`}
                    className="block md:hidden p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#3E3B36] truncate hover:text-[#C4A896] transition-colors">
                          {displayTitle}
                        </p>
                        <p className="text-[10px] text-[#8B8378] mt-1">{date}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={statusCfg.className}>{statusCfg.label}</span>
                        {c.status === 'failed' && c.failure_reason && (
                          <span 
                            className="text-[9px] text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded mt-1 block max-w-[150px] truncate" 
                            title={c.failure_reason}
                          >
                            {cleanFailureReason(c.failure_reason)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#E8E3DA]/40 text-xs">
                      <div>
                        <p className="text-[9px] tracking-[0.1em] text-[#8B8378] uppercase mb-0.5">Recipients</p>
                        <p className="font-semibold text-[#3E3B36]">{(c.total_recipients ?? 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] tracking-[0.1em] text-[#8B8378] uppercase mb-0.5">Sent / Failed</p>
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span className="text-[#6366f1]">{sentCount.toLocaleString()}</span>
                          <span className="text-[#E8E3DA]">/</span>
                          <span className="text-[#f43f5e]">{failedCount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {c.status === 'processing' && (c.total_recipients ?? 0) > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-[#8B8378] uppercase">
                          <span>Progress</span>
                          <span>{Math.min(100, Math.round(((sentCount + failedCount) / (c.total_recipients ?? 1)) * 100))}%</span>
                        </div>
                        <div className="w-full h-1 bg-[#E8E3DA] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C4A896] transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.round(((sentCount + failedCount) / (c.total_recipients ?? 1)) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </Link>

                  {/* Desktop View: Grid Row */}
                  <Link
                    href={`/dashboard/campaigns/${c.id}`}
                    className="hidden md:grid grid-cols-5 gap-4 px-6 py-4 items-center hover:bg-[#F5F1EA]/50 transition-colors cursor-pointer group"
                  >
                    {/* Name + tag badge */}
                    <div className="col-span-2 flex items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm text-[#3E3B36] font-medium truncate group-hover:text-[#C4A896] transition-colors">
                          {displayTitle}
                        </p>
                        <p className="text-[10px] text-[#8B8378] mt-0.5">{date}</p>
                      </div>
                      {tagMatch && (
                        <span className="text-[9px] bg-[#F5F1EA] text-[#8B8378] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider shrink-0 whitespace-nowrap">
                          {tagMatch[1]}
                        </span>
                      )}
                    </div>

                    {/* Recipients */}
                    <div className="flex items-center">
                      <span className="text-sm text-[#3E3B36] font-medium">
                        {(c.total_recipients ?? 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Sent / Failed live counters */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#6366f1] font-medium">{sentCount.toLocaleString()}</span>
                      <span className="text-[#E8E3DA]">/</span>
                      <span className="text-sm text-[#f43f5e] font-medium">{failedCount.toLocaleString()}</span>
                      {/* Progress bar for in-progress campaigns */}
                      {c.status === 'processing' && (c.total_recipients ?? 0) > 0 && (
                        <div className="flex-1 max-w-[60px] h-1 bg-[#E8E3DA] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C4A896] transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.round(((sentCount + failedCount) / (c.total_recipients ?? 1)) * 100))}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Status + arrow */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col items-start">
                        <span className={statusCfg.className}>{statusCfg.label}</span>
                        {c.status === 'failed' && c.failure_reason && (
                          <span 
                            className="text-[10px] text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded mt-1 block max-w-[150px] truncate" 
                            title={c.failure_reason}
                          >
                            {cleanFailureReason(c.failure_reason)}
                          </span>
                        )}
                      </div>
                      <ArrowRight size={14} className="text-[#E8E3DA] group-hover:text-[#C4A896] transition-colors" />
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
