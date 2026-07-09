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
      .select('meta_access_token, meta_business_account_id, whatsapp_mode')
      .eq('id', user.id)
      .single();

    if (!shop || !shop.meta_access_token || !shop.meta_business_account_id) {
      console.error("Template API Fail: Missing Meta Token or WABA ID for User:", user.id);
      return NextResponse.json({ 
        success: false, 
        error: "Your Facebook connection is active, but your WhatsApp Business Account ID or Access Token could not be retrieved from the database. Please re-authenticate via Facebook in Settings to sync your profile variables." 
      }, { status: 400 });
    }

    if (shop.whatsapp_mode !== 'META_API') {
      return NextResponse.json({ 
        success: false, 
        error: "Your workspace is not configured for Meta API. Please switch to Meta Official API in Settings." 
      }, { status: 400 });
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
    const metaUrl = `https://graph.facebook.com/v20.0/${shop.meta_business_account_id}/message_templates`;
    
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

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
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
    const { id, category, header_type, body_text } = body;

    if (!id || !category || !body_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Retrieve template from database
    const { data: template, error: fetchError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .eq('shop_id', user.id)
      .single();

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found or unauthorized' }, { status: 404 });
    }

    // Get Shop's Meta Credentials
    const { data: shop } = await supabase
      .from('shops')
      .select('meta_access_token, meta_business_account_id, whatsapp_mode')
      .eq('id', user.id)
      .single();

    if (!shop) {
      return NextResponse.json({ error: 'Shop profile not found' }, { status: 404 });
    }

    if (shop.whatsapp_mode === 'META_API') {
      if (!shop.meta_access_token || !shop.meta_business_account_id) {
        return NextResponse.json({ error: 'Missing Meta WABA configuration' }, { status: 400 });
      }

      // 1. Get the template's Meta ID by querying Meta API with the template name
      const getTemplatesUrl = `https://graph.facebook.com/v20.0/${shop.meta_business_account_id}/message_templates?name=${template.template_name}`;
      const getTemplatesRes = await fetch(getTemplatesUrl, {
        headers: {
          'Authorization': `Bearer ${shop.meta_access_token}`
        }
      });

      const getTemplatesData = await getTemplatesRes.json();
      let metaTemplateId = null;

      if (getTemplatesRes.ok && getTemplatesData.data && getTemplatesData.data.length > 0) {
        metaTemplateId = getTemplatesData.data[0].id;
      }

      // 2. Prepare payload components
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

      if (metaTemplateId) {
        // 3. Edit the existing template using POST /v20.0/{template-id}
        const editUrl = `https://graph.facebook.com/v20.0/${metaTemplateId}`;
        const editRes = await fetch(editUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${shop.meta_access_token}`
          },
          body: JSON.stringify({
            category: category,
            components: components
          })
        });

        const editData = await editRes.json();
        if (!editRes.ok || editData.error) {
          console.error('Meta API Edit Error:', editData.error);
          return NextResponse.json({ error: editData.error?.message || 'Failed to update template on Meta' }, { status: 400 });
        }
      } else {
        // 4. Fallback: if not found on Meta, re-create it by posting to the list endpoint
        const createUrl = `https://graph.facebook.com/v20.0/${shop.meta_business_account_id}/message_templates`;
        const createRes = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${shop.meta_access_token}`
          },
          body: JSON.stringify({
            name: template.template_name,
            language: 'en_US',
            category: category,
            components: components
          })
        });

        const createData = await createRes.json();
        if (!createRes.ok || createData.error) {
          console.error('Meta API Fallback Create Error:', createData.error);
          return NextResponse.json({ error: createData.error?.message || 'Failed to submit template to Meta' }, { status: 400 });
        }
      }
    }

    // Update database row
    const { data: updatedTemplate, error: dbError } = await supabase
      .from('message_templates')
      .update({
        category: category,
        header_type: header_type === 'IMAGE' ? 'IMAGE' : 'NONE',
        body_text: body_text,
        status: 'PENDING', // Instantly change the template status back to 'PENDING'
      })
      .eq('id', id)
      .eq('shop_id', user.id)
      .select()
      .single();

    if (dbError) {
      console.error('DB Update Error:', dbError);
      return NextResponse.json({ error: 'Failed to update template in database' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: updatedTemplate });

  } catch (error: any) {
    console.error('PUT /api/templates error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing template ID' }, { status: 400 });
    }

    const cookieStore = await cookies();
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

    // Retrieve the template from DB to verify ownership and get name
    const { data: template, error: fetchError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .eq('shop_id', user.id)
      .single();

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found or unauthorized' }, { status: 404 });
    }

    // Get shop configuration to check mode
    const { data: shop } = await supabase
      .from('shops')
      .select('meta_access_token, meta_business_account_id, whatsapp_mode')
      .eq('id', user.id)
      .single();

    if (shop && shop.whatsapp_mode === 'META_API') {
      if (shop.meta_access_token && shop.meta_business_account_id) {
        // Trigger Meta API delete endpoint
        const metaUrl = `https://graph.facebook.com/v20.0/${shop.meta_business_account_id}/message_templates?name=${template.template_name}`;
        const metaRes = await fetch(metaUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${shop.meta_access_token}`
          }
        });

        const metaData = await metaRes.json();
        if (!metaRes.ok) {
          console.warn('Meta API Delete Warning:', metaData.error);
        }
      }
    }

    // Wipe row from database
    const { error: dbError } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id)
      .eq('shop_id', user.id);

    if (dbError) {
      console.error('DB Delete Error:', dbError);
      return NextResponse.json({ error: 'Failed to delete template from database' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, success: true });

  } catch (error: any) {
    console.error('DELETE /api/templates error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
