import { Activity, Building2, CreditCard, Database, MessageSquare, Smartphone } from 'lucide-react';
import { getPlatformOverview, type HealthLevel } from '@/server/repos/platform';
import { PLAN_CONFIG, PLAN_KEYS } from '@/lib/plans';

export const dynamic = 'force-dynamic';

const IST = 'Asia/Kolkata';
const num = (n: number) => n.toLocaleString('en-IN');

const HEALTH_STYLES: Record<HealthLevel, { label: string; className: string }> = {
  ok: { label: 'Healthy', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  warn: { label: 'Degraded', className: 'bg-amber-50 text-amber-900 border-amber-200' },
  down: { label: 'Action needed', className: 'bg-rose-50 text-rose-800 border-rose-200' },
};

function formatAge(ms: number | null): string {
  if (ms == null) return 'none waiting';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return `${Math.max(0, Math.round(ms / 1000))}s`;
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function StatCard({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-2">
      <div className="flex items-center justify-between text-[#64748B]">
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        <span className="text-[#047857]" aria-hidden="true">{icon}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{value}</p>
      {hint && <p className="text-[11px] text-[#64748B]">{hint}</p>}
    </div>
  );
}

function HealthBadge({ level }: { level: HealthLevel }) {
  const style = HEALTH_STYLES[level];
  return (
    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${style.className}`}>
      {style.label}
    </span>
  );
}

export default async function AdminOverviewPage() {
  const o = await getPlatformOverview();

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Platform Overview</h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">Live figures across every workspace.</p>
        </div>
        <p className="text-[11px] text-[#64748B]">
          Generated {o.generatedAt.toLocaleString('en-IN', { timeZone: IST, dateStyle: 'medium', timeStyle: 'short' })} IST
        </p>
      </div>

      <section aria-labelledby="tenants-heading" className="space-y-4">
        <h2 id="tenants-heading" className="text-sm font-bold uppercase tracking-wider text-[#0F172A]">Workspaces</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard label="Total tenants" value={num(o.tenants.total)} icon={<Building2 size={16} />} />
          <StatCard
            label="Active trials"
            value={num(o.tenants.activeTrials)}
            hint={`${num(o.tenants.expiredTrials)} trials ended without paying`}
            icon={<Activity size={16} />}
          />
          <StatCard
            label="Paying"
            value={num(o.tenants.paidTotal)}
            hint="Active plan with an unexpired period"
            icon={<CreditCard size={16} />}
          />
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">Paying by plan</p>
            <dl className="space-y-1.5 text-sm">
              {PLAN_KEYS.map((key) => (
                <div key={key} className="flex justify-between">
                  <dt className="text-[#64748B]">{PLAN_CONFIG[key].name.replace(/ Plan$/, '')}</dt>
                  <dd className="font-bold text-[#0F172A]">{num(o.tenants.paidByPlan[key])}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section aria-labelledby="messages-heading" className="space-y-4">
        <h2 id="messages-heading" className="text-sm font-bold uppercase tracking-wider text-[#0F172A]">Messaging</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            label="Messages stored"
            value={num(o.messages.totalEstimated)}
            hint="All time, estimated"
            icon={<MessageSquare size={16} />}
          />
          <StatCard
            label="Inbound, 24 h"
            value={num(o.messages.inbound24h)}
            hint={`${num(o.messages.aiReplies24h)} AI replies, ${num(o.messages.agentReplies24h)} staff replies`}
            icon={<MessageSquare size={16} />}
          />
          <StatCard
            label="Failed replies, 24 h"
            value={num(o.messages.failed24h)}
            hint={`${num(o.messages.pending)} pending, ${num(o.messages.processing)} processing now`}
            icon={<Activity size={16} />}
          />
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-[#64748B] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">WhatsApp numbers</span>
              <Smartphone size={16} className="text-[#047857]" aria-hidden="true" />
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#64748B]">Connected</dt>
                <dd className="font-bold text-[#0F172A]">{num(o.whatsapp.connected)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#64748B]">Error</dt>
                <dd className={`font-bold ${o.whatsapp.error > 0 ? 'text-rose-700' : 'text-[#0F172A]'}`}>{num(o.whatsapp.error)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#64748B]">Not connected</dt>
                <dd className="font-bold text-[#0F172A]">{num(o.whatsapp.disconnected)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section aria-labelledby="health-heading" className="space-y-4">
        <h2 id="health-heading" className="text-sm font-bold uppercase tracking-wider text-[#0F172A]">System health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
                <Database size={16} className="text-[#047857]" aria-hidden="true" /> MongoDB
              </span>
              <HealthBadge level={o.health.database.level} />
            </div>
            <p className="text-xs text-[#64748B]">
              {o.health.database.latencyMs != null
                ? `Ping answered in ${o.health.database.latencyMs} ms.`
                : 'Ping failed. Check the Atlas cluster status and network access list.'}
            </p>
          </div>
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
                <Activity size={16} className="text-[#047857]" aria-hidden="true" /> Reply sweeper
              </span>
              <HealthBadge level={o.health.sweeper.level} />
            </div>
            <p className="text-xs text-[#64748B]">
              {o.health.sweeper.detail} Oldest pending reply: {formatAge(o.health.sweeper.oldestPendingAgeMs)}. Stalled
              processing: {num(o.health.sweeper.stalledProcessing)}.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="recent-heading" className="space-y-4">
        <h2 id="recent-heading" className="text-sm font-bold uppercase tracking-wider text-[#0F172A]">Newest workspaces</h2>
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] tracking-wider uppercase text-[#64748B]">
              <tr>
                <th scope="col" className="py-3 px-4 font-bold">Business</th>
                <th scope="col" className="py-3 px-4 font-bold">Plan</th>
                <th scope="col" className="py-3 px-4 font-bold">Status</th>
                <th scope="col" className="py-3 px-4 font-bold">WhatsApp</th>
                <th scope="col" className="py-3 px-4 font-bold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {o.recentTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#64748B] italic">No workspaces yet.</td>
                </tr>
              ) : (
                o.recentTenants.map((t) => (
                  <tr key={t.id}>
                    <td className="py-3 px-4">
                      <p className="font-bold text-[#0F172A]">{t.name}</p>
                      <p className="text-[11px] text-[#64748B] capitalize">{t.category}</p>
                    </td>
                    <td className="py-3 px-4 capitalize">{t.plan}</td>
                    <td className="py-3 px-4 capitalize">{t.status.replace('_', ' ')}</td>
                    <td className="py-3 px-4 capitalize">{t.whatsappStatus}</td>
                    <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                      {t.createdAt ? t.createdAt.toLocaleDateString('en-IN', { timeZone: IST, dateStyle: 'medium' }) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
