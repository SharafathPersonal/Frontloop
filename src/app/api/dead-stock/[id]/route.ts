import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// FIX CRITICAL #2: moved formatSupabaseProduct to module scope (was incorrectly
// declared inside the try-block, causing a structural/hoisting defect).
function formatSupabaseProduct(p: any) {
  if (!p) return null;
  return {
    ...p,
    original_price: Number(p.original_price),
    clearance_price: Number(p.clearance_price),
    discount_percentage: Number(p.discount_percentage || 0),
    ...(p.shop ? {
      shop: {
        ...p.shop,
        latitude: p.shop.latitude != null ? Number(p.shop.latitude) : null,
        longitude: p.shop.longitude != null ? Number(p.shop.longitude) : null,
      }
    } : {})
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = createAdminClient();

    // JOIN: dead_stock_products.shop_id → public.shops(id)
    // The "shop" alias surfaces all merchant identity fields from the
    // existing shops table: shop_name, contact_number, owner_phone,
    // location_address, city, district, state, logo_url, google_maps_url.
    // No separate merchants table is required.
    const { data, error } = await supabase
      .from('dead_stock_products')
      .select(`
        *,
        shop:shops(
          id,
          shop_name,
          location_address,
          city,
          district,
          state,
          contact_number,
          owner_phone,
          logo_url,
          google_maps_url
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[dead-stock/[id] GET]', error);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch related products: same shop OR same category, uncleared, excluding self
    // Also joins shops so the related product cards can show shop_name + city.
    const { data: related } = await supabase
      .from('dead_stock_products')
      .select(`
        id,
        shop_id,
        product_name,
        original_price,
        clearance_price,
        discount_percentage,
        images,
        category,
        is_cleared,
        shop:shops(shop_name, city)
      `)
      .eq('is_cleared', false)
      .neq('id', id)
      .or(`shop_id.eq.${data.shop_id},category.eq.${data.category}`)
      .limit(6);

    // Sort related products so that items from the same shop come first
    const sortedRelated = (related || []).sort((a: any, b: any) => {
      if (a.shop_id === data.shop_id && b.shop_id !== data.shop_id) return -1;
      if (a.shop_id !== data.shop_id && b.shop_id === data.shop_id) return 1;
      return 0;
    });

    return NextResponse.json({
      product: formatSupabaseProduct(data),
      related: sortedRelated.map(formatSupabaseProduct),
    });
  } catch (err) {
    console.error('[dead-stock/[id] GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
