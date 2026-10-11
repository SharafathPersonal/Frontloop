'use server';

import { requireTenant } from '@/server/auth/dal';
import { rateLimit } from '@/server/rate-limit';
import {
  forTenant,
  type KnowledgeBaseInput,
  type SaveKnowledgeBaseResult,
} from '@/server/repos/tenant';
import { generateAIReply, type AIPipelineOutput } from '@/server/ai-pipeline';
import { describeBusinessHours } from '@/server/business-hours';
import { revalidatePath } from 'next/cache';

export async function saveKnowledgeBaseAction(input: KnowledgeBaseInput): Promise<SaveKnowledgeBaseResult> {
  const session = await requireTenant(['owner', 'staff']);
  const repo = forTenant(session.tenantId);

  try {
    const result = await repo.saveKnowledgeBase(input);
    if (result.ok) revalidatePath('/dashboard/knowledge');
    return result;
  } catch (err: unknown) {
    console.error('saveKnowledgeBaseAction failed', { tenantId: session.tenantId, err });
    return { ok: false, error: 'Could not save the knowledge base. Please try again.' };
  }
}

/**
 * Runs the production prompt against the saved knowledge base. No WhatsApp
 * dispatch, no Message/Lead writes, no quota consumption.
 */
export async function testBotSimulationAction(
  message: string,
  customerName?: string,
): Promise<{ ok: boolean; output?: AIPipelineOutput; error?: string }> {
  const session = await requireTenant(['owner', 'staff']);
  const repo = forTenant(session.tenantId);

  if (typeof message !== 'string' || !message.trim() || message.length > 1000) {
    return { ok: false, error: 'Test message must be 1–1,000 characters' };
  }
  // Each simulation is a paid LLM call; cap it like any other public endpoint.
  if (!(await rateLimit(`sandbox:${session.tenantId}`, 20, 60))) {
    return { ok: false, error: 'Too many test messages — wait a minute and try again.' };
  }

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
        priceMinor: s.priceMinor ?? undefined,
        currency: s.currency || 'INR',
        durationMin: s.durationMin ?? undefined,
      })),
      businessHours: describeBusinessHours(kb?.hours, tenant?.timezone || 'Asia/Kolkata'),
      botPersona: kb?.bot?.persona || undefined,
      botFallbackReply: kb?.bot?.fallbackReply || undefined,
      botCaptureFields: kb?.bot?.captureFields || ['name', 'requirement'],
      conversationHistory: [],
      latestCustomerMessage: message,
      customerProfileName: typeof customerName === 'string' ? customerName.slice(0, 120) : 'Sandbox User',
    });

    return { ok: true, output };
  } catch (err: unknown) {
    console.error('testBotSimulationAction failed', { tenantId: session.tenantId, err });
    return { ok: false, error: 'Bot simulation failed. Please try again.' };
  }
}

