import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { startWhatsAppEngine } from '@/lib/whatsapp-bridge';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabaseClient = (cookieStore: any) => {
  return createServerClient<any>(
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
};

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set qr_express_status to disconnected as we initialize a new QR scan sequence
    await supabase.from('shops').update({ qr_express_status: 'disconnected' }).eq('id', user.id);
    
    // Delete any stale QR codes
    await supabase.from('whatsapp_sessions').delete().eq('shop_id', user.id).eq('session_key', 'qr');

    // Fire and forget the engine startup in the background
    startWhatsAppEngine(user.id, supabase).catch(err => {
      console.error('[WHATSAPP_START_ERROR]', err);
    });

    return NextResponse.json({ ok: true, message: 'WhatsApp QR Express engine starting in background.' });
  } catch (error: any) {
    console.error('POST /api/whatsapp/connect error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch current status of shop
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('qr_express_status, whatsapp_mode')
      .eq('id', user.id)
      .maybeSingle();

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    if (shop.qr_express_status === 'connected') {
      return NextResponse.json({ ok: true, status: 'connected', qr: null });
    }

    // 2. Fetch the QR code from whatsapp_sessions if disconnected
    const { data: qrSession } = await supabase
      .from('whatsapp_sessions')
      .select('session_value')
      .eq('shop_id', user.id)
      .eq('session_key', 'qr')
      .maybeSingle();

    const qrString = qrSession?.session_value && typeof qrSession.session_value === 'object'
      ? (qrSession.session_value as any).qr || null
      : null;

    return NextResponse.json({ 
      ok: true, 
      status: shop.qr_express_status || 'disconnected', 
      qr: qrString 
    });
  } catch (error: any) {
    console.error('GET /api/whatsapp/connect error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
