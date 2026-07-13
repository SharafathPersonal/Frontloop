import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin_session');
    const adminSecret = process.env.ADMIN_SECURE_TOKEN;

    if (!adminSession?.value || !adminSecret || adminSession.value !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let { shop_id, amount, action } = await req.json();

    if (!action) {
      action = 'add';
    }

    if (!shop_id || typeof amount !== 'number' || amount < 0 || !['add', 'subtract', 'set'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // We MUST use the SERVICE_ROLE_KEY to bypass RLS for admin operations.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: wallet, error: fetchError } = await supabaseAdmin
      .from('wallets')
      .select('credits_remaining')
      .eq('shop_id', shop_id)
      .single();

    if (fetchError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const currentBalance = wallet.credits_remaining;
    let newBalance = currentBalance;
    let netChange = 0;

    if (action === 'add') {
      newBalance = currentBalance + amount;
      netChange = amount;
    } else if (action === 'subtract') {
      newBalance = Math.max(0, currentBalance - amount);
      netChange = newBalance - currentBalance;
    } else if (action === 'set') {
      newBalance = Math.max(0, amount);
      netChange = newBalance - currentBalance;
    }

    const { error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({ credits_remaining: newBalance, updated_at: new Date().toISOString() })
      .eq('shop_id', shop_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
    }

    // Log the ADMIN_ADJUSTMENT in the payment transaction history ledger
    const { error: logError } = await supabaseAdmin
      .from('payment_logs')
      .insert({
        shop_id,
        order_id: `ADMIN_ADJUSTMENT_${action.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: 0.00,
        credits_credited: netChange,
        payment_status: 'success'
      });

    if (logError) {
      console.error('Failed to log admin adjustment audit:', logError);
    }

    return NextResponse.json({ success: true, newBalance });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
