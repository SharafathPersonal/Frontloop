import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server misconfiguration: Missing service role key' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if the merchant has at least 1 credit
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('credits_remaining')
      .eq('shop_id', user.id)
      .maybeSingle();

    if (wallet && wallet.credits_remaining < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits for AI status generation. Required: 1 credit.' },
        { status: 403 }
      );
    }

    const { product_name, category, original_price, clearance_price, mode } = await req.json();

    if (!product_name || !clearance_price) {
      return NextResponse.json({ error: 'Product name and clearance price are required' }, { status: 400 });
    }

    const orig = parseFloat(original_price || '0');
    const clear = parseFloat(clearance_price || '0');
    const discountPct = orig > clear && orig > 0 ? Math.round(((orig - clear) / orig) * 100) : 0;

    // Fetch shop details for branding context
    const { data: shopData } = await supabase
      .from('shops')
      .select('shop_name, city')
      .eq('id', user.id)
      .maybeSingle();

    const shopName = shopData?.shop_name || 'Our Store';
    const city = shopData?.city || 'Local Area';

    // ── Mode 1: Product Description & Condition Story Generator ──────────────
    if (mode === 'description') {
      const descriptionPrompt = `
You are a top retail eCommerce copywriter.
Generate a high-converting product description and condition story note for a clearance deal.

Product Details:
- Item / Product Name: ${JSON.stringify(product_name)}
- Category: ${JSON.stringify(category || 'General')}
- Original Price: ₹${orig.toLocaleString('en-IN')}
- Clearance Price: ₹${clear.toLocaleString('en-IN')}
- Discount: ${discountPct}% OFF
- Store Name: ${JSON.stringify(shopName)}

CRITICAL REQUIREMENT:
You MUST explicitly mention the product name "${product_name}" inside BOTH the "description" and the "condition_notes" field.

OUTPUT FORMAT REQUIREMENTS:
Return ONLY a valid JSON object matching this schema:
{
  "description": "2-3 engaging sentences describing ${product_name}, deal urgency, and high value.",
  "condition_notes": "1-2 sentences regarding condition story explicitly mentioning ${product_name} (e.g. Brand new ${product_name} in original factory packaging)."
}
Do NOT output markdown code fences or any extra text outside the JSON object.
`.trim();

      const formatConditionNotes = (notes: string, name: string) => {
        let text = notes ? notes.trim() : '';
        if (!text) {
          return `Brand new ${name} clearance stock in original store condition. Verified and ready for pickup.`;
        }
        if (!text.toLowerCase().includes(name.toLowerCase())) {
          text = `Brand new ${name} — ${text}`;
        }
        return text;
      };

      // Gemini 2.5 Flash Tier
      try {
        if (process.env.GEMINI_API_KEY) {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
          const res = await fetchWithTimeout(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: descriptionPrompt }] }],
              generationConfig: { temperature: 0.5, responseMimeType: "application/json" }
            })
          }, 7000);

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const parsed = JSON.parse(text);
              if (parsed.description || parsed.condition_notes) {
                if (wallet) {
                  await supabaseAdmin.rpc('deduct_credits', { p_shop_id: user.id, p_amount: 1 });
                }
                return NextResponse.json({
                  description: parsed.description || `Get huge savings on ${product_name}! Original price was ₹${orig.toLocaleString('en-IN')}, now available for just ₹${clear.toLocaleString('en-IN')} (${discountPct}% OFF).`,
                  condition_notes: formatConditionNotes(parsed.condition_notes, product_name),
                });
              }
            }
          }
        }
      } catch { /* Fallback */ }

      // Groq Fallback Tier
      try {
        const groqKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
        if (groqKey) {
          const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({
              messages: [{ role: "user", content: descriptionPrompt }],
              model: 'llama-3.1-8b-instant',
              temperature: 0.5,
              response_format: { type: "json_object" }
            })
          }, 7000);

          if (res.ok) {
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content;
            if (text) {
              const parsed = JSON.parse(text);
              if (parsed.description || parsed.condition_notes) {
                if (wallet) {
                  await supabaseAdmin.rpc('deduct_credits', { p_shop_id: user.id, p_amount: 1 });
                }
                return NextResponse.json({
                  description: parsed.description || `Get huge savings on ${product_name}! Original price was ₹${orig.toLocaleString('en-IN')}, now available for just ₹${clear.toLocaleString('en-IN')} (${discountPct}% OFF).`,
                  condition_notes: formatConditionNotes(parsed.condition_notes, product_name),
                });
              }
            }
          }
        }
      } catch { /* Fallback */ }

      // Static Fallback
      return NextResponse.json({
        description: `Get huge savings on ${product_name}! Original price was ₹${orig.toLocaleString('en-IN')}, now available for just ₹${clear.toLocaleString('en-IN')} (${discountPct}% OFF). High demand clearance item available at ${shopName}.`,
        condition_notes: `Brand new ${product_name} clearance dead stock item in original factory condition. Fully verified and ready for pickup or local delivery.`,
      });
    }

    // ── Mode 2: WhatsApp Status Generator (Default) ───────────────────────────
    const systemPrompt = `
You are an expert retail viral copywriter specializing in WhatsApp Status posts for local Indian merchants.
Generate 3 distinct, punchy, high-converting WhatsApp status texts for a clearance deal.

Product Information:
- Item: ${JSON.stringify(product_name)}
- Category: ${JSON.stringify(category || 'General')}
- Original Price: ₹${orig.toLocaleString('en-IN')}
- Clearance Price: ₹${clear.toLocaleString('en-IN')}
- Discount: ${discountPct}% OFF
- Store Name: ${JSON.stringify(shopName)}
- Location: ${JSON.stringify(city)}

Requirements for the 3 options:
1. Option 1: High-energy English with strong emojis, discount highlights, and urgency.
2. Option 2: Catchy Malayalam-English (Manglish) mix popular in Kerala retail marketing (e.g. "Machane Mega Clearance Deal!", "Stock തീരുന്നതിനു മുൻപ് grab cheyyu!").
3. Option 3: Clean, professional, short status post with price callout and direct WhatsApp reply call to action.

OUTPUT FORMAT REQUIREMENTS:
Return ONLY a valid JSON object matching this schema:
{
  "options": [
    "Text option 1 here...",
    "Text option 2 here...",
    "Text option 3 here..."
  ]
}
Do NOT output markdown code fences or any extra text outside the JSON object.
`.trim();

    // Tier 1: Google Gemini 2.5 Flash
    try {
      if (process.env.GEMINI_API_KEY) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const res = await fetchWithTimeout(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { temperature: 0.5, responseMimeType: "application/json" }
          })
        }, 7000);

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed.options) && parsed.options.length > 0) {
              if (wallet) {
                await supabaseAdmin.rpc('deduct_credits', { p_shop_id: user.id, p_amount: 1 });
              }
              return NextResponse.json({ options: parsed.options });
            }
          }
        }
      }
    } catch { /* Fallback */ }

    // Tier 2: Groq Fallback
    try {
      const groqKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
      if (groqKey) {
        const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({
            messages: [{ role: "user", content: systemPrompt }],
            model: 'llama-3.1-8b-instant',
            temperature: 0.5,
            response_format: { type: "json_object" }
          })
        }, 7000);

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed.options) && parsed.options.length > 0) {
              if (wallet) {
                await supabaseAdmin.rpc('deduct_credits', { p_shop_id: user.id, p_amount: 1 });
              }
              return NextResponse.json({ options: parsed.options });
            }
          }
        }
      }
    } catch { /* Fallback */ }

    // Emergency Fallback Options (Zero Credits)
    const fallbackOptions = [
      `🔥 MEGA CLEARANCE SALE at ${shopName}! 😱\n\n🛍️ ${product_name}\n💰 Clearance Price: ₹${clear.toLocaleString('en-IN')}${orig ? ` (Was ₹${orig.toLocaleString('en-IN')})` : ''}\n⚡ Discount: ${discountPct}% OFF!\n\n📍 Visit store at ${city} or reply to this status to book now! 📲`,
      `⚡ Machane Flash Deal from ${shopName}! 💥\n\n${product_name} in stock at just ₹${clear.toLocaleString('en-IN')}! ${discountPct}% OFF deal.\nStock theernnu pokunnathinu munpe WhatsApp status inu reply cheyyu! 🛍️✨`,
      `🛍️ Limited Inventory Clearance!\n\nItem: ${product_name}\nSpecial Price: ₹${clear.toLocaleString('en-IN')} (Save ${discountPct}%)\nLocation: ${shopName}, ${city}.\n\n👉 Direct message us on WhatsApp to order today!`
    ];

    return NextResponse.json({ options: fallbackOptions });

  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
