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

    const { prompt, shop_name, image_url } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const systemPrompt = `
You are an elite, modern email marketing copywriter and UI designer.
Your task is to generate a high-converting, visually stunning, and minimalist HTML email template for a retail store named "${shop_name}".

The user's core idea is: "${prompt}"

${image_url ? `The user has provided a hero image URL: ${image_url}. You MUST include this image prominently at the top of the email inside a beautiful, rounded container.` : 'No image was provided. Rely purely on stunning typography and clean spacing.'}

Design Requirements:
- Use inline CSS ONLY (no <style> blocks in head, as some email clients strip them).
- The aesthetic must be extremely premium, minimalist, and modern. Use a clean white or off-white background, sleek dark typography (like #333333 or #1A1A1A), and a primary accent color (e.g., #6366f1 or #10B981) for the main Call-to-Action button.
- Add plenty of padding and whitespace (padding: 40px 20px).
- Use sans-serif fonts (font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif).
- The email should look great on both mobile and desktop (max-width: 600px, margin: 0 auto).
- If an image is provided, ensure it has max-width: 100%, border-radius: 12px, and looks spectacular.
- Include a clear, persuasive CTA button.
- Make the copy persuasive, engaging, and professional.

Return ONLY a valid JSON object with EXACTLY these two keys:
1. "subject" (a short, engaging subject line, optionally with an emoji)
2. "html_body" (the full minimalist, modern HTML email body with inline CSS)

Do NOT output any markdown code fences, backticks, or text explanations. Return raw pure JSON.
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
        }, 8000);

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanText);
            if (parsed.subject && parsed.html_body) return NextResponse.json(parsed);
          }
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
      const groqKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
      if (groqKey) {
        const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({ ...openaiPayload, model: 'llama-3.1-8b-instant' })
        }, 8000);

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed.subject && parsed.html_body) return NextResponse.json(parsed);
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
        }, 8000);

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed.subject && parsed.html_body) return NextResponse.json(parsed);
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
          body: JSON.stringify({ ...openaiPayload, model: 'gemma-4-31b' })
        }, 8000);

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed.subject && parsed.html_body) return NextResponse.json(parsed);
          }
        }
      }
    } catch (e) {
      // Fallback to final error
    }

    throw new Error('All AI API providers failed to generate the email.');

  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
