'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { Campaign } from '@/types/broadcast';
import { Radio, ArrowRight, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = () => {
    try {
      const dataToExport = campaigns.map(c => {
        const tagMatch = c.title.match(/\[(?:Tags|Source):\s*([^\]]+)\]/);
        return {
          'Campaign Title': c.title.replace(/\s+\[(?:Tags|Source):\s*[^\]]+\]/, ''),
          'Target': tagMatch ? tagMatch[1] : '',
          'Created Date': new Date(c.created_at).toLocaleString(),
          'Total Recipients': c.total_recipients ?? 0,
          'Sent': c.total_sent ?? 0,
          'Delivered': c.total_delivered ?? 0,
          'Read': c.total_read ?? 0,
          'Failed': c.total_failed ?? 0,
          'Status': c.status,
          'Failure Reason': c.failure_reason ?? ''
        };
      });

      const csv = Papa.unparse(dataToExport);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Campaign_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('CSV Export Error:', err);
    } finally {
      setExportOpen(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = campaigns.map(c => {
        const tagMatch = c.title.match(/\[(?:Tags|Source):\s*([^\]]+)\]/);
        return {
          'Campaign Title': c.title.replace(/\s+\[(?:Tags|Source):\s*[^\]]+\]/, ''),
          'Target': tagMatch ? tagMatch[1] : '',
          'Created Date': new Date(c.created_at).toLocaleString(),
          'Total Recipients': c.total_recipients ?? 0,
          'Sent': c.total_sent ?? 0,
          'Delivered': c.total_delivered ?? 0,
          'Read': c.total_read ?? 0,
          'Failed': c.total_failed ?? 0,
          'Status': c.status,
          'Failure Reason': c.failure_reason ?? ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Campaign History');
      XLSX.writeFile(workbook, `Campaign_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Excel Export Error:', err);
    } finally {
      setExportOpen(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header block
      doc.setFillColor(62, 59, 54); // Dark premium color #3E3B36
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('True Attendly Broadcast', 15, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('CAMPAIGN HISTORY LEDGER SUMMARY REPORT', 15, 30);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 155, 30);

      // Summary details
      doc.setTextColor(62, 59, 54);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Overall Ledger Summary', 15, 52);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Total Campaigns: ${campaigns.length}`, 15, 60);
      doc.text(`Total Messages Sent: ${summaryStats.totalSent.toLocaleString()}`, 15, 66);
      doc.text(`Total Failures recorded: ${summaryStats.totalFailed.toLocaleString()}`, 15, 72);

      // Ledger Table
      doc.setFont('helvetica', 'bold');
      doc.text('Campaign Details Table', 15, 85);
      doc.setDrawColor(232, 227, 218); // #E8E3DA
      doc.line(15, 88, 195, 88);

      // Table Headers
      doc.setFontSize(9);
      doc.text('Campaign Title', 15, 94);
      doc.text('Date Created', 95, 94);
      doc.text('Recipients', 135, 94);
      doc.text('Sent / Failed', 155, 94);
      doc.text('Status', 180, 94);
      doc.line(15, 96, 195, 96);

      // Table Rows
      doc.setFont('helvetica', 'normal');
      let y = 102;
      campaigns.forEach((c) => {
        if (y > 270) {
          doc.addPage();
          // Draw page header
          doc.setFillColor(62, 59, 54);
          doc.rect(0, 0, 210, 15, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('True Attendly Broadcast Ledger Summary (Continued)', 15, 10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(62, 59, 54);
          y = 30;
        }

        const title = c.title.replace(/\s+\[(?:Tags|Source):\s*[^\]]+\]/, '').substring(0, 36);
        const date = new Date(c.created_at).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric'
        });
        const recipientsCount = (c.total_recipients ?? 0).toLocaleString();
        const sentFailed = `${(c.total_sent ?? 0).toLocaleString()} / ${(c.total_failed ?? 0).toLocaleString()}`;
        const status = c.status.toUpperCase();

        doc.text(title, 15, y);
        doc.text(date, 95, y);
        doc.text(recipientsCount, 135, y);
        doc.text(sentFailed, 155, y);
        doc.text(status, 180, y);

        doc.setDrawColor(245, 241, 234); // Light line
        doc.line(15, y + 2, 195, y + 2);
        y += 8;
      });

      doc.save(`Campaign_History_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

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
        .channel(`campaigns-ledger:${user.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'campaigns', filter: `shop_id=eq.${user.id}` },
          () => fetchCampaigns(),   // always re-fetch to get full row with latest counters
        )
        .subscribe();
    }

    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // ── Manual refresh ────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/campaigns/refresh', { method: 'POST' });
    } catch (err) {
      console.error('[Campaigns Dashboard] Sync error:', err);
    }
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
    const totalRecipients = campaigns.reduce((s, c) => s + (c.total_recipients ?? 0), 0);
    const totalSent       = campaigns.reduce((s, c) => s + (c.total_sent       ?? 0), 0);
    const totalDelivered  = campaigns.reduce((s, c) => s + (c.total_delivered  ?? 0), 0);
    const totalRead       = campaigns.reduce((s, c) => s + (c.total_read       ?? 0), 0);
    const totalFailed     = campaigns.reduce((s, c) => s + (c.total_failed     ?? 0), 0);
    const processing      = campaigns.filter((c) => c.status === 'processing').length;
    return { totalRecipients, totalSent, totalDelivered, totalRead, totalFailed, processing };
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Campaigns',    value: campaigns.length },
              { label: 'Messages Sent',      value: (summaryStats.totalSent + summaryStats.totalFailed).toLocaleString() },
              { label: 'Currently Dispatching', value: summaryStats.processing },
            ].map((s) => (
              <div key={s.label} className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5">
                <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1">{s.label}</p>
                <p className="serif-headline text-2xl text-[#3E3B36]">{s.value}</p>
              </div>
            ))}
          </div>

          {/* WhatsApp Statuses Tick Visualizer Card */}
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-6">
            <h3 className="lexend-subheading text-xs font-semibold text-[#3E3B36] uppercase tracking-[0.1em] mb-4">
              Live Delivery Ledger & WhatsApp Status Ticks
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              
              {/* Single Tick (Sent) */}
              <div className="border border-[#E8E3DA] rounded-lg p-4 bg-[#F9F7F4]/50 flex items-center justify-between">
                <div>
                  <p className="text-[9px] tracking-[0.15em] text-[#8B8378] uppercase mb-1">Sent (Single Tick)</p>
                  <p className="serif-headline text-xl text-[#3E3B36]">{Math.max(0, summaryStats.totalSent - summaryStats.totalDelivered).toLocaleString()}</p>
                </div>
                <div className="text-[#8B8378]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>

              {/* Double Tick (Delivered) */}
              <div className="border border-[#E8E3DA] rounded-lg p-4 bg-[#F9F7F4]/50 flex items-center justify-between">
                <div>
                  <p className="text-[9px] tracking-[0.15em] text-[#8B8378] uppercase mb-1">Delivered (Double Tick)</p>
                  <p className="serif-headline text-xl text-[#3E3B36]">{Math.max(0, summaryStats.totalDelivered - summaryStats.totalRead).toLocaleString()}</p>
                </div>
                <div className="flex text-[#8B8378]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-[-10px]">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>

              {/* Blue Tick (Read) */}
              <div className="border border-[#E8E3DA] rounded-lg p-4 bg-[#F9F7F4]/50 flex items-center justify-between">
                <div>
                  <p className="text-[9px] tracking-[0.15em] text-[#8B8378] uppercase mb-1">Read (Blue Ticks)</p>
                  <p className="serif-headline text-xl text-[#10B981]">{summaryStats.totalRead.toLocaleString()}</p>
                </div>
                <div className="flex text-[#10B981]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-[-10px]">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>

              {/* Failed Ticks */}
              <div className="border border-[#E8E3DA] rounded-lg p-4 bg-[#F9F7F4]/50 flex items-center justify-between">
                <div>
                  <p className="text-[9px] tracking-[0.15em] text-[#8B8378] uppercase mb-1">Failed</p>
                  <p className="serif-headline text-xl text-[#F43F5E]">{summaryStats.totalFailed.toLocaleString()}</p>
                </div>
                <div className="text-[#F43F5E]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
              </div>

            </div>

            {summaryStats.totalRecipients > 0 && (
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-[#F5F1EA]">
                <div
                  className="bg-[#10B981] h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((summaryStats.totalRead / summaryStats.totalRecipients) * 100))}%` }}
                  title={`Read: ${Math.round((summaryStats.totalRead / summaryStats.totalRecipients) * 100)}%`}
                />
                <div
                  className="bg-[#6366F1] h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((Math.max(0, summaryStats.totalDelivered - summaryStats.totalRead) / summaryStats.totalRecipients) * 100))}%` }}
                  title={`Delivered: ${Math.round((Math.max(0, summaryStats.totalDelivered - summaryStats.totalRead) / summaryStats.totalRecipients) * 100)}%`}
                />
                <div
                  className="bg-[#8B8378] h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((Math.max(0, summaryStats.totalSent - summaryStats.totalDelivered) / summaryStats.totalRecipients) * 100))}%` }}
                  title={`Sent: ${Math.round((Math.max(0, summaryStats.totalSent - summaryStats.totalDelivered) / summaryStats.totalRecipients) * 100)}%`}
                />
                <div
                  className="bg-[#F43F5E] h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((summaryStats.totalFailed / summaryStats.totalRecipients) * 100))}%` }}
                  title={`Failed: ${Math.round((summaryStats.totalFailed / summaryStats.totalRecipients) * 100)}%`}
                />
              </div>
            )}

          </div>
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

      {/* Campaign history link */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="serif-headline text-sm font-medium text-[#3E3B36]">Campaign History Ledger</h2>
          <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mt-0.5">
            View detailed campaign logs, delivery analytics, and exports.
          </p>
        </div>
        <Link href="/dashboard/campaigns/history" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#3E3B36] text-[#F5F1EA] hover:bg-[#2A2824] rounded-lg text-xs tracking-[0.1em] uppercase transition-colors shadow-sm font-medium whitespace-nowrap">
          View Campaign History
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
