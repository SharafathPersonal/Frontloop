'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { ChevronLeft, Mail, CheckCircle2, XCircle, Clock, Tag, LayoutTemplate, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import CustomConfirm from '@/components/ui/CustomConfirm';

interface EmailCampaign {
  id: string;
  title: string;
  subject: string;
  html_body: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  failure_reason: string | null;
  target_tags: string[];
  created_at: string;
}

export default function EmailCampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<EmailCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadCampaign() {
      if (!id) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', id)
        .eq('shop_id', user.id)
        .maybeSingle();

      if (error || !data) {
        setErrorMsg('Campaign not found or access denied.');
      } else {
        setCampaign(data);
      }
      setLoading(false);
    }
    loadCampaign();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <h2 className="serif-headline text-2xl text-[#3E3B36]">Campaign Not Found</h2>
        <p className="text-xs text-[#8B8378] mt-2 mb-6 uppercase tracking-widest">The requested broadcast does not exist.</p>
        <Link href="/dashboard/email/history" className="btn-primary px-6 py-3 rounded-lg text-xs uppercase tracking-widest">
          Return to History
        </Link>
        <CustomConfirm
          isOpen={errorMsg !== null}
          title="Error"
          message={errorMsg || ''}
          confirmText="Dismiss"
          onConfirm={() => setErrorMsg(null)}
          onCancel={() => setErrorMsg(null)}
        />
      </div>
    );
  }

  const successRate = campaign.total_sent > 0 
    ? Math.round((campaign.total_delivered / campaign.total_sent) * 100) 
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/email/history" className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase hover:text-[#6366f1] transition-colors mb-4">
            <ChevronLeft size={12} /> Back to History
          </Link>
          <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">{campaign.title}</h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5 flex items-center gap-2">
            <Clock size={12} /> {new Date(campaign.created_at).toLocaleString()}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase border ${
          campaign.status === 'completed' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' :
          campaign.status === 'failed' ? 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20' :
          campaign.status === 'processing' ? 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20' :
          'bg-[#8B8378]/10 text-[#8B8378] border-[#8B8378]/20'
        }`}>
          {campaign.status}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5 shadow-sm">
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1 flex items-center gap-1.5">
            <Mail size={12} /> Target Volume
          </p>
          <h2 className="serif-headline text-2xl text-[#3E3B36]">{campaign.total_recipients.toLocaleString()}</h2>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5 shadow-sm">
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1 flex items-center gap-1.5">
            <Activity size={12} className="text-[#6366f1]" /> Successfully Sent
          </p>
          <h2 className="serif-headline text-2xl text-[#6366f1]">{campaign.total_sent.toLocaleString()}</h2>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5 shadow-sm">
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-[#10B981]" /> Delivered ({successRate}%)
          </p>
          <h2 className="serif-headline text-2xl text-[#10B981]">{campaign.total_delivered.toLocaleString()}</h2>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-5 shadow-sm">
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1 flex items-center gap-1.5">
            <XCircle size={12} className="text-[#ef4444]" /> Bounced / Failed
          </p>
          <h2 className="serif-headline text-2xl text-[#ef4444]">{campaign.total_failed.toLocaleString()}</h2>
        </div>
      </div>

      {/* Content Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Metadata */}
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-6 space-y-5 shadow-sm">
            <div>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Email Subject Line</p>
              <p className="text-sm font-medium text-[#3E3B36] bg-[#F5F1EA]/50 p-3 rounded-lg border border-[#E8E3DA]/50">{campaign.subject}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5 flex items-center gap-1.5"><Tag size={12}/> Audience Targeting</p>
              <div className="flex flex-wrap gap-2">
                {campaign.target_tags?.length > 0 ? campaign.target_tags.map(tag => (
                  <span key={tag} className="bg-[#6366f1]/10 border border-[#6366f1]/20 text-[#6366f1] text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-md uppercase">
                    {tag}
                  </span>
                )) : <span className="text-xs text-[#8B8378]">No tags specified</span>}
              </div>
            </div>
            {campaign.failure_reason && (
              <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg p-4">
                <p className="text-[10px] tracking-[0.2em] text-[#ef4444] uppercase mb-1.5 font-bold">Failure Log</p>
                <p className="text-xs text-[#ef4444]/80">{campaign.failure_reason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: HTML Preview */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="bg-[#F5F1EA] px-5 py-3 border-b border-[#E8E3DA] flex items-center gap-2">
            <LayoutTemplate size={14} className="text-[#8B8378]" />
            <span className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-semibold">Email Creative Render</span>
          </div>
          <div className="flex-1 min-h-[500px] p-6 bg-[#F9F9F9] overflow-auto">
            {/* 
              Render raw HTML inside a constrained box to mimic email client behavior.
              Security Note: The HTML is generated securely by the AI/Dashboard, but rendering it directly here.
            */}
            <div 
              className="bg-white mx-auto shadow-md border border-gray-100 max-w-[600px] rounded-lg overflow-hidden" 
              style={{ minHeight: '400px' }}
              dangerouslySetInnerHTML={{ __html: campaign.html_body }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
