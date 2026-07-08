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

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Missing service role key' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    // FIX 1: ELIMINATE BULK DATA OVERFETCHING (DASHBOARD ANALYTICS)
    
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
    // Supabase JS doesn't have an easy sum() aggregation without RPC, so we fetch only the column
    // For large scale, you'd use a postgres function. For now, fetch only credits_remaining
    const { data: walletsData, error: walletsError } = await supabaseAdmin
      .from('wallets')
      .select('credits_remaining');
      
    if (walletsError) throw walletsError;
    const totalTokens = walletsData?.reduce((acc, w) => acc + (w.credits_remaining || 0), 0) || 0;

    // Gross Revenue
    const { data: paymentsData, error: paymentsError } = await supabaseAdmin
      .from('payment_logs')
      .select('amount, payment_status');

    if (paymentsError) throw paymentsError;
    const totalRevenue = paymentsData
      ?.filter(p => p.payment_status === 'success' || p.payment_status === 'pending')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

    // Fetch Pricing Tiers
    const { data: pricingData, error: pricingError } = await supabaseAdmin
      .from('pricing_tiers')
      .select('*')
      .order('amount_inr', { ascending: true });

    if (pricingError) throw pricingError;

    // Fetch Feedbacks
    const { data: feedbacksData, error: feedbacksError } = await supabaseAdmin
      .from('shop_feedbacks')
      .select(`
        *,
        shop:shops (*)
      `)
      .order('created_at', { ascending: false });

    if (feedbacksError) throw feedbacksError;

    return NextResponse.json({
      metrics: {
        totalShops: totalShops || 0,
        globalMessages: globalMessages || 0,
        totalTokens,
        totalRevenue
      },
      pricing: pricingData,
      feedbacks: feedbacksData
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
