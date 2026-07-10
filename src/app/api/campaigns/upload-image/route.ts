import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    // 1. Authenticate user session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseUserClient = createServerClient<any>(
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

    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 2. Strict validation on backend
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.type)) {
      console.warn(`[Audit Failure] Server rejected invalid mime-type: ${file.type}`);
      return NextResponse.json({ error: 'Invalid file type. Only PNG and JPG/JPEG are allowed.' }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.warn(`[Audit Failure] Server rejected file exceeding 5MB: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return NextResponse.json({ error: 'File size exceeds 5MB limit.' }, { status: 400 });
    }

    // 3. Initialize Supabase Admin client to bypass RLS policies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const ext = file.name.split('.').pop() || 'png';
    const path = `campaign-images/${user.id}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // 4. Upload file to 'broadcast-assets' bucket bypassing client-side RLS
    const { error: uploadError } = await supabaseAdmin.storage
      .from('broadcast-assets')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('[Upload API] storage upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 5. Get public URL of the uploaded flyer
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('broadcast-assets')
      .getPublicUrl(path);

    return NextResponse.json({ publicUrl });
  } catch (error: any) {
    console.error('[Upload API] error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
