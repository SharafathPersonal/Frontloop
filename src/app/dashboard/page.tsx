import Link from 'next/link';
import { requireTenant } from '@/server/auth/dal';
import { forTenant } from '@/server/repos/tenant';
import {
  Users,
  MessageSquare,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';

export const metadata = {
  title: 'Dashboard — True Attendly',
};

export default async function DashboardPage() {
  const session = await requireTenant(['owner', 'staff']);
  const repo = forTenant(session.tenantId);

  const [tenant, leadsResult, kb] = await Promise.all([
    repo.getTenant(),
    repo.listLeads({ limit: 5 }),
    repo.getKnowledgeBase(),
  ]);

  const recentLeads = leadsResult.leads;
  const totalLeadsCount = leadsResult.totalCount;
  const servicesCount = kb?.services?.length ?? 0;
  const faqsCount = kb?.faqs?.length ?? 0;

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Welcome Banner */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#8B8378] bg-[#F5F1EA] px-2.5 py-1 rounded-md">
            {tenant?.category || 'Business'} AI Concierge
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#3E3B36] mt-2">
            Welcome back, {tenant?.name}
          </h1>
          <p className="text-xs sm:text-sm text-[#8B8378] mt-1 max-w-xl">
            Your WhatsApp Business AI agent is monitoring customer inquiries 24/7, capturing leads, and answering appointments in real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/leads"
            className="flex items-center gap-2 bg-[#3E3B36] text-[#F5F1EA] px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#2B2925] transition-all"
          >
            <Users size={14} /> View Leads
          </Link>
          <Link
            href="/dashboard/knowledge"
            className="flex items-center gap-2 bg-[#F5F1EA] text-[#3E3B36] border border-[#E8E3DA] px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#E8E3DA] transition-all"
          >
            <BookOpen size={14} /> Edit Knowledge Base
          </Link>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1 */}
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#8B8378]">
            <span className="text-xs font-bold uppercase tracking-wider">Total Customer Leads</span>
            <Users size={16} className="text-[#C4A896]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#3E3B36]">{totalLeadsCount}</p>
          <p className="text-[11px] text-[#8B8378] flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-600" /> Captured automatically via WhatsApp
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#8B8378]">
            <span className="text-xs font-bold uppercase tracking-wider">Services In Catalog</span>
            <Sparkles size={16} className="text-[#C4A896]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#3E3B36]">{servicesCount}</p>
          <p className="text-[11px] text-[#8B8378]">
            Available for instant AI fee and timing quotes
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#8B8378]">
            <span className="text-xs font-bold uppercase tracking-wider">Active FAQs</span>
            <BookOpen size={16} className="text-[#C4A896]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#3E3B36]">{faqsCount}</p>
          <p className="text-[11px] text-[#8B8378]">
            Instant resolution answers for customer queries
          </p>
        </div>
      </div>

      {/* Recent Leads Preview */}
      <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E3DA] pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#3E3B36] flex items-center gap-2">
            <MessageSquare size={16} className="text-[#C4A896]" />
            Recent Inquiries
          </h2>
          <Link
            href="/dashboard/leads"
            className="text-xs font-semibold text-[#C4A896] hover:text-[#3E3B36] flex items-center gap-1 transition-colors"
          >
            All Leads <ArrowRight size={13} />
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <p className="text-xs text-[#8B8378] italic py-8 text-center">
            No customer inquiries yet. Connect your WhatsApp number in Settings to start receiving leads.
          </p>
        ) : (
          <div className="divide-y divide-[#E8E3DA]">
            {recentLeads.map((lead) => (
              <div
                key={String(lead._id)}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#F5F1EA]/30 transition-colors rounded-lg px-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#3E3B36]">
                      {lead.name || lead.profileName || 'Customer'}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {lead.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8B8378] mt-0.5 truncate max-w-md">
                    {lead.requirement || 'No specific requirement noted'}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="text-[11px] text-[#8B8378] flex items-center gap-1">
                    <Clock size={11} />
                    {lead.lastMessageAt
                      ? new Date(lead.lastMessageAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })
                      : ''}
                  </span>
                  <Link
                    href={`/dashboard/leads/${lead._id}`}
                    className="text-xs font-semibold text-[#C4A896] hover:text-[#3E3B36]"
                  >
                    Open Chat &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
