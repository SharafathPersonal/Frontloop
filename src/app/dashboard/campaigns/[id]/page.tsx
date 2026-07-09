'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { Campaign, Customer } from '@/types/broadcast';
import { ArrowLeft, Clock, Info } from 'lucide-react';

export default function CampaignDrillDownPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<{ id: string; customer_name: string; whatsapp_number: string; message_status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: any;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', unwrappedParams.id)
        .eq('shop_id', user.id)
        .maybeSingle();

      if (campaignData) {
        setCampaign(campaignData);
        
        // Fetch real customers for phone-to-name lookup mapping
        const { data: customers } = await supabase
          .from('customers_master')
          .select('customer_name, whatsapp_number')
          .eq('shop_id', user.id);
        
        const phoneToName: Record<string, string> = {};
        if (customers) {
          customers.forEach(c => {
            const clean = c.whatsapp_number.replace(/\D/g, '');
            phoneToName[clean] = c.customer_name;
          });
        }

        const enrichLogs = (logsList: any[]) => {
          return logsList.map((log: any) => {
            const cleanPhone = log.recipient_phone.replace(/\D/g, '');
            return {
              id: log.id,
              customer_name: phoneToName[cleanPhone] || 'Unknown Recipient',
              whatsapp_number: log.recipient_phone,
              message_status: log.status.toUpperCase()
            };
          });
        };

        // Fetch real message logs for this campaign
        const { data: logsData } = await supabase
          .from('message_logs')
          .select('*')
          .eq('campaign_id', unwrappedParams.id)
          .order('created_at', { ascending: false });

        if (logsData) {
          setRecipients(enrichLogs(logsData));
        }

        // Setup the real-time Supabase subscription channel with automatic reconnection
        const setupChannel = () => {
          channel = supabase
            .channel(`public:campaigns:${unwrappedParams.id}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'campaigns',
                filter: `id=eq.${unwrappedParams.id}`
              },
              (payload) => {
                setCampaign(payload.new as Campaign);
              }
            )
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'message_logs',
                filter: `campaign_id=eq.${unwrappedParams.id}`
              },
              async () => {
                // Re-fetch latest logs when there are updates in real time
                const { data: latestLogs } = await supabase
                  .from('message_logs')
                  .select('*')
                  .eq('campaign_id', unwrappedParams.id)
                  .order('created_at', { ascending: false });
                
                if (latestLogs) {
                  setRecipients(enrichLogs(latestLogs));
                }
              }
            );

          channel.subscribe((status: string) => {
            console.log(`[Realtime Channel] Connection status changed to: ${status}`);
            if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              console.warn('[Realtime Channel] Connection closed or errored. Retrying subscription in 3 seconds...');
              setTimeout(() => {
                if (channel) channel.subscribe();
              }, 3000);
            }
          });
        };

        setupChannel();
      }
      setLoading(false);
    }

    load();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [unwrappedParams.id]);

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
        <Link href="/dashboard/campaigns" className="btn-secondary-dark rounded-lg">Return to Ledger</Link>
      </div>
    );
  }

  // Calculate metrics
  const total = campaign.total_recipients || 1;
  const sent = campaign.total_sent || 0;
  const failed = campaign.total_failed || 0;
  const read = campaign.total_read || 0;
  const delivered = Math.max(0, (campaign.total_delivered || 0) - read);

  const readPct = Math.round((read / total) * 100);
  const deliveredPct = Math.round((delivered / total) * 100);
  const failedPct = Math.round((failed / total) * 100);

  // Parse the campaign title to see if it contains targeting tags metadata
  const match = campaign.title.match(/(.*)\s+\[Tags:\s*([^\]]+)\]/);
  const displayTitle = match ? match[1] : campaign.title;
  const targetTags = match ? match[2] : 'All';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* Header */}
      <div>
        <Link href="/dashboard/campaigns" className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] text-[#8B8378] hover:text-[#C4A896] transition-colors uppercase mb-4">
          <ArrowLeft size={12} /> Back to Ledger
        </Link>
        <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">{displayTitle}</h1>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase flex items-center gap-1">
            <Clock size={12} /> {new Date(campaign.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          <span className="w-1 h-1 bg-[#E8E3DA] rounded-full" />
          <span className="text-xs tracking-[0.15em] text-[#8B8378] uppercase">{campaign.total_recipients.toLocaleString()} Recipients</span>
          <span className="w-1 h-1 bg-[#E8E3DA] rounded-full" />
          <span className="text-xs tracking-[0.15em] text-[#C4A896] uppercase font-semibold">Target: {targetTags}</span>
        </div>
      </div>

      {/* Visual Analytics Block */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-8">
        <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36] mb-1">Payload Breakdown</h2>
        <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-8">Performance metrics and delivery rates</p>
        
        {/* Horizontal Stacked Bar */}
        <div className="w-full h-6 rounded-full overflow-hidden flex bg-[#F5F1EA] mb-6">
          <div className="bg-[#10B981] h-full transition-all duration-1000 ease-out" style={{ width: `${readPct}%` }} title="Read" />
          <div className="bg-[#6366F1] h-full transition-all duration-1000 ease-out" style={{ width: `${deliveredPct}%` }} title="Delivered" />
          <div className="bg-[#F43F5E] h-full transition-all duration-1000 ease-out" style={{ width: `${failedPct}%` }} title="Failed" />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm bg-[#10B981]" />
              <span className="text-xs font-medium text-[#3E3B36]">Read Rate</span>
            </div>
            <span className="text-xl font-semibold text-[#10B981]">{readPct}% <span className="text-xs font-normal text-[#8B8378]">({read.toLocaleString()})</span></span>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm bg-[#6366F1]" />
              <span className="text-xs font-medium text-[#3E3B36]">Delivered, Not Read</span>
            </div>
            <span className="text-xl font-semibold text-[#6366F1]">{deliveredPct}% <span className="text-xs font-normal text-[#8B8378]">({delivered.toLocaleString()})</span></span>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm bg-[#F43F5E]" />
              <span className="text-xs font-medium text-[#3E3B36]">Failed / Bounced</span>
            </div>
            <span className="text-xl font-semibold text-[#F43F5E]">{failedPct}% <span className="text-xs font-normal text-[#8B8378]">({failed.toLocaleString()})</span></span>
          </div>
        </div>
      </div>

      {/* Customer Ledger Table */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center justify-between">
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">Recipient Ledger</h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mt-0.5">Individual contact delivery logs</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#8B8378]">
            <Info size={14} /> Showing up to 10 latest nodes
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 px-6 py-3 border-b border-[#E8E3DA] bg-[#F5F1EA]/40">
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Customer Name</p>
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">WhatsApp Number</p>
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Meta Status</p>
        </div>

        {recipients.length > 0 ? recipients.map((r) => {
          let statusPillClass = 'bg-[#F5F1EA] text-[#3E3B36] border border-[#E8E3DA]';
          if (r.message_status === 'READ') statusPillClass = 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20';
          if (r.message_status === 'DELIVERED') statusPillClass = 'bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20';
          if (r.message_status === 'FAILED') statusPillClass = 'bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/20';

          return (
            <div key={r.id} className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-[#E8E3DA] last:border-0 hover:bg-[#F5F1EA]/50 transition-colors">
              <div className="flex items-center">
                <span className="text-sm text-[#3E3B36] font-medium">{r.customer_name}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-[#8B8378] font-mono">{r.whatsapp_number}</span>
              </div>
              <div className="flex items-center">
                <span className={`text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full ${statusPillClass}`}>
                  {r.message_status}
                </span>
              </div>
            </div>
          );
        }) : (
          <div className="py-12 text-center">
            <p className="text-xs text-[#8B8378] uppercase tracking-[0.15em]">No recipient records found for this campaign.</p>
          </div>
        )}
      </div>

    </div>
  );
}
