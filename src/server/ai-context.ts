import 'server-only';
import type { AIPipelineInput } from './ai-pipeline';
import { describeBusinessHours } from './business-hours';
import type { KnowledgeBaseDoc } from './models/KnowledgeBase';

/** The tenant + knowledge-base half of an AI prompt, shared by the WhatsApp worker and web chat. */
export function knowledgeContext(
  tenant: { name: string; category: string; timezone?: string | null },
  kb: KnowledgeBaseDoc | null | undefined,
): Omit<AIPipelineInput, 'conversationHistory' | 'latestCustomerMessage' | 'customerProfileName'> {
  return {
    tenantName: tenant.name,
    tenantCategory: tenant.category,
    kbContext: kb?.context || '',
    faqs: (kb?.faqs || []).filter((f) => f.enabled !== false).map((f) => ({ question: f.question, answer: f.answer })),
    services: (kb?.services || []).map((s) => ({
      name: s.name,
      description: s.description || undefined,
      priceMinor: s.priceMinor ?? undefined,
      currency: s.currency || 'INR',
      durationMin: s.durationMin ?? undefined,
    })),
    businessHours: describeBusinessHours(kb?.hours, tenant.timezone || 'Asia/Kolkata'),
    botPersona: kb?.bot?.persona || undefined,
    botFallbackReply: kb?.bot?.fallbackReply || undefined,
    botCaptureFields: kb?.bot?.captureFields || ['name', 'requirement'],
  };
}
