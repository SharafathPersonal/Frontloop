import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin_session');
    const adminSecret = process.env.ADMIN_SECURE_TOKEN;

    if (!adminSession?.value || !adminSecret || adminSession.value !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Using service role key bypasses RLS
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sortStr = searchParams.get('sort') || 'date'; // 'date', 'az', 'za'
    const pageStr = searchParams.get('page') || '0';
    
    const page = parseInt(pageStr, 10) || 0;
    const limit = 20;
    const from = page * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from('shops')
      .select(`
        *,
        wallets ( credits_remaining )
      `, { count: 'exact' });

    if (search) {
      query = query.or(`shop_name.ilike.%${search}%,owner_phone.ilike.%${search}%`);
    }

    if (sortStr === 'az') {
      query = query.order('shop_name', { ascending: true });
    } else if (sortStr === 'za') {
      query = query.order('shop_name', { ascending: false });
    } else {
      // default 'date'
      query = query.order('created_at', { ascending: false });
    }

    const { data: shopsData, error: shopsError, count } = await query.range(from, to);

    if (shopsError) throw shopsError;

    return NextResponse.json({
      shops: shopsData,
      totalCount: count
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
