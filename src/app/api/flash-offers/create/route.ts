import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
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

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfiguration: Missing service role key' }, { status: 500 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const {
      id,
      product_name,
      original_price,
      discount_price,
      offer_description,
      show_percentage_badge,
      show_discount_price,
      is_active,
      image_url
    } = await req.json();

    if (!product_name || typeof original_price !== 'number' || typeof discount_price !== 'number') {
      return NextResponse.json({ error: 'Missing required offer parameters' }, { status: 400 });
    }

    // 1. Check merchant balance
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('credits_remaining')
      .eq('shop_id', user.id)
      .single();

    if (walletError || !wallet || wallet.credits_remaining < 2) {
      return NextResponse.json(
        { error: 'Insufficient credits for transaction. Required: 2 credits.' },
        { status: 403 }
      );
    }

    // 2. Deduct 2 credits
    const { error: deductError } = await supabaseAdmin.rpc('deduct_credits', {
      p_shop_id: user.id,
      p_amount: 2
    });

    if (deductError) {
      return NextResponse.json(
        { error: 'Insufficient credits for transaction. Required: 2 credits.' },
        { status: 403 }
      );
    }

    // 3. Execute insertion/update
    try {
      let result;
      if (id) {
        const { data, error } = await supabaseAdmin
          .from('shop_flash_offers')
          .update({
            product_name: product_name.trim(),
            original_price,
            discount_price,
            offer_description: offer_description ? offer_description.trim() : null,
            show_percentage_badge: !!show_percentage_badge,
            show_discount_price: !!show_discount_price,
            is_active: is_active !== undefined ? !!is_active : true,
            image_url: image_url ? image_url.trim() : null
          })
          .eq('id', id)
          .eq('shop_id', user.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabaseAdmin
          .from('shop_flash_offers')
          .insert({
            shop_id: user.id,
            product_name: product_name.trim(),
            original_price,
            discount_price,
            offer_description: offer_description ? offer_description.trim() : null,
            show_percentage_badge: !!show_percentage_badge,
            show_discount_price: !!show_discount_price,
            is_active: is_active !== undefined ? !!is_active : true,
            image_url: image_url ? image_url.trim() : null
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return NextResponse.json({ ok: true, data: result });

    } catch (mutationError: any) {
      // Rollback deduction if insertion/update failed
      await supabaseAdmin.rpc('increment', {
        row_id: user.id,
        value: 2
      });
      return NextResponse.json(
        { error: mutationError.message || 'Failed to persist offer.' },
        { status: 500 }
      );
    }

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
