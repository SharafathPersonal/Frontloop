'use client';

import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { Campaign } from '@/types/broadcast';
import { ArrowLeft, Clock, Info, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/contexts/ToastContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecipientRow {
  id: string;
  customer_name: string;
  whatsapp_number: string;
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
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingAll, setRetryingAll] = useState(false);
  const [retryingSingle, setRetryingSingle] = useState<string | null>(null);
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

  // Phone-to-name lookup map (built once, reused for enrichment)
  const [phoneToName, setPhoneToName] = useState<Record<string, string>>({});

  // ── Enrich raw log rows with customer names ─────────────────────────────
  const enrichLogs = useCallback(
    (logsList: { id: string; recipient_phone: string; status: string }[]): RecipientRow[] =>
      logsList.map((log) => {
        // Strip JID domain if present; normalise to digit-only for lookup
        const phoneRaw = log.recipient_phone.split('@')[0];
        const phoneDigits = phoneRaw.replace(/\D/g, '');
        const customer_name =
          phoneToName[phoneRaw] ??
          phoneToName[phoneDigits] ??
          'Unknown Recipient';

        return {
          id: log.id,
          customer_name,
          whatsapp_number: phoneRaw,
          message_status: log.status.toUpperCase(),
        };
      }),
    [phoneToName],
  );

  // ── Fetch / refresh logs ────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from('message_logs')
      .select('id, recipient_phone, status')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (data) {
      setRecipients(enrichLogs(data));
    }
  }, [campaignId, enrichLogs]);

  // ── Manual refresh ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    // Also re-fetch campaign row to get updated counters
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .maybeSingle();
    if (data) setCampaign(data as Campaign);
    setRefreshing(false);
  };

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

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

      // Build phone → name lookup from customers_master
      const { data: contacts } = await supabase
        .from('customers_master')
        .select('customer_name, whatsapp_number')
        .eq('shop_id', user.id);

      const lookup: Record<string, string> = {};
      (contacts ?? []).forEach((c) => {
        const raw = c.whatsapp_number.split('@')[0];
        const digits = raw.replace(/\D/g, '');
        lookup[raw] = c.customer_name;
        lookup[digits] = c.customer_name;
      });
      setPhoneToName(lookup);

      // Load initial message_logs
      const { data: logsData } = await supabase
        .from('message_logs')
        .select('id, recipient_phone, status')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (logsData) {
        // Use the lookup directly here because phoneToName state may not have
        // flushed yet (React batches state updates).
        const enrichedNow = logsData.map((log) => {
          const raw = log.recipient_phone.split('@')[0];
          const digits = raw.replace(/\D/g, '');
          return {
            id: log.id,
            customer_name: lookup[raw] ?? lookup[digits] ?? 'Unknown Recipient',
            whatsapp_number: raw,
            message_status: log.status.toUpperCase(),
          };
        });
        setRecipients(enrichedNow);
      }

      // ── Real-time subscriptions ─────────────────────────────────────────
      channel = supabase
        .channel(`campaign-drill:${campaignId}`)
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
          async () => {
            // Re-fetch the full sorted list when any log changes
            const { data: latest } = await supabase
              .from('message_logs')
              .select('id, recipient_phone, status')
              .eq('campaign_id', campaignId)
              .order('created_at', { ascending: false });

            if (latest) {
              const enriched = latest.map((log) => {
                const raw = log.recipient_phone.split('@')[0];
                const digits = raw.replace(/\D/g, '');
                return {
                  id: log.id,
                  customer_name: lookup[raw] ?? lookup[digits] ?? 'Unknown Recipient',
                  whatsapp_number: raw,
                  message_status: log.status.toUpperCase(),
                };
              });
              setRecipients(enriched);
            }
          },
        );

      channel.subscribe((status) => {
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.warn('[Campaign Drill] Realtime channel error — retrying in 3s…');
          setTimeout(() => channel?.subscribe(), 3_000);
        }
      });

      setLoading(false);
    }

    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [campaignId]);

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

  // Extract human-readable title and target tags from stored title
  const titleMatch = campaign.title.match(/^(.*?)\s*\[Tags:\s*([^\]]+)\]$/);
  const displayTitle = titleMatch ? titleMatch[1].trim() : campaign.title;
  const targetTags   = titleMatch ? titleMatch[2].trim() : '—';

  const campaignBadge = getCampaignBadge(campaign.status);

  // Count live breakdown from the ledger rows (for in-progress campaigns)
  const ledgerSent    = recipients.filter((r) => ['SENT', 'DELIVERED', 'READ'].includes(r.message_status)).length;
  const ledgerFailed  = recipients.filter((r) => r.message_status === 'FAILED').length;
  const ledgerPending = recipients.filter((r) => ['PENDING_DISPATCH', 'PENDING'].includes(r.message_status)).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] text-[#8B8378] hover:text-[#C4A896] transition-colors uppercase mb-4"
        >
          <ArrowLeft size={12} /> Back to Ledger
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
            {campaign.status === 'failed' && campaign.failure_reason && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2.5 rounded-lg mt-3 block max-w-xl break-words">
                <strong>Failure Diagnostic:</strong> {cleanFailureReason(campaign.failure_reason)}
              </div>
            )}
          </div>

          {/* Campaign status badge + refresh */}
          <div className="flex items-center gap-3">
            <span
              className={`text-[10px] tracking-[0.15em] uppercase font-semibold px-3 py-1.5 rounded-full border ${campaignBadge.classes}`}
            >
              {campaignBadge.label}
            </span>
            <button
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

      {/* Payload Breakdown */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-8">
        <div className="flex justify-between items-start flex-wrap gap-4 mb-8">
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36] mb-1">
              Payload Breakdown
            </h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">
              Performance metrics sourced directly from the delivery ledger
            </p>
          </div>
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
                  <span className="text-sm text-[#3E3B36] font-medium">{r.customer_name}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-[#8B8378] font-mono">{r.whatsapp_number}</span>
                </div>
                <div className="flex items-center justify-between w-full pr-4">
                  <span
                    className={`text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full ${pill.classes}`}
                  >
                    {pill.label}
                  </span>
                  {r.message_status === 'FAILED' && (
                    <button
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
          <div className="py-16 text-center">
            {campaign.status === 'processing' ? (
              <>
                <div className="w-6 h-6 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-xs text-[#8B8378] uppercase tracking-[0.15em]">
                  Preparing recipient queue…
                </p>
              </>
            ) : (
              <p className="text-xs text-[#8B8378] uppercase tracking-[0.15em]">
                No recipient records found for this campaign.
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
