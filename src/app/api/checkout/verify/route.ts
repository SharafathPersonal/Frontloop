import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { order_id } = await req.json();
    
    if (!order_id) {
      return NextResponse.json({ ok: false, error: 'Missing order_id' }, { status: 400 });
    }

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ ok: false, error: 'Server misconfiguration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Check if already processed
    const { data: existingLog } = await supabaseAdmin
      .from('payment_logs')
      .select('*')
      .eq('order_id', order_id)
      .single();

    if (existingLog && (existingLog.payment_status === 'SUCCESS' || existingLog.payment_status === 'CHARGED')) {
      return NextResponse.json({ ok: true, message: 'Already processed' });
    }

    // 2. Fetch order status from Cashfree
    const isProd = process.env.CASHFREE_ENV === 'production' || process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production';
    const baseUrl = isProd ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';

    const response = await fetch(`${baseUrl}/pg/orders/${order_id}`, {
      method: 'GET',
      headers: {
        'x-client-id': process.env.NEXT_PUBLIC_CASHFREE_APP_ID || '',
        'x-client-secret': process.env.CASHFREE_SECRET_KEY || '',
        'x-api-version': '2023-08-01',
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json({ ok: false, error: errData.message || 'Failed to verify order with Cashfree' }, { status: response.status });
    }

    const orderData = await response.json();

    if (orderData.order_status !== 'PAID') {
      return NextResponse.json({ ok: false, error: 'Payment not completed', status: orderData.order_status }, { status: 400 });
    }

    // Process valid payment
    const credit_count = parseInt(orderData.order_tags?.credit_count || '0', 10);
    const shop_id = orderData.order_tags?.shop_id || orderData.customer_details?.customer_id;
    const order_amount = orderData.order_amount;

    if (!credit_count || !shop_id) {
      return NextResponse.json({ ok: false, error: 'Invalid order metadata' }, { status: 400 });
    }

    // Security check: ensure the user asking is the shop owner
    if (shop_id !== user.id) {
      return NextResponse.json({ ok: false, error: 'Unauthorized to verify this order' }, { status: 403 });
    }

    // Atomic Transaction & Idempotency Guard via RPC
    const { data: wasProcessed, error: rpcError } = await supabaseAdmin.rpc('process_payment_atomically', {
      p_order_id: order_id,
      p_shop_id: shop_id,
      p_amount: order_amount,
      p_credits: credit_count,
      p_payment_status: 'SUCCESS'
    });

    if (rpcError) throw rpcError;

    if (wasProcessed) {
      return NextResponse.json({ ok: true, message: 'Wallet credited successfully via fallback verification' });
    } else {
      return NextResponse.json({ ok: true, message: 'Transaction already processed atomically' });
    }
  } catch (error) {
    console.error('Verify Checkout API Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
