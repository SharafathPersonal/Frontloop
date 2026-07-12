'use client';

import { useEffect, useState, use, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { Campaign } from '@/types/broadcast';
import { ArrowLeft, Clock, Info, RefreshCw, Download, FileText, FileSpreadsheet, ChevronDown, X } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/contexts/ToastContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecipientRow {
  id: string;
  customer_name: string;
  whatsapp_number: string;
  recipient_phone: string;
  /** Raw status string from message_logs — uppercased for display */
  message_status: string;
}

// ---------------------------------------------------------------------------
// Status pill config (covers every status the backend may write)
// ---------------------------------------------------------------------------

const STATUS_PILL: Record<string, { label: string; classes: string }> = {
  SENT:             { label: 'Sent',             classes: 'bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20' },
  DELIVERED:        { label: 'Delivered',        classes: 'bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/30' },
  READ:             { label: 'Read',             classes: 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20' },
  FAILED:           { label: 'Failed',           classes: 'bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/20' },
  PENDING_DISPATCH: { label: 'In Queue',         classes: 'bg-[#F5F1EA] text-[#8B8378] border border-[#E8E3DA] animate-pulse' },
  PENDING:          { label: 'In Queue',         classes: 'bg-[#F5F1EA] text-[#8B8378] border border-[#E8E3DA] animate-pulse' },
};

const getPillConfig = (status: string) =>
  STATUS_PILL[status.toUpperCase()] ?? {
    label: status,
    classes: 'bg-[#F5F1EA] text-[#3E3B36] border border-[#E8E3DA]',
  };

// ---------------------------------------------------------------------------
// Campaign status display badge
// ---------------------------------------------------------------------------

const CAMPAIGN_STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  processing:           { label: 'Dispatching…',       classes: 'text-[#C4A896] border-[#C4A896]/40 animate-pulse' },
  completed:            { label: 'Completed',           classes: 'text-[#10B981] border-[#10B981]/30' },
  failed:               { label: 'Failed',              classes: 'text-[#F43F5E] border-[#F43F5E]/30' },
  pending:              { label: 'Pending',             classes: 'text-[#8B8378] border-[#E8E3DA]' },
  paused_logout:        { label: 'Paused — Session Expired', classes: 'text-orange-600 border-orange-300' },
  insufficient_credits: { label: 'Insufficient Credits', classes: 'text-[#3E3B36] border-[#E8E3DA]' },
};

const getCampaignBadge = (status: string) =>
  CAMPAIGN_STATUS_BADGE[status] ?? { label: status, classes: 'text-[#8B8378] border-[#E8E3DA]' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

export default function CampaignDrillDownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = use(params);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const displayTitle = useMemo(() => {
    if (!campaign) return '';
    const titleMatch = campaign.title.match(/^(.*?)\s*\[(?:Tags|Source):\s*([^\]]+)\]$/);
    return titleMatch ? titleMatch[1].trim() : campaign.title;
  }, [campaign]);

  const targetTags = useMemo(() => {
    if (!campaign) return '—';
    const titleMatch = campaign.title.match(/^(.*?)\s*\[(?:Tags|Source):\s*([^\]]+)\]$/);
    return titleMatch ? titleMatch[2].trim() : '—';
  }, [campaign]);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingAll, setRetryingAll] = useState(false);
  const [retryingSingle, setRetryingSingle] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleRetryAll = async () => {
    try {
      setRetryingAll(true);
      showToast("Processing retries in background...", "info");
      
      const response = await axios.post('/api/campaigns/retry', {
        campaign_id: campaignId
      });

      if (response.data.ok) {
        showToast("Campaign recovery started successfully.", "success");
      } else {
        showToast(response.data.error || "Failed to start bulk retry.", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.error || err.message || "An error occurred.", "error");
    } finally {
      setRetryingAll(false);
      await handleRefresh();
    }
  };

  const handleRetrySingle = async (recipientLedgerId: string) => {
    try {
      setRetryingSingle(recipientLedgerId);
      showToast("Processing retries in background...", "info");

      const response = await axios.post('/api/campaigns/retry', {
        recipient_ledger_id: recipientLedgerId
      });

      if (response.data.ok) {
        showToast("Message retry completed.", "success");
      } else {
        showToast(response.data.error || "Failed to retry message.", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.error || err.message || "An error occurred.", "error");
    } finally {
      setRetryingSingle(null);
      await handleRefresh();
    }
  };

  const [generatingReport, setGeneratingReport] = useState(false);
  const [exportOpen, setExportOpen]             = useState(false);
  const [exportingData, setExportingData]       = useState(false);

  const handleDownloadReport = async () => {
    try {
      setGeneratingReport(true);
      showToast("Generating PDF report...", "info");

      const element = document.getElementById('campaign-report-container');
      if (!element) return;

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // Capture canvas snapshot of the page
      const canvas = await html2canvas(element, {
        scale: 2, // Better resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#F5F1EA' // Matches theme background
      });

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // A4 sizes: width = 210mm, height = 297mm
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Draw brand header banner on first page
      pdf.setFillColor(62, 59, 54); // Dark premium color #3E3B36
      pdf.rect(0, 0, 210, 20, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('True Attendly Broadcast Report', 15, 13);

      // We shift the image down slightly on the first page to fit the brand header
      const headerOffset = 20;
      pdf.addImage(imgData, 'PNG', 0, position + headerOffset, imgWidth, imgHeight);
      heightLeft -= (pageHeight - headerOffset);

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`True_Attendly_Campaign_Report_${campaignId}.pdf`);
      showToast("PDF report downloaded successfully.", "success");
    } catch (err) {
      console.error('PDF Generation Error:', err);
      showToast("Failed to generate PDF report.", "error");
    } finally {
      setGeneratingReport(false);
    }
  };

  // ── Full-dataset export helpers ─────────────────────────────────────────
  const fetchAllLogsForExport = useCallback(async () => {
    const { data: logsData } = await supabase
      .from('message_logs')
      .select('id, recipient_phone, status, created_at, customer_name, shop_name')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
    return (logsData ?? []).map((log: { id: string; recipient_phone: string | null; status: string | null; created_at: string; customer_name: string | null; shop_name: string | null }) => ({
      'Customer Name':   log.customer_name || log.recipient_phone || 'Unknown',
      'Phone Number':    log.recipient_phone || '',
      'WhatsApp Status': (log.status || 'PENDING').toUpperCase(),
      'Dispatched At':   new Date(log.created_at).toLocaleString(),
    }));
  }, [campaignId]);

  const handleExportCSV = useCallback(async () => {
    try {
      setExportingData(true);
      const rows = await fetchAllLogsForExport();
      const Papa = (await import('papaparse')).default;
      const csv  = Papa.unparse(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: `Campaign_Recipients_${campaignId}.csv` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally { setExportingData(false); setExportOpen(false); }
  }, [fetchAllLogsForExport, campaignId]);

  const handleExportExcel = useCallback(async () => {
    try {
      setExportingData(true);
      const rows = await fetchAllLogsForExport();
      const XLSX = await import('xlsx');
      const ws   = XLSX.utils.json_to_sheet(rows);
      const wb   = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recipients');
      XLSX.writeFile(wb, `Campaign_Recipients_${campaignId}.xlsx`);
    } finally { setExportingData(false); setExportOpen(false); }
  }, [fetchAllLogsForExport, campaignId]);

  const handleExportTabularPDF = useCallback(async () => {
    try {
      setExportingData(true);
      const rows = await fetchAllLogsForExport();
      const { jsPDF } = await import('jspdf');
      const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFillColor(62, 59, 54);
      doc.rect(0, 0, 297, 18, 'F');
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(11);
      doc.text(`Campaign Recipients — ${displayTitle || campaignId}`, 10, 12);
      doc.setFont('helvetica','normal'); doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 200, 12);

      const headers  = ['Customer Name','Phone Number','Status','Dispatched At'];
      const colX     = [10, 80, 150, 190];
      let y = 28;

      doc.setFillColor(245, 241, 234);
      doc.rect(10, y - 5, 277, 8, 'F');
      doc.setTextColor(62,59,54); doc.setFont('helvetica','bold'); doc.setFontSize(8);
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += 6; doc.setFont('helvetica','normal');

      rows.forEach(r => {
        if (y > 185) { doc.addPage(); y = 15; }
        const vals = [r['Customer Name'].substring(0,30), r['Phone Number'], r['WhatsApp Status'], r['Dispatched At'].substring(0,20)];
        vals.forEach((v, i) => doc.text(v, colX[i], y));
        doc.setDrawColor(232,227,218); doc.line(10, y+2, 287, y+2);
        y += 7;
      });

      doc.save(`Campaign_Recipients_${campaignId}.pdf`);
    } finally { setExportingData(false); setExportOpen(false); }
  }, [fetchAllLogsForExport, campaignId, displayTitle]);

  // ── Fetch / refresh logs ────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('message_logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (logsError) {
        console.error('[Campaign Drill] fetchLogs error:', logsError);
        return;
      }

      if (!logsData || logsData.length === 0) {
        setRecipients([]);
        return;
      }

      // Check if we need to lookup names from customers_master (for legacy logs or missing entries)
      const needsLookupPhones: string[] = [];
      logsData
        .filter((log) => !log.customer_name || log.customer_name === 'Customer')
        .forEach((log) => {
          if (!log.recipient_phone) return;
          const clean = log.recipient_phone.split('@')[0];
          needsLookupPhones.push(clean);
          needsLookupPhones.push(`${clean}@s.whatsapp.net`);
        });

      let lookup: Record<string, string> = {};
      if (needsLookupPhones.length > 0) {
        const { data: contacts, error: contactsError } = await supabase
          .from('customers_master')
          .select('customer_name, whatsapp_number')
          .in('whatsapp_number', needsLookupPhones);

        if (contactsError) {
          console.error('[Campaign Drill] Fallback lookup error:', contactsError);
        } else {
          (contacts ?? []).forEach((c) => {
            if (c.whatsapp_number) {
              const raw = c.whatsapp_number.split('@')[0];
              const digits = raw.replace(/\D/g, '');
              lookup[raw] = c.customer_name || '';
              lookup[digits] = c.customer_name || '';
            }
          });
        }
      }

      const enriched = logsData.map((log) => {
        const raw = log.recipient_phone ? log.recipient_phone.split('@')[0] : '';
        const digits = raw.replace(/\D/g, '');
        const resolvedName = log.customer_name && log.customer_name !== 'Customer'
          ? log.customer_name
          : (lookup[raw] || lookup[digits] || 'Customer');

        return {
          id: log.id,
          customer_name: resolvedName,
          whatsapp_number: raw,
          recipient_phone: log.recipient_phone || '',
          message_status: (log.status || 'PENDING').toUpperCase(),
        };
      });

      setRecipients(enriched);
    } catch (err) {
      console.error('[Campaign Drill] fetchLogs exception:', err);
    }
  }, [campaignId]);

  // ── Manual refresh ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/campaigns/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
    } catch (err) {
      console.error('[Campaign Drill] Sync error:', err);
    }
    try {
      await fetchLogs();
      // Also re-fetch campaign row to get updated counters
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .maybeSingle();
      if (data) setCampaign(data as Campaign);
    } catch (err) {
      console.error('[Campaign Drill] handleRefresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Load campaign record
        const { data: campaignData } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .eq('shop_id', user.id)
          .maybeSingle();

        if (!campaignData) {
          setLoading(false);
          return;
        }

        setCampaign(campaignData as Campaign);

        // Fetch and enrich message logs
        await fetchLogs();

        // ── Real-time subscriptions ─────────────────────────────────────────
        channel = supabase
          .channel(`campaign-drill:${campaignId}-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'campaigns',
              filter: `id=eq.${campaignId}`,
            },
            (evt) => {
              setCampaign(evt.new as Campaign);
            },
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'message_logs',
              filter: `campaign_id=eq.${campaignId}`,
            },
            () => {
              fetchLogs();
            },
          );

        channel.subscribe();
      } catch (err) {
        console.error('[Campaign Drill] load error:', err);
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [campaignId, fetchLogs]);

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-20">
        <h1 className="serif-headline text-2xl text-[#3E3B36] mb-4">Campaign Not Found</h1>
        <Link href="/dashboard/campaigns" className="btn-primary rounded-lg">
          Return to Ledger
        </Link>
      </div>
    );
  }

  // ── Metrics — sourced exclusively from DB columns, never from ledger math ──
  const total = campaign.total_recipients ?? 0;
  const sent  = campaign.total_sent      ?? 0;
  const failed = campaign.total_failed   ?? 0;
  const read  = campaign.total_read      ?? 0;
  // delivered = everything successfully ACK'd minus those confirmed read
  const delivered = Math.max(0, (campaign.total_delivered ?? sent) - read);

  // Guard against division-by-zero when total is 0 (e.g. failed before sending)
  const safeDivisor = total > 0 ? total : 1;
  const readPct      = Math.min(100, Math.round((read      / safeDivisor) * 100));
  const deliveredPct = Math.min(100, Math.round((delivered / safeDivisor) * 100));
  const failedPct    = Math.min(100, Math.round((failed    / safeDivisor) * 100));

  const campaignBadge = getCampaignBadge(campaign.status);

  // Count live breakdown from the ledger rows (for in-progress campaigns)
  const ledgerSent    = recipients.filter((r) => ['SENT', 'DELIVERED', 'READ'].includes(r.message_status)).length;
  const ledgerFailed  = recipients.filter((r) => r.message_status === 'FAILED').length;
  const ledgerPending = recipients.filter((r) => ['PENDING_DISPATCH', 'PENDING'].includes(r.message_status)).length;

  return (
    <div id="campaign-report-container" className="max-w-5xl mx-auto space-y-8 p-4">

      {/* Header */}
      <div>
        <Link
          data-html2canvas-ignore="true"
          href="/dashboard/campaigns/history"
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] text-[#8B8378] hover:text-[#C4A896] transition-colors uppercase mb-4"
        >
          <ArrowLeft size={12} /> Back to History
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">{displayTitle}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase flex items-center gap-1">
                <Clock size={12} />
                {new Date(campaign.created_at).toLocaleString('en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
              <span className="w-1 h-1 bg-[#E8E3DA] rounded-full" />
              <span className="text-xs tracking-[0.15em] text-[#8B8378] uppercase">
                {total.toLocaleString()} Recipients
              </span>
              <span className="w-1 h-1 bg-[#E8E3DA] rounded-full" />
              <span className="text-xs tracking-[0.15em] text-[#C4A896] uppercase font-semibold">
                Target: {targetTags}
              </span>
            </div>
          </div>

          {/* Campaign status badge + refresh */}
          <div className="flex items-center gap-3">
            <span
              className={`text-[10px] tracking-[0.15em] uppercase font-semibold px-3 py-1.5 rounded-full border ${campaignBadge.classes}`}
            >
              {campaignBadge.label}
            </span>
            <button
              data-html2canvas-ignore="true"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg border border-[#E8E3DA] hover:border-[#C4A896] text-[#8B8378] hover:text-[#3E3B36] transition-all disabled:opacity-40"
              title="Refresh data"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Details (Message Body & Image) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Message Body Card */}
        <div className={campaign.image_url ? "md:col-span-2 bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-6 flex flex-col justify-between" : "md:col-span-3 bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-6 flex flex-col justify-between"}>
          <div>
            <h3 className="lexend-subheading text-xs font-semibold text-[#3E3B36] uppercase tracking-[0.1em] mb-3">
              Broadcast Message Content
            </h3>
            <div className="p-4 bg-[#F5F1EA]/40 rounded-lg border border-[#E8E3DA] whitespace-pre-wrap text-sm text-[#3E3B36] font-sans leading-relaxed">
              {campaign.message_body || 'No message content defined.'}
            </div>
          </div>
        </div>

        {/* Flyer Image Card (only rendered if image_url exists) */}
        {campaign.image_url ? (
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-6 flex flex-col items-center justify-center">
            <h3 className="lexend-subheading text-xs font-semibold text-[#3E3B36] uppercase tracking-[0.1em] mb-3 self-start">
              Flyer Attachment
            </h3>
            <div className="relative group overflow-hidden rounded-lg border border-[#E8E3DA] max-w-xs cursor-zoom-in">
              <img
                src={campaign.image_url}
                alt="Campaign Flyer"
                className="w-full h-48 object-contain bg-[#F5F1EA]/30 transition-transform duration-300 group-hover:scale-105"
                onClick={() => setZoomedImage(campaign.image_url)}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="text-white text-xs font-medium px-3 py-1.5 bg-black/60 rounded-full">Zoom Image</span>
              </div>
            </div>
          </div>
        ) : null}

      </div>

      {/* Payload Breakdown */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-start flex-wrap gap-4 mb-8">
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36] mb-1">
              Payload Breakdown
            </h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">
              Performance metrics sourced directly from the delivery ledger
            </p>
          </div>
          <div data-html2canvas-ignore="true" className="flex items-center gap-2">
            {failed > 0 && (
              <button
                onClick={handleRetryAll}
                disabled={retryingAll}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <RefreshCw size={14} className={retryingAll ? 'animate-spin' : ''} />
                Retry All Failed
              </button>
            )}
            <button
              onClick={handleDownloadReport}
              disabled={generatingReport}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#E8E3DA] hover:border-[#C4A896] text-[#8B8378] hover:text-[#3E3B36] text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-white"
            >
              {generatingReport ? (
                <><RefreshCw size={14} className="animate-spin" /> Generating Report...</>
              ) : (
                <span>📄 Download Visual PDF</span>
              )}
            </button>

            {/* Export dropdown */}
            <div className="relative">
              <button
                onClick={() => setExportOpen(o => !o)}
                disabled={exportingData}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#E8E3DA] hover:border-[#C4A896] text-[#8B8378] hover:text-[#3E3B36] text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer bg-white"
              >
                {exportingData ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                Export Data <ChevronDown size={11} />
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-[#E8E3DA] rounded-xl shadow-xl z-20 py-1.5">
                    <button onClick={handleExportCSV} className="w-full text-left px-4 py-2.5 text-xs text-[#3E3B36] hover:bg-[#F5F1EA]/70 flex items-center gap-2.5 cursor-pointer">
                      <FileText size={13} className="text-[#C4A896]" /> Export as CSV
                    </button>
                    <button onClick={handleExportExcel} className="w-full text-left px-4 py-2.5 text-xs text-[#3E3B36] hover:bg-[#F5F1EA]/70 flex items-center gap-2.5 cursor-pointer">
                      <FileSpreadsheet size={13} className="text-[#10b981]" /> Export as Excel
                    </button>
                    <button onClick={handleExportTabularPDF} className="w-full text-left px-4 py-2.5 text-xs text-[#3E3B36] hover:bg-[#F5F1EA]/70 flex items-center gap-2.5 cursor-pointer">
                      <Download size={13} className="text-[#f43f5e]" /> Download Tabular PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stacked bar — only shown when campaign has sent some messages */}
        {(readPct + deliveredPct + failedPct) > 0 ? (
          <div className="w-full h-6 rounded-full overflow-hidden flex bg-[#F5F1EA] mb-6">
            <div
              className="bg-[#10B981] h-full transition-all duration-1000 ease-out"
              style={{ width: `${readPct}%` }}
              title={`Read: ${readPct}%`}
            />
            <div
              className="bg-[#6366F1] h-full transition-all duration-1000 ease-out"
              style={{ width: `${deliveredPct}%` }}
              title={`Delivered: ${deliveredPct}%`}
            />
            <div
              className="bg-[#F43F5E] h-full transition-all duration-1000 ease-out"
              style={{ width: `${failedPct}%` }}
              title={`Failed: ${failedPct}%`}
            />
          </div>
        ) : (
          <div className="w-full h-6 rounded-full bg-[#F5F1EA] mb-6 relative overflow-hidden">
            {campaign.status === 'processing' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C4A896]/20 to-transparent animate-[shimmer_2s_infinite]" />
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm bg-[#10B981]" />
              <span className="text-xs font-medium text-[#3E3B36]">Read</span>
            </div>
            <span className="text-xl font-semibold text-[#10B981]">
              {readPct}%{' '}
              <span className="text-xs font-normal text-[#8B8378]">({read.toLocaleString()})</span>
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm bg-[#6366F1]" />
              <span className="text-xs font-medium text-[#3E3B36]">Delivered</span>
            </div>
            <span className="text-xl font-semibold text-[#6366F1]">
              {deliveredPct}%{' '}
              <span className="text-xs font-normal text-[#8B8378]">({delivered.toLocaleString()})</span>
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm bg-[#F43F5E]" />
              <span className="text-xs font-medium text-[#3E3B36]">Failed</span>
            </div>
            <span className="text-xl font-semibold text-[#F43F5E]">
              {failedPct}%{' '}
              <span className="text-xs font-normal text-[#8B8378]">({failed.toLocaleString()})</span>
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm bg-[#C4A896]" />
              <span className="text-xs font-medium text-[#3E3B36]">Sent</span>
            </div>
            <span className="text-xl font-semibold text-[#C4A896]">
              {sent.toLocaleString()}{' '}
              <span className="text-xs font-normal text-[#8B8378]">/ {total.toLocaleString()}</span>
            </span>
          </div>
        </div>

        {campaign.status === 'failed' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-semibold text-red-800">❌ Error Diagnostic Log:</p>
            <p className="text-sm text-red-600 mt-1">{campaign.failure_reason || 'Unknown execution error'}</p>
          </div>
        )}
      </div>

      {/* Recipient Ledger */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">
              Recipient Ledger
            </h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mt-0.5">
              Live per-contact delivery tracking
            </p>
          </div>

          {/* Live counters */}
          <div className="flex items-center gap-4 text-[10px] tracking-[0.1em] uppercase">
            {ledgerPending > 0 && (
              <span className="text-[#8B8378]">
                <span className="font-semibold">{ledgerPending}</span> in queue
              </span>
            )}
            {ledgerSent > 0 && (
              <span className="text-[#6366F1]">
                <span className="font-semibold">{ledgerSent}</span> sent
              </span>
            )}
            {ledgerFailed > 0 && (
              <span className="text-[#F43F5E]">
                <span className="font-semibold">{ledgerFailed}</span> failed
              </span>
            )}
            <div className="flex items-center gap-1 text-[#8B8378]">
              <Info size={12} />
              {recipients.length} total rows
            </div>
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-3 gap-4 px-6 py-3 border-b border-[#E8E3DA] bg-[#F5F1EA]/40">
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Customer Name</p>
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">WhatsApp Number</p>
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Delivery Status</p>
        </div>

        {recipients.length > 0 ? (
          recipients.map((r) => {
            const pill = getPillConfig(r.message_status);
            return (
              <div
                key={r.id}
                className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-[#E8E3DA] last:border-0 hover:bg-[#F5F1EA]/50 transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-sm text-[#3E3B36] font-medium">
                    {r.customer_name || r.recipient_phone || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-[#8B8378] font-mono">{r.recipient_phone}</span>
                </div>
                <div className="flex items-center justify-between w-full pr-4">
                  <span
                    className={`text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full ${pill.classes}`}
                  >
                    {pill.label}
                  </span>
                  {r.message_status === 'FAILED' && (
                    <button
                      data-html2canvas-ignore="true"
                      onClick={() => handleRetrySingle(r.id)}
                      disabled={retryingSingle === r.id}
                      className="inline-flex items-center gap-1 text-xs text-[#8B8378] hover:text-[#C4A896] transition-colors disabled:opacity-50 cursor-pointer"
                      title="Retry this message"
                    >
                      <RefreshCw size={12} className={retryingSingle === r.id ? 'animate-spin' : ''} />
                      <span className="underline">Retry</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <>
            {/* Elegant PDF Placeholder Grid */}
            {[1, 2, 3].map((placeholderIdx) => (
              <div
                key={`pdf-placeholder-row-${placeholderIdx}`}
                className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-[#E8E3DA] last:border-0 opacity-40 select-none"
              >
                <div className="flex items-center">
                  <span className="text-sm text-[#8B8378] font-medium italic">Pending Recipient Node...</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-[#8B8378] font-mono italic">Awaiting Dispatch Queue</span>
                </div>
                <div className="flex items-center">
                  <span className="text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full bg-[#F5F1EA] text-[#8B8378] border border-[#E8E3DA]">
                    Pending Dispatch
                  </span>
                </div>
              </div>
            ))}
            <div className="py-16 text-center bg-[#F5F1EA]/10 border-t border-[#E8E3DA]">
              {campaign.status === 'processing' ? (
                <>
                  <div className="w-6 h-6 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-xs text-[#8B8378] uppercase tracking-[0.15em]">
                    Preparing recipient queue…
                  </p>
                </>
              ) : (
                <p className="text-xs text-[#8B8378] uppercase tracking-[0.15em]">
                  No recipient records found for this campaign. (0 total rows)
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Responsive Pop-up Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-12 right-0 sm:-right-12 p-2 bg-[#3E3B36] text-[#F5F1EA] hover:text-[#C4A896] rounded-full border border-[#E8E3DA]/30 shadow-lg transition-colors cursor-pointer focus:outline-none"
              title="Close modal"
            >
              <X size={20} />
            </button>
            <img
              src={zoomedImage}
              alt="Flyer Zoom View"
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg border border-[#E8E3DA]/20 shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
