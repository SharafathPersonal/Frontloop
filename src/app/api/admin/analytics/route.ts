import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
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
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    // Total Shops
    const { count: totalShops, error: shopsError } = await supabaseAdmin
      .from('shops')
      .select('*', { count: 'exact', head: true });

    if (shopsError) throw shopsError;

    // Total Campaigns (Global Traffic Volume)
    const { count: globalMessages, error: campaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('*', { count: 'exact', head: true });

    if (campaignsError) throw campaignsError;

    // Total Circulating Tokens (sum wallets)
    const { data: walletsData, error: walletsError } = await supabaseAdmin
      .from('wallets')
      .select('credits_remaining');
      
    if (walletsError) throw walletsError;
    const totalTokens = walletsData?.reduce((acc, w) => acc + (w.credits_remaining || 0), 0) || 0;

    // Gross Revenue from payment_logs
    const { data: revenueData, error: paymentsError } = await supabaseAdmin
      .from('payment_logs')
      .select('amount')
      .in('payment_status', ['SUCCESS', 'CHARGED', 'success', 'charged']);

    if (paymentsError) throw paymentsError;
    const grossRevenue = revenueData
      ?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

    return NextResponse.json({
      grossRevenue,
      metrics: {
        totalShops: totalShops || 0,
        globalMessages: globalMessages || 0,
        totalTokens,
        totalRevenue: grossRevenue
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
