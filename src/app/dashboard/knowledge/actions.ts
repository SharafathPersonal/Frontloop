'use server';

import { requireTenant } from '@/server/auth/dal';
import { forTenant, type KnowledgeBaseInput } from '@/server/repos/tenant';
import { generateAIReply, type AIPipelineOutput } from '@/server/ai-pipeline';
import { revalidatePath } from 'next/cache';

export async function saveKnowledgeBaseAction(input: KnowledgeBaseInput) {
  const session = await requireTenant(['owner', 'staff']);
  const repo = forTenant(session.tenantId);

  try {
    const updated = await repo.saveKnowledgeBase(input);
    revalidatePath('/dashboard/knowledge');
    return { ok: true, data: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save knowledge base';
    return { ok: false, error: message };
  }
}

export async function testBotSimulationAction(
  message: string,
  customerName?: string,
): Promise<{ ok: boolean; output?: AIPipelineOutput; error?: string }> {
  const session = await requireTenant(['owner', 'staff']);
  const repo = forTenant(session.tenantId);

  try {
    const [kb, tenant] = await Promise.all([
      repo.getKnowledgeBase(),
      repo.getTenant(),
    ]);

    const enabledFaqs = (kb?.faqs || [])
      .filter((f) => f.enabled !== false)
      .map((f) => ({ question: f.question, answer: f.answer }));

    const output = await generateAIReply({
      tenantName: tenant?.name || 'My Business',
      tenantCategory: tenant?.category || 'business',
      kbContext: kb?.context || '',
      faqs: enabledFaqs,
      services: (kb?.services || []).map((s) => ({
        name: s.name,
        description: s.description || undefined,
        priceMinor: s.priceMinor || undefined,
      })),
      botPersona: kb?.bot?.persona || undefined,
      botFallbackReply: kb?.bot?.fallbackReply || undefined,
      botCaptureFields: kb?.bot?.captureFields || ['name', 'requirement'],
      conversationHistory: [],
      latestCustomerMessage: message,
      customerProfileName: customerName || 'Sandbox User',
      customerPhone: '919876543210',
    });

    return { ok: true, output };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bot simulation failed';
    return { ok: false, error: message };
  }
}

