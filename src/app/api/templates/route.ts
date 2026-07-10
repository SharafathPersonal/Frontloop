import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function uploadMediaToMeta(imageUrl: string, wabaId: string, accessToken: string): Promise<string> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
  }

  const mimeType = imgRes.headers.get('content-type') || '';
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(mimeType)) {
    throw new Error(`Invalid media type: ${mimeType}. Only PNG, JPG, and JPEG are supported.`);
  }

  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const fileLength = buffer.length;

  if (fileLength > 5 * 1024 * 1024) {
    throw new Error(`File size too large: ${(fileLength / 1024 / 1024).toFixed(2)}MB. Maximum size is 5MB.`);
  }

  const fileName = imageUrl.split('/').pop() || 'sample.png';

  const initUrl = `https://graph.facebook.com/v20.0/${wabaId}/uploads` +
    `?file_name=${encodeURIComponent(fileName)}` +
    `&file_length=${fileLength}` +
    `&file_type=${encodeURIComponent(mimeType)}`;
  
  const initRes = await fetch(initUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!initRes.ok) {
    const errData = await initRes.json().catch(() => ({}));
    throw new Error(`Meta Upload Session Init failed: ${errData.error?.message || initRes.statusText}`);
  }

  const { id: sessionId } = await initRes.json();

  const uploadUrl = `https://graph.facebook.com/v20.0/${sessionId}`;
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `OAuth ${accessToken}`,
      'file_offset': '0',
      'Content-Type': 'application/octet-stream'
    },
    body: buffer
  });

  if (!uploadRes.ok) {
    const errData = await uploadRes.json().catch(() => ({}));
    throw new Error(`Meta Upload File failed: ${errData.error?.message || uploadRes.statusText}`);
  }

  const { h: handle } = await uploadRes.json();
  if (!handle) {
    throw new Error('Meta Upload returned no file handle ID.');
  }

  return handle;
}

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

    // 1. Get Shop's Meta Connection Mode
    const { data: shop } = await supabase
      .from('shops')
      .select('whatsapp_mode')
      .eq('id', user.id)
      .single();

    if (!shop || shop.whatsapp_mode !== 'META_API') {
      return NextResponse.json({ 
        success: false, 
        error: "Your workspace is not configured for Meta API. Please switch to Meta Official API in Settings." 
      }, { status: 400 });
    }

    // 1b. Get Shop's Meta Credentials from meta_configs
    const { data: metaConfig, error: configError } = await supabase
      .from('meta_configs')
      .select('meta_access_token, meta_business_id')
      .eq('shop_id', user.id)
      .single();

    if (!metaConfig?.meta_access_token || !metaConfig?.meta_business_id) {
      console.error("[META_SUBMIT_ERROR] Missing token or WABA ID in meta_configs for shop:", user.id);
      return NextResponse.json({ 
        success: false, 
        error: "Your Facebook connection is active, but your WhatsApp Business Account ID or Access Token could not be retrieved from the database. Please re-authenticate via Facebook in Settings." 
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
    const metaUrl = `https://graph.facebook.com/v20.0/${metaConfig.meta_business_id}/message_templates`;
    
    const metaRes = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${metaConfig.meta_access_token}`
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
    const { id, category, header_type, body_text, image_url } = body;

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

    // Get Shop's Meta Connection Mode
    const { data: shop } = await supabase
      .from('shops')
      .select('whatsapp_mode')
      .eq('id', user.id)
      .single();

    if (!shop) {
      return NextResponse.json({ error: 'Shop profile not found' }, { status: 404 });
    }

    let metaConfig: any = null;
    if (shop.whatsapp_mode === 'META_API') {
      const { data, error: configError } = await supabase
        .from('meta_configs')
        .select('meta_access_token, meta_business_id')
        .eq('shop_id', user.id)
        .single();

      if (!data?.meta_access_token || !data?.meta_business_id) {
        console.error("[META_SUBMIT_ERROR] Missing token or WABA ID in meta_configs for shop:", user.id);
        return NextResponse.json({ error: 'Missing Meta WABA configuration' }, { status: 400 });
      }
      metaConfig = data;

      // 1. Get the template's Meta ID by querying Meta API with the template name
      const getTemplatesUrl = `https://graph.facebook.com/v20.0/${metaConfig.meta_business_id}/message_templates?name=${template.template_name}`;
      const getTemplatesRes = await fetch(getTemplatesUrl, {
        headers: {
          'Authorization': `Bearer ${metaConfig.meta_access_token}`
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
        if (!image_url) {
          return NextResponse.json({ error: 'Image URL is required for IMAGE header type templates' }, { status: 400 });
        }

        let headerHandle: string;
        try {
          headerHandle = await uploadMediaToMeta(image_url, metaConfig.meta_business_id, metaConfig.meta_access_token);
        } catch (err: any) {
          console.error('Meta Resumable Upload Error:', err);
          return NextResponse.json({ error: err.message || 'Failed to upload example media to Meta' }, { status: 400 });
        }

        components.unshift({
          type: 'HEADER',
          format: 'IMAGE',
          example: {
            header_handle: [headerHandle]
          }
        });
      }

      if (metaTemplateId) {
        // 3. Edit the existing template using POST /v20.0/{template-id}
        const editUrl = `https://graph.facebook.com/v20.0/${metaTemplateId}`;
        const editRes = await fetch(editUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${metaConfig.meta_access_token}`
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
        const createUrl = `https://graph.facebook.com/v20.0/${metaConfig.meta_business_id}/message_templates`;
        const createRes = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${metaConfig.meta_access_token}`
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
        image_url: header_type === 'IMAGE' ? image_url : null,
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
      .select('whatsapp_mode')
      .eq('id', user.id)
      .single();

    if (shop && shop.whatsapp_mode === 'META_API') {
      const { data: metaConfig } = await supabase
        .from('meta_configs')
        .select('meta_access_token, meta_business_id')
        .eq('shop_id', user.id)
        .single();

      if (metaConfig?.meta_access_token && metaConfig?.meta_business_id) {
        // Trigger Meta API delete endpoint
        const metaUrl = `https://graph.facebook.com/v20.0/${metaConfig.meta_business_id}/message_templates?name=${template.template_name}`;
        const metaRes = await fetch(metaUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${metaConfig.meta_access_token}`
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
