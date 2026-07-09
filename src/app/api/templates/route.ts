import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

    const body = await req.json();
    const { template_name, category, header_type, body_text } = body;

    if (!template_name || !category || !body_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Get Shop's Meta Credentials
    const { data: shop } = await supabase
      .from('shops')
      .select('meta_access_token, meta_business_account_id')
      .eq('id', user.id)
      .single();

    if (!shop || !shop.meta_access_token || !shop.meta_business_account_id) {
      return NextResponse.json({ error: 'Meta Business Account not connected' }, { status: 400 });
    }

    // 2. Prepare Meta API Payload
    const components: any[] = [
      {
        type: 'BODY',
        text: body_text,
      }
    ];

    if (header_type === 'IMAGE') {
      components.unshift({
        type: 'HEADER',
        format: 'IMAGE',
      });
    }

    const metaPayload = {
      name: template_name,
      language: 'en_US', // hardcoded to English for simplicity, can be dynamic
      category: category,
      components,
    };

    // 3. Send to Meta Graph API
    const metaUrl = `https://graph.facebook.com/v17.0/${shop.meta_business_account_id}/message_templates`;
    
    const metaRes = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${shop.meta_access_token}`
      },
      body: JSON.stringify(metaPayload),
    });

    const metaData = await metaRes.json();

    if (!metaRes.ok || metaData.error) {
      console.error('Meta API Error:', metaData.error);
      return NextResponse.json({ error: metaData.error?.message || 'Failed to submit template to Meta' }, { status: 400 });
    }

    // 4. Save to Database
    const { data: template, error: dbError } = await supabase
      .from('message_templates')
      .insert({
        shop_id: user.id,
        template_name: template_name,
        category: category,
        header_type: header_type === 'IMAGE' ? 'IMAGE' : 'NONE',
        body_text: body_text,
        status: metaData.status || 'PENDING', // usually 'PENDING' initially
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB Error:', dbError);
      return NextResponse.json({ error: 'Template submitted but failed to save in database' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: template });

  } catch (error: any) {
    console.error('POST /api/templates error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
