import { notFound } from 'next/navigation';
import { requireTenant } from '@/server/auth/dal';
import { forTenant } from '@/server/repos/tenant';
import LeadConversationClient from './lead-conversation-client';

export const metadata = {
  title: 'Lead Conversation — FrontLoop',
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LeadDetailPage({ params }: PageProps) {
  const session = await requireTenant(['owner', 'staff']);
  const repo = forTenant(session.tenantId);

  const { id } = await params;
  const lead = await repo.getLead(id);

  if (!lead) {
    notFound();
  }

  const [messages, tenant] = await Promise.all([repo.getLeadMessages(id, 100), repo.getTenant()]);

  const serializedLead = {
    id: String(lead._id),
    phone: lead.phone,
    name: lead.name ?? undefined,
    profileName: lead.profileName ?? undefined,
    requirement: lead.requirement ?? undefined,
    intent: lead.intent ?? undefined,
    status: lead.status || 'new',
    botPaused: !!lead.botPaused,
    notes: lead.notes ?? undefined,
    lastInboundAt: lead.lastInboundAt ? new Date(lead.lastInboundAt).toISOString() : undefined,
  };

  const serializedMessages = messages.map((m) => ({
    id: String(m._id),
    direction: m.direction,
    author: m.author,
    body: m.body ?? undefined,
    status: m.status ?? undefined,
    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : undefined,
  }));

  return (
    <LeadConversationClient
      lead={serializedLead}
      messages={serializedMessages}
      timeZone={tenant?.timezone || 'Asia/Kolkata'}
    />
  );
}
