import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '0', 10);
    const limit = 20;
    const from = page * limit;
    const to = from + limit - 1;

    const { data: paymentLogs, error } = await supabaseAdmin
      .from('payment_logs')
      .select(`
        *,
        shop:shops ( shop_name )
      `)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const userMap = new Map();
    if (usersData?.users) {
      usersData.users.forEach((u: any) => userMap.set(u.id, u.email));
    }

    const mappedTransactions = (paymentLogs || []).map((log: any) => ({
      id: log.id,
      shop: log.shop,
      payer_email: userMap.get(log.shop_id) || 'N/A',
      amount: log.amount,
      credits_added: log.credits_credited,
      payment_gateway_id: log.order_id,
      status: (log.payment_status || 'pending').toLowerCase(),
      created_at: log.created_at
    }));

    let totalSpent = 0;
    let totalCredits = 0;

    if (page === 0) {
      const { data: totalsData } = await supabaseAdmin
        .from('payment_logs')
        .select('amount, credits_credited, payment_status');
      
      totalsData?.forEach((tx: any) => {
        if (tx.payment_status?.toUpperCase() === 'SUCCESS' || tx.payment_status?.toUpperCase() === 'CHARGED') {
          totalSpent += Number(tx.amount || 0);
          totalCredits += Number(tx.credits_credited || 0);
        }
      });
    }

    const hasMore = paymentLogs ? paymentLogs.length === limit : false;
    return NextResponse.json({ 
      transactions: mappedTransactions, 
      hasMore, 
      totalSpent: page === 0 ? totalSpent : undefined, 
      totalCredits: page === 0 ? totalCredits : undefined 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
