import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // 1. Parse Cashfree Webhook Payload (V3 Structure)
    const order_id = payload.data?.order?.order_id;
    const payment_status = payload.data?.payment?.payment_status;
    const order_amount = payload.data?.order?.order_amount;
    const shop_id = payload.data?.order?.order_tags?.shop_id;
    const credit_count_str = payload.data?.order?.order_tags?.credit_count;

    if (!order_id || !payment_status || !shop_id || !credit_count_str) {
      return NextResponse.json({ error: 'Malformed payload structure' }, { status: 400 });
    }

    // 2. Strict Success Verification
    if (payment_status !== 'SUCCESS') {
      return NextResponse.json({ message: 'Ignored non-success status' }, { status: 200 });
    }

    const credit_count = parseInt(credit_count_str, 10);

    // 3. Instantiate High-Privilege Admin Client
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Missing service role infrastructure' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 4. Atomic Idempotency Check & Logging
    const { error: logError } = await supabaseAdmin
      .from('payment_logs')
      .insert({
        shop_id,
        order_id,
        amount: order_amount,
        credits_credited: credit_count,
        payment_status: 'SUCCESS'
      });

    if (logError) {
      if (logError.code === '23505') { // Postgres Unique Violation
        return NextResponse.json({ message: 'Transaction already processed atomically' }, { status: 200 });
      }
      throw logError;
    }

    // 5. Atomic Wallet Update (via securely defined RPC)
    const { error: rpcError } = await supabaseAdmin.rpc('increment', {
      row_id: shop_id,
      value: credit_count
    });

    if (rpcError) throw rpcError;

    return NextResponse.json({ ok: true, message: 'Wallet credited atomically' });

  } catch (error: unknown) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
