import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin_session');

    if (adminSession?.value !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!serviceRoleKey) {
       return NextResponse.json({ error: 'Missing service role key' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const shopId = params.id;

    // Fetch Shop Data
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('*, wallets ( credits_remaining )')
      .eq('id', shopId)
      .single();

    if (shopError) throw shopError;

    // Fetch total consumed from campaigns (could also fetch full campaign history, but we paginate local/fetch all here)
    const { data: campaignsData, error: campaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (campaignsError) throw campaignsError;

    const totalConsumed = campaignsData
      .filter(c => c.status === 'completed')
      .reduce((sum, c) => sum + (c.total_recipients || 0), 0);

    return NextResponse.json({
      shop,
      campaigns: campaignsData,
      totalConsumed
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
