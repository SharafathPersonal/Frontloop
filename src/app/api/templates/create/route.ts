import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Helper function to upload image from URL to Meta via Resumable Upload API
async function uploadMediaToMeta(imageUrl: string, wabaId: string, accessToken: string): Promise<string> {
  // 1. Fetch the image file
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

  // 2. Start upload session
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

  // 3. Upload file binary data
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
    const { template_name, category, header_type, body_text, image_url } = body;

    if (!template_name || !category || !body_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate variables
    if (/^[^\p{L}\p{N}]*\{\{\d+\}\}/u.test(body_text) || /\{\{\d+\}\}[^\p{L}\p{N}]*$/u.test(body_text)) {
      return NextResponse.json({ error: "Variables can't be at the start or end of the template (punctuation doesn't count). Please add some actual text before and after." }, { status: 400 });
    }

    const invalidVars = body_text.match(/\{\{(?!\d+\}\}).*?\}\}/g);
    if (invalidVars) {
      return NextResponse.json({ error: `Invalid variable format: ${invalidVars.join(', ')}. Variables must be exactly {{1}}, {{2}}, etc.` }, { status: 400 });
    }
    const validVars = body_text.match(/\{\{\d+\}\}/g);
    if (validVars) {
      const nums = validVars.map((v: string) => parseInt(v.match(/\d+/)![0]));
      if (nums.includes(0)) {
        return NextResponse.json({ error: 'Variables must start at {{1}}. {{0}} is not allowed.' }, { status: 400 });
      }
      const uniqueNums = [...new Set<number>(nums)].sort((a: number, b: number) => a - b);
      if (uniqueNums[0] !== 1) {
        return NextResponse.json({ error: 'Variables must start at {{1}}.' }, { status: 400 });
      }
      for (let i = 0; i < uniqueNums.length; i++) {
        if (uniqueNums[i] !== i + 1) {
          return NextResponse.json({ error: `Variables must be sequential. Missing {{${i + 1}}}.` }, { status: 400 });
        }
      }
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
    const bodyComponent: any = {
      type: 'BODY',
      text: body_text,
    };

    // Extract variables like {{1}}, {{2}} and generate example values
    const matches = body_text.match(/\{\{\d+\}\}/g);
    if (matches) {
      const maxVar = Math.max(...matches.map((v: string) => parseInt(v.match(/\d+/)![0])));
      const exampleValues = Array.from({length: maxVar}, (_, i) => `example_${i+1}`);
      bodyComponent.example = {
        body_text: [exampleValues] // Meta requires an array of arrays for body_text examples
      };
    }

    const components: any[] = [bodyComponent];

    if (header_type === 'IMAGE') {
      if (!image_url) {
        return NextResponse.json({ error: 'Image URL is required for IMAGE header type templates' }, { status: 400 });
      }

      // Perform resumable upload to Meta
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

    const metaPayload = {
      name: template_name,
      language: 'en_US',
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
      const errMsg = metaData.error?.error_user_msg || metaData.error?.error_user_title || metaData.error?.message || 'Failed to submit template to Meta';
      console.error('Meta API Error:', metaData.error);
      
      // Still save a REJECTED row for the audit trail
      await supabase.from('message_templates').insert({
        shop_id: user.id,
        template_name: template_name,
        category: category,
        header_type: header_type === 'IMAGE' ? 'IMAGE' : 'NONE',
        body_text: body_text,
        image_url: header_type === 'IMAGE' ? image_url : null,
        status: 'REJECTED',
        rejection_reason: errMsg,
        updated_at: new Date().toISOString()
      });
      
      return NextResponse.json({ error: errMsg }, { status: 400 });
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
        image_url: header_type === 'IMAGE' ? image_url : null,
        status: metaData.status || 'PENDING',
        meta_template_id: metaData.id || null,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB Error:', dbError);
      return NextResponse.json({ error: 'Template submitted but failed to save in database' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: template });

  } catch (error: any) {
    console.error('POST /api/templates/create error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
