import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
};

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* noop */ }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate Limiting (Phase 2)
    try {
      const { data: limitData, error: limitError } = await supabase
        .from('user_rate_limits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const now = new Date();
      if (limitData) {
        const windowStart = new Date(limitData.window_start);
        const isWithinWindow = (now.getTime() - windowStart.getTime()) < 60000;
        
        if (isWithinWindow) {
          if (limitData.request_count >= 10) {
            return NextResponse.json({ error: 'Rate limit exceeded (10 requests per minute)' }, { status: 429 });
          }
          await supabase.from('user_rate_limits').update({
            request_count: limitData.request_count + 1,
            updated_at: now.toISOString()
          }).eq('user_id', user.id);
        } else {
          await supabase.from('user_rate_limits').update({
            request_count: 1,
            window_start: now.toISOString(),
            updated_at: now.toISOString()
          }).eq('user_id', user.id);
        }
      } else if (!limitError) {
        await supabase.from('user_rate_limits').insert({
          user_id: user.id,
          request_count: 1,
          window_start: now.toISOString(),
          updated_at: now.toISOString()
        });
      }
    } catch (e) {
      // Gracefully bypass limit checks to allow standard service if database checks fail
    }

    const { raw_message, shop_name, industry_type, selected_tone } = await req.json();

    const systemPrompt = `
You are an expert AI copywriter for WhatsApp anti-ban marketing. Your objective is to take the user's raw message and convert it into a "Spintax" format so that each message sent is slightly unique, drastically lowering spam-detection risk.

Spintax format uses curly braces and vertical bars for variations. Example:
"{Hi|Hello|Hey} {{1}}, {thank you for|we appreciate} your business!"

CRITICAL VARIABLE RULES (Meta Graph API Requirements):
1. Variables MUST be strictly formatted as {{1}}, {{2}}, {{3}}, etc.
2. Variables MUST start at {{1}}. Do NOT use {{0}}.
3. Variables MUST be sequential. (If you use {{1}} and {{3}}, you MUST also use {{2}}).
4. Do NOT use named variables like {{name}} or add spaces like {{ 1 }}. If the user provides invalid variables like {{name}} or [Name], you MUST automatically convert them to the correct format ({{1}}, {{2}}, etc.).
5. If the original message has variables, you must retain exactly the same number of variables.
6. Make sure to keep {{1}}, {{2}} placeholders intact. DO NOT nest Spintax inside them.
7. Variables CANNOT be the first or last word of the message. Punctuation (like periods or commas) DOES NOT count as text. For example, 'from {{2}}.' is INVALID because the variable is at the end. You MUST add actual words before the first variable and after the last variable (e.g., '{Hello|Hi} {{1}},', '{Best regards|Thanks}, {{2}}').

Input Data Matrices:
- Business Category / Industry: "${industry_type}"
- Selected Marketing Tone: "${selected_tone || 'Friendly'}"
- Raw Offer/Message Input: "${raw_message}"

Strict Output Layout Rules:
- Return ONLY a valid, parseable JSON structure matching this model schema: { "spintax_message": "your_generated_spintax_here" }
- Do NOT output any markdown code fences, backticks, or text explanations. Return raw pure JSON.
`.trim();

    // Tier 1: Google Gemini
    try {
      if (process.env.GEMINI_API_KEY) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const res = await fetchWithTimeout(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
          })
        }, 6000);

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed.spintax_message) {
              return NextResponse.json(parsed);
            }
          }
        } else if (res.status === 429) {
          throw new Error('Gemini Rate Limited');
        }
      }
    } catch (e) {
      // Fallback to Tier 2
    }

    const openaiPayload = {
      messages: [{ role: "user", content: systemPrompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    };

    // Tier 2: Groq
    try {
      if (process.env.GROQ_API_KEY) {
        const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          },
          body: JSON.stringify({ ...openaiPayload, model: 'llama-3.1-8b-instant' })
        }, 6000);

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed.spintax_message) return NextResponse.json(parsed);
          }
        }
      }
    } catch (e) {
      // Fallback to Tier 3
    }

    // Tier 3: SambaNova
    try {
      if (process.env.SAMBANOVA_API_KEY) {
        const res = await fetchWithTimeout('https://api.sambanova.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SAMBANOVA_API_KEY}`
          },
          body: JSON.stringify({ ...openaiPayload, model: 'Meta-Llama-3.1-70B-Instruct' })
        }, 6000);

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed.spintax_message) return NextResponse.json(parsed);
          }
        }
      }
    } catch (e) {
      // Fallback to Tier 4
    }

    // Tier 4: Cerebras
    try {
      if (process.env.CEREBRAS_API_KEY) {
        const res = await fetchWithTimeout('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`
          },
          body: JSON.stringify({ ...openaiPayload, model: 'llama3.1-70b' })
        }, 6000);

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed.spintax_message) return NextResponse.json(parsed);
          }
        }
      }
    } catch (e) {
      // Fallback to Tier 5
    }

    // Tier 5: Emergency Local Fallback Template
    const basicFallback = "{Hello|Hi|Greetings} {{1}},\n\n{Exclusive update|Great news} from {{2}}!\n\n" + (raw_message || "") + "\n\n{Don't miss out|Act now}! {Contact us|Reply} today.";
    return NextResponse.json({ spintax_message: basicFallback });

  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
