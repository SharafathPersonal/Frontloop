import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();
    
    // Map pack amounts to INR prices based on the frontend CREDIT_PACKS
    const prices: Record<number, number> = {
      50: 199,
      100: 349,
      200: 599,
      500: 1299
    };
    
    const orderAmount = prices[amount];
    if (!orderAmount) {
      return NextResponse.json({ ok: false, error: 'Invalid credit pack' }, { status: 400 });
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

    const { data: shop } = await supabase.from('shops').select('shop_name, owner_phone').eq('id', user.id).maybeSingle();
    if (!shop) {
      return NextResponse.json({ ok: false, error: 'Shop profile not found' }, { status: 404 });
    }

    const orderId = `order_${user.id}_${Date.now()}`;
    const env = process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' ? 'api' : 'sandbox';

    const response = await fetch(`https://${env}.cashfree.com/pg/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': process.env.NEXT_PUBLIC_CASHFREE_APP_ID || '',
        'x-client-secret': process.env.CASHFREE_SECRET_KEY || '',
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_amount: orderAmount,
        order_currency: 'INR',
        order_id: orderId,
        customer_details: {
          customer_id: user.id,
          customer_name: shop.shop_name || 'Customer',
          customer_phone: (shop.owner_phone || '').replace(/\D/g, '').slice(-10) || '9999999999',
        },
        order_meta: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings?order_id={order_id}`
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cashfree API Error:', data);
      return NextResponse.json({ ok: false, error: data.message || 'Failed to create payment session' }, { status: response.status });
    }

    return NextResponse.json({ ok: true, payment_session_id: data.payment_session_id });
  } catch (error) {
    console.error('Checkout API Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
