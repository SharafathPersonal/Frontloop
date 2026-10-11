import 'server-only';
import { getEnv } from './env';

export interface AIPipelineInput {
  tenantName: string;
  tenantCategory: string;
  kbContext?: string;
  faqs?: Array<{ question: string; answer: string }>;
  services?: Array<{ name: string; description?: string; priceMinor?: number }>;
  botPersona?: string;
  botFallbackReply?: string;
  botCaptureFields?: string[];
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  latestCustomerMessage: string;
  customerProfileName?: string;
  customerPhone: string;
}

export interface AIPipelineOutput {
  replyText: string;
  extractedName?: string;
  extractedRequirement?: string;
  extractedIntent?: 'enquiry' | 'booking' | 'pricing' | 'admission' | 'complaint' | 'other';
  providerUsed: 'gemini' | 'groq' | 'cerebras' | 'fallback';
}

function buildPrompt(input: AIPipelineInput): { systemPrompt: string; userPrompt: string } {
  const faqsText = (input.faqs || [])
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join('\n\n');

  const servicesText = (input.services || [])
    .map(
      (s) =>
        `- ${s.name}: ${s.description || 'N/A'}${
          s.priceMinor != null ? ` (Price: ₹${s.priceMinor / 100})` : ''
        }`,
    )
    .join('\n');

  const systemPrompt = `You are an automated WhatsApp customer service AI representative for "${input.tenantName}", a ${input.tenantCategory} business.

${input.botPersona ? `Persona & Voice: ${input.botPersona}` : 'Voice: Friendly, professional, concise, helpful, and natural on WhatsApp.'}

Business Knowledge Base:
${input.kbContext ? `Context:\n${input.kbContext}\n` : ''}
${servicesText ? `Services / Products Offered:\n${servicesText}\n` : ''}
${faqsText ? `Frequently Asked Questions:\n${faqsText}\n` : ''}

Key Instructions:
1. Always keep your response concise, polite, and suitable for WhatsApp (1-3 short paragraphs or bullet points).
2. Answer queries accurately based on the business knowledge base above. If unsure, politely guide them or mention an agent will follow up.
3. If capture fields are requested (${(input.botCaptureFields || ['name', 'requirement']).join(', ')}), gently gather missing information if natural to do so.
4. Output your response STRICTLY as a JSON object matching this schema:
{
  "replyText": "your whatsapp reply string here",
  "extractedName": "customer name if known or extracted, else null",
  "extractedRequirement": "brief summary of customer need/request if extracted, else null",
  "extractedIntent": "enquiry" | "booking" | "pricing" | "admission" | "complaint" | "other"
}
Do not wrap in markdown quotes if possible, output valid raw JSON only.`;

  const historyLines = input.conversationHistory
    .map((h) => `${h.role === 'user' ? 'Customer' : 'Bot'}: ${h.content}`)
    .join('\n');

  const userPrompt = `Conversation History:
${historyLines ? historyLines : '(No prior messages)'}

Incoming Message from ${input.customerProfileName || 'Customer'} (+${input.customerPhone}):
"${input.latestCustomerMessage}"

Generate your response JSON:`;

  return { systemPrompt, userPrompt };
}

function parseAIResponse(raw: string, provider: 'gemini' | 'groq' | 'cerebras'): AIPipelineOutput | null {
  try {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(clean);
    if (!parsed || typeof parsed.replyText !== 'string' || !parsed.replyText.trim()) {
      return null;
    }

    const validIntents = ['enquiry', 'booking', 'pricing', 'admission', 'complaint', 'other'] as const;
    const intent = validIntents.includes(parsed.extractedIntent) ? parsed.extractedIntent : 'enquiry';

    return {
      replyText: parsed.replyText.trim(),
      extractedName: typeof parsed.extractedName === 'string' && parsed.extractedName.trim() ? parsed.extractedName.trim() : undefined,
      extractedRequirement: typeof parsed.extractedRequirement === 'string' && parsed.extractedRequirement.trim() ? parsed.extractedRequirement.trim() : undefined,
      extractedIntent: intent,
      providerUsed: provider,
    };
  } catch {
    return null;
  }
}

async function callGemini(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 800,
      },
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Gemini API returned status ${res.status}`);
  }

  const json = await res.json();
  const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof candidate === 'string' ? candidate : null;
}

async function callOpenAICompatible(
  endpoint: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<string | null> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`${model} API returned status ${res.status}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;
  return typeof text === 'string' ? text : null;
}

/**
 * Executes multi-tier LLM generation with fallback:
 * Tier 1: Gemini 1.5 Flash (via direct Google REST)
 * Tier 2: Groq (llama-3.3-70b-versatile)
 * Tier 3: Cerebras (llama-3.3-70b)
 * Tier 4: Safe business fallback reply string
 */
export async function generateAIReply(input: AIPipelineInput): Promise<AIPipelineOutput> {
  const env = getEnv();
  const { systemPrompt, userPrompt } = buildPrompt(input);

  // Tier 1: Gemini
  if (env.GEMINI_API_KEY) {
    try {
      const raw = await callGemini(systemPrompt, userPrompt, env.GEMINI_API_KEY);
      if (raw) {
        const parsed = parseAIResponse(raw, 'gemini');
        if (parsed) return parsed;
      }
    } catch (err) {
      console.warn('[AI Pipeline] Tier 1 (Gemini) failed, falling back to Tier 2:', err instanceof Error ? err.message : err);
    }
  }

  // Tier 2: Groq
  if (env.GROQ_API_KEY) {
    try {
      const raw = await callOpenAICompatible(
        'https://api.groq.com/openai/v1/chat/completions',
        'llama-3.3-70b-versatile',
        systemPrompt,
        userPrompt,
        env.GROQ_API_KEY,
      );
      if (raw) {
        const parsed = parseAIResponse(raw, 'groq');
        if (parsed) return parsed;
      }
    } catch (err) {
      console.warn('[AI Pipeline] Tier 2 (Groq) failed, falling back to Tier 3:', err instanceof Error ? err.message : err);
    }
  }

  // Tier 3: Cerebras
  if (env.CEREBRAS_API_KEY) {
    try {
      const raw = await callOpenAICompatible(
        'https://api.cerebras.ai/v1/chat/completions',
        'llama3.3-70b',
        systemPrompt,
        userPrompt,
        env.CEREBRAS_API_KEY,
      );
      if (raw) {
        const parsed = parseAIResponse(raw, 'cerebras');
        if (parsed) return parsed;
      }
    } catch (err) {
      console.warn('[AI Pipeline] Tier 3 (Cerebras) failed:', err instanceof Error ? err.message : err);
    }
  }

  // Tier 4: Fallback
  const fallback = input.botFallbackReply || 'Thank you for reaching out! Our team will get back to you shortly.';
  return {
    replyText: fallback,
    providerUsed: 'fallback',
  };
}

