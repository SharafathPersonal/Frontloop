import { requireTenant } from '@/server/auth/dal';
import { decodeLeadCursor, encodeLeadCursor, forTenant } from '@/server/repos/tenant';
import LeadsTableClient from './leads-table-client';
import { LEAD_STATUSES, type LeadStatus } from '@/server/models/Lead';
import { NEEDS_HUMAN_FILTER } from './filters';

export const metadata = {
  title: 'Customer Leads | FrontLoop',
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    cursor?: string;
  }>;
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const session = await requireTenant(['owner', 'staff']);
  const repo = forTenant(session.tenantId);

  const params = await searchParams;
  const needsHuman = params.status === NEEDS_HUMAN_FILTER;
  const statusFilter = LEAD_STATUSES.includes(params.status as LeadStatus)
    ? (params.status as LeadStatus)
    : undefined;
  const searchFilter = params.search?.trim();

  const [tenant, { leads, totalCount, nextCursor }] = await Promise.all([
    repo.getTenant(),
    repo.listLeads({
      status: statusFilter,
      needsHuman,
      searchPhone: searchFilter,
      cursor: decodeLeadCursor(params.cursor) ?? undefined,
      limit: 50,
    }),
  ]);

  const serializedLeads = leads.map((l) => ({
    id: String(l._id),
    phone: l.phone,
    name: l.name ?? undefined,
    profileName: l.profileName ?? undefined,
    requirement: l.requirement ?? undefined,
    intent: l.intent ?? undefined,
    status: l.status || 'new',
    botPaused: !!l.botPaused,
    source: l.source ?? 'whatsapp',
    messageCount: l.messageCount ?? 0,
    lastMessageAt: l.lastMessageAt ? new Date(l.lastMessageAt).toISOString() : undefined,
    createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : undefined,
  }));

  return (
    <LeadsTableClient
      // Remount on every filter/page change so client state re-seeds from fresh server data.
      key={`${needsHuman ? NEEDS_HUMAN_FILTER : (statusFilter ?? 'all')}|${searchFilter ?? ''}|${params.cursor ?? ''}`}
      initialLeads={serializedLeads}
      totalCount={totalCount}
      currentStatus={needsHuman ? NEEDS_HUMAN_FILTER : (statusFilter ?? 'all')}
      currentSearch={searchFilter}
      nextCursor={nextCursor ? encodeLeadCursor(nextCursor) : null}
      isPaged={Boolean(params.cursor)}
      timeZone={tenant?.timezone || 'Asia/Kolkata'}
    />
  );
}
