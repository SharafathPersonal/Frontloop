import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

    const cookieStore = await cookies();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* noop for service role */ },
        },
      }
    );

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'newest';

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Find shop by slug
    const { data: shop, error: shopErr } = await supabase
      .from('shops')
      .select('id, shop_name, logo_url, invoice_theme_color, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (shopErr || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Fetch active, non-deleted offers with filters, sorting, and pagination bounds
    let query = supabase
      .from('shop_flash_offers')
      .select('id, product_name, offer_description, original_price, discount_price, show_percentage_badge, show_discount_price, image_url, created_at, push_shared_count')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .eq('is_deleted', false);

    if (search.trim()) {
      query = query.ilike('product_name', `%${search.trim()}%`);
    }

    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort === 'price-asc') {
      query = query.order('discount_price', { ascending: true });
    } else if (sort === 'price-desc') {
      query = query.order('discount_price', { ascending: false });
    }

    const { data: offers } = await query.range(start, end);

    // Increment views atomically in background only on first page load
    if (page === 1) {
      supabase.rpc('increment_flash_offer_views', { p_shop_id: shop.id }).then(() => {});
    }

    return NextResponse.json({
      shop: { name: shop.shop_name, logo_url: shop.logo_url, theme_color: shop.invoice_theme_color || '#5C4033' },
      offers: offers || [],
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
