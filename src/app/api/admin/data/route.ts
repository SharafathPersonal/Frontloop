import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin_session');

    if (adminSession?.value !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    // Fetch Shops with Wallets joined
    const { data: shopsData, error: shopsError } = await supabaseAdmin
      .from('shops')
      .select(`
        *,
        wallets ( credits_remaining )
      `)
      .order('created_at', { ascending: false });

    if (shopsError) throw shopsError;

    // Fetch Campaigns
    const { data: campaignsData, error: campaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (campaignsError) throw campaignsError;

    // Fetch Payment Logs
    const { data: paymentsData, error: paymentsError } = await supabaseAdmin
      .from('payment_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (paymentsError) throw paymentsError;

    return NextResponse.json({
      shops: shopsData,
      campaigns: campaignsData,
      payments: paymentsData
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
