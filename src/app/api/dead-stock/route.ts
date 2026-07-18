import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const city = searchParams.get('city') || '';
  const sortBy = searchParams.get('sortBy') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const page = parseInt(searchParams.get('page') || '0', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '12', 10);
  const shopId = searchParams.get('shopId') || '';
  const includeCleared = searchParams.get('includeCleared') === 'true';

  try {
    const supabase = createAdminClient();

    // JOIN: dead_stock_products.shop_id → public.shops(id)
    // Surfaces shop_name, contact/phone, address, city, district, state, logo_url
    // from the existing shops table — no separate merchants table required.
    let query = supabase
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
      `);

    // Filter out cleared items for public view
    if (!includeCleared) {
      query = query.eq('is_cleared', false);
    }

    // Filter by shop if viewing merchant inventory
    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    // Text search
    if (search) {
      query = query.or(
        `product_name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`
      );
    }

    // Category filter
    if (category) {
      query = query.eq('category', category);
    }

    // City filter
    if (city) {
      const { data: shopsInCity } = await supabase
        .from('shops')
        .select('id')
        .ilike('city', `%${city}%`);
      const shopIds = (shopsInCity || []).map(s => s.id);
      if (shopIds.length > 0) {
        query = query.in('shop_id', shopIds);
      } else {
        // No shops match this city, return no products
        query = query.in('shop_id', ['00000000-0000-0000-0000-000000000000']);
      }
    }

    // Price range filter
    if (minPrice) {
      query = query.gte('clearance_price', parseFloat(minPrice));
    }
    if (maxPrice) {
      query = query.lte('clearance_price', parseFloat(maxPrice));
    }

    // Sorting
    if (sortBy === 'price_asc') {
      query = query.order('clearance_price', { ascending: true });
    } else if (sortBy === 'price_desc') {
      query = query.order('clearance_price', { ascending: false });
    } else if (sortBy === 'discount_desc') {
      // Sort by discount percentage (computed as ((original - clearance) / original) * 100)
      query = query.order('discount_percentage', { ascending: false });
    } else {
      // Default: newest first
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error } = await query;

    if (error) {
      console.error('[dead-stock GET]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data || [] });
  } catch (err) {
    console.error('[dead-stock GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();

    const {
      shop_id,
      product_name,
      original_price,
      clearance_price,
      category,
      description,
      condition_notes,
      images,
    } = body;

    if (!shop_id || !product_name || !original_price || !clearance_price || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const discountPercentage = Math.round(
      ((parseFloat(original_price) - parseFloat(clearance_price)) / parseFloat(original_price)) * 100
    );

    const { data, error } = await supabase
      .from('dead_stock_products')
      .insert({
        shop_id,
        product_name,
        original_price: parseFloat(original_price),
        clearance_price: parseFloat(clearance_price),
        discount_percentage: discountPercentage,
        category,
        description: description || '',
        condition_notes: condition_notes || '',
        images: images || [],
        is_cleared: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[dead-stock POST]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product: data }, { status: 201 });
  } catch (err) {
    console.error('[dead-stock POST] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { id, shop_id, is_cleared, ...updates } = body;

    if (!id || !shop_id) {
      return NextResponse.json({ error: 'Missing product ID or shop ID' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('dead_stock_products')
      .select('id, shop_id, original_price, clearance_price')
      .eq('id', id)
      .eq('shop_id', shop_id)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Product not found or unauthorized' }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = { ...updates };
    if (typeof is_cleared === 'boolean') {
      updatePayload.is_cleared = is_cleared;
    }

    // Recalculate discount if prices changed
    if (updates.original_price || updates.clearance_price) {
      const origPrice = parseFloat(updates.original_price || existing.original_price);
      const clearPrice = parseFloat(updates.clearance_price || existing.clearance_price);
      updatePayload.discount_percentage = Math.round(
        ((origPrice - clearPrice) / origPrice) * 100
      );
    }

    const { data, error } = await supabase
      .from('dead_stock_products')
      .update(updatePayload)
      .eq('id', id)
      .eq('shop_id', shop_id)
      .select()
      .single();

    if (error) {
      console.error('[dead-stock PATCH]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product: data });
  } catch (err) {
    console.error('[dead-stock PATCH] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const shopId = searchParams.get('shopId');

    if (!id || !shopId) {
      return NextResponse.json({ error: 'Missing product ID or shop ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('dead_stock_products')
      .delete()
      .eq('id', id)
      .eq('shop_id', shopId);

    if (error) {
      console.error('[dead-stock DELETE]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[dead-stock DELETE] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
