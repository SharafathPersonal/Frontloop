import { requireTenant } from '@/server/auth/dal';
import { forTenant } from '@/server/repos/tenant';
import LeadsTableClient from './leads-table-client';
import type { LeadStatus } from '@/server/models/Lead';

export const metadata = {
  title: 'Customer Leads — True Attendly',
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const session = await requireTenant(['owner', 'staff']);
  const repo = forTenant(session.tenantId);

  const params = await searchParams;
  const statusFilter =
    params.status && params.status !== 'all' ? (params.status as LeadStatus) : undefined;
  const searchFilter = params.search?.trim();

  const { leads, totalCount } = await repo.listLeads({
    status: statusFilter,
    searchPhone: searchFilter,
    limit: 50,
  });

  const serializedLeads = leads.map((l) => ({
    id: String(l._id),
    phone: l.phone,
    name: l.name ?? undefined,
    profileName: l.profileName ?? undefined,
    requirement: l.requirement ?? undefined,
    intent: l.intent ?? undefined,
    status: l.status || 'new',
    botPaused: !!l.botPaused,
    messageCount: l.messageCount ?? 0,
    lastMessageAt: l.lastMessageAt ? new Date(l.lastMessageAt).toISOString() : undefined,
    createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : undefined,
  }));

  return (
    <LeadsTableClient
      initialLeads={serializedLeads}
      totalCount={totalCount}
      currentStatus={params.status}
      currentSearch={params.search}
    />
  );
}
