import { requireTenant } from '@/server/auth/dal';
import { forTenant } from '@/server/repos/tenant';
import KnowledgeBaseClient from './knowledge-client';
import { resolveHandoffKeywords } from '@/lib/bot-defaults';

export const metadata = {
  title: 'Business Knowledge Base | FrontLoop',
};

export default async function KnowledgeBasePage() {
  const session = await requireTenant(['owner', 'staff']);
  const repo = forTenant(session.tenantId);

  const kb = await repo.getKnowledgeBase();

  const serializedData = kb
    ? {
        context: kb.context || '',
        faqs: (kb.faqs || []).map((f) => ({
          question: f.question,
          answer: f.answer,
          enabled: f.enabled !== false,
        })),
        services: (kb.services || []).map((s) => ({
          name: s.name,
          description: s.description || '',
          priceMinor: s.priceMinor ?? undefined,
          currency: s.currency || 'INR',
          durationMin: s.durationMin ?? undefined,
        })),
        hours: {
          weekly: (kb.hours?.weekly || []).map((w) => ({
            day: w.day,
            closed: !!w.closed,
            slots: (w.slots || []).map((s) => ({ open: s.open, close: s.close })),
          })),
        },
        bot: {
          persona: kb.bot?.persona || '',
          fallbackReply: kb.bot?.fallbackReply || '',
          handoffKeywords: resolveHandoffKeywords(kb.bot?.handoffKeywords),
          languages: kb.bot?.languages || ['en'],
          captureFields: (kb.bot?.captureFields || ['name', 'requirement']) as Array<
            'name' | 'requirement' | 'preferred_time' | 'email'
          >,
        },
      }
    : null;

  return <KnowledgeBaseClient initialData={serializedData} />;
}
