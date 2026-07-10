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

    const { shop_id, amount } = await req.json();

    if (!shop_id || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // We MUST use the SERVICE_ROLE_KEY to bypass RLS for admin operations.
    // If it's missing, we fallback to anon key but it will fail due to RLS.
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

    // Increment directly in the wallets table via RPC if available, or just a raw update.
    // We can fetch the current credits and add to it, but a raw RPC is safer.
    // We will use a standard query since we might not have an increment RPC.
    const { data: wallet, error: fetchError } = await supabaseAdmin
      .from('wallets')
      .select('credits_remaining')
      .eq('shop_id', shop_id)
      .single();

    if (fetchError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const newBalance = wallet.credits_remaining + amount;

    const { error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({ credits_remaining: newBalance, updated_at: new Date().toISOString() })
      .eq('shop_id', shop_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
    }

    return NextResponse.json({ success: true, newBalance });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
