import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin_session');
    const adminSecret = process.env.ADMIN_SECURE_TOKEN;

    if (!adminSession?.value || !adminSecret || adminSession.value !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { searchParams } = new URL(request.url);
    const shop_id = searchParams.get('shop_id');
    
    if (!shop_id) {
      return NextResponse.json({ error: 'Missing shop_id' }, { status: 400 });
    }

    const { data: campaignsData, error: campaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('shop_id', shop_id)
      .order('created_at', { ascending: false });

    if (campaignsError) throw campaignsError;

    return NextResponse.json({ campaigns: campaignsData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
