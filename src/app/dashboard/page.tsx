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
  Gauge,
} from 'lucide-react';

export const metadata = {
  title: 'Dashboard | FrontLoop',
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
  const faqsCount = kb?.faqs?.filter((f) => f.enabled !== false).length ?? 0;
  const repliesUsed = tenant?.subscription?.repliesUsed ?? 0;
  const replyQuota = tenant?.subscription?.replyQuota ?? 0;
  const quotaPercent = replyQuota > 0 ? Math.min(Math.round((repliesUsed / replyQuota) * 100), 100) : 100;

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Welcome Banner */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#64748B] bg-[#F8FAFC] px-2.5 py-1 rounded-md">
            {tenant?.category || 'Business'} AI Concierge
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0F172A] mt-2">
            Welcome back, {tenant?.name}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 max-w-xl">
            Your WhatsApp AI front desk answers customer inquiries 24/7 from your knowledge base and captures every lead.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/leads"
            className="flex items-center gap-2 bg-[#047857] text-white px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#065F46] transition-all"
          >
            <Users size={14} /> View Leads
          </Link>
          <Link
            href="/dashboard/knowledge"
            className="flex items-center gap-2 bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#E2E8F0] transition-all"
          >
            <BookOpen size={14} /> Edit Knowledge Base
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1 */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-bold uppercase tracking-wider">Total Customer Leads</span>
            <Users size={16} className="text-[#047857]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{totalLeadsCount}</p>
          <p className="text-[11px] text-[#64748B] flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-600" /> Captured automatically via WhatsApp
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-bold uppercase tracking-wider">Services In Catalog</span>
            <Sparkles size={16} className="text-[#047857]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{servicesCount}</p>
          <p className="text-[11px] text-[#64748B]">
            Available for instant AI fee and timing quotes
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-bold uppercase tracking-wider">Active FAQs</span>
            <BookOpen size={16} className="text-[#047857]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{faqsCount}</p>
          <p className="text-[11px] text-[#64748B]">
            Instant resolution answers for customer queries
          </p>
        </div>

        {/* Card 4 */}
        <Link
          href="/dashboard/settings"
          className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-2 hover:border-[#047857] transition-colors"
        >
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-bold uppercase tracking-wider">AI Replies This Cycle</span>
            <Gauge size={16} className="text-[#047857]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#0F172A]">
            {repliesUsed.toLocaleString('en-IN')}
            <span className="text-sm font-semibold text-[#64748B]"> / {replyQuota.toLocaleString('en-IN')}</span>
          </p>
          <div
            className="w-full bg-[#F8FAFC] h-2 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={quotaPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Reply quota used"
          >
            <div
              className={`h-full rounded-full ${quotaPercent > 90 ? 'bg-rose-500' : 'bg-[#047857]'}`}
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
        </Link>
      </div>

      {/* Recent Leads Preview */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
            <MessageSquare size={16} className="text-[#047857]" />
            Recent Inquiries
          </h2>
          <Link
            href="/dashboard/leads"
            className="text-xs font-semibold text-[#047857] hover:text-[#0F172A] flex items-center gap-1 transition-colors"
          >
            All Leads <ArrowRight size={13} />
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <p className="text-xs text-[#64748B] italic py-8 text-center">
            No customer inquiries yet. Connect your WhatsApp number in Settings to start receiving leads.
          </p>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {recentLeads.map((lead) => (
              <div
                key={String(lead._id)}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#F8FAFC]/30 transition-colors rounded-lg px-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#0F172A]">
                      {lead.name || lead.profileName || 'Customer'}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {lead.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-0.5 truncate max-w-md">
                    {lead.requirement || 'No specific requirement noted'}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                    <Clock size={11} />
                    {lead.lastMessageAt
                      ? new Date(lead.lastMessageAt).toLocaleDateString('en-IN', {
                          timeZone: tenant?.timezone || 'Asia/Kolkata',
                          month: 'short',
                          day: 'numeric',
                        })
                      : ''}
                  </span>
                  <Link
                    href={`/dashboard/leads/${lead._id}`}
                    className="text-xs font-semibold text-[#047857] hover:text-[#0F172A]"
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
