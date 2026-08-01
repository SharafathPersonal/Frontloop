import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ─────────────────────────────────────────────────────────────
// FIX CRITICAL #1: Every mutating handler (POST, PATCH, DELETE)
// now authenticates the caller via Supabase cookie session and
// enforces shop_id === user.id before touching any data.
// ─────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Builds a server-side Supabase client from the incoming request cookies.
 * Used exclusively to verify the authenticated user session.
 */
async function createUserClientFromCookies() {
  const cookieStore = await cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* noop — response already committed */ }
        },
      },
    }
  );
}

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
        owner_phone: p.shop.owner_phone
          ? `${p.shop.owner_phone.slice(0, 3)}****${p.shop.owner_phone.slice(-4)}`
          : null, // Mask owner phone (PII protection)
        latitude: p.shop.latitude != null ? Number(p.shop.latitude) : null,
        longitude: p.shop.longitude != null ? Number(p.shop.longitude) : null,
      }
    } : {})
  };
}

// ─── GET — public, no auth required ──────────────────────────────────────────
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
          latitude,
          longitude,
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

    return NextResponse.json({ products: (data || []).map(formatSupabaseProduct) });
  } catch (err) {
    console.error('[dead-stock GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST — AUTHENTICATED: create a new dead-stock product ───────────────────
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate caller via session cookie
    const userClient = await createUserClientFromCookies();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      location_address,
      city,
      district,
      state,
      latitude,
      longitude,
      google_maps_url,
    } = body;

    // 2. Enforce strict ownership: authenticated user must own the shop
    if (!shop_id) {
      return NextResponse.json({ error: 'Missing shop_id' }, { status: 400 });
    }
    if (shop_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: shop_id does not match your account' }, { status: 403 });
    }

    if (!product_name || !original_price || !clearance_price || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Optional: Update merchant shop profile location details
    if (city || location_address || latitude) {
      const shopLocationPayload: Record<string, any> = {};
      if (city) shopLocationPayload.city = city;
      if (district) shopLocationPayload.district = district;
      if (state) shopLocationPayload.state = state;
      if (location_address) shopLocationPayload.location_address = location_address;
      if (latitude) shopLocationPayload.latitude = latitude;
      if (longitude) shopLocationPayload.longitude = longitude;
      if (google_maps_url) shopLocationPayload.google_maps_url = google_maps_url;

      await supabase.from('shops').update(shopLocationPayload).eq('id', shop_id);
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

    return NextResponse.json({ product: formatSupabaseProduct(data) }, { status: 201 });
  } catch (err) {
    console.error('[dead-stock POST] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH — AUTHENTICATED: update an existing dead-stock product ─────────────
export async function PATCH(request: NextRequest) {
  try {
    // 1. Authenticate caller via session cookie
    const userClient = await createUserClientFromCookies();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body = await request.json();
    const { id, shop_id, is_cleared, ...updates } = body;

    if (!id || !shop_id) {
      return NextResponse.json({ error: 'Missing product ID or shop ID' }, { status: 400 });
    }

    // 2. Enforce strict ownership: authenticated user must own the shop
    if (shop_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: shop_id does not match your account' }, { status: 403 });
    }

    // 3. Verify product belongs to the authenticated shop (DB-level check)
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

    return NextResponse.json({ product: formatSupabaseProduct(data) });
  } catch (err) {
    console.error('[dead-stock PATCH] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE — AUTHENTICATED: soft/hard delete a dead-stock product ─────────────
export async function DELETE(request: NextRequest) {
  try {
    // 1. Authenticate caller via session cookie
    const userClient = await createUserClientFromCookies();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const shopId = searchParams.get('shopId');

    if (!id || !shopId) {
      return NextResponse.json({ error: 'Missing product ID or shop ID' }, { status: 400 });
    }

    // 2. Enforce strict ownership: authenticated user must own the shop
    if (shopId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: shopId does not match your account' }, { status: 403 });
    }

    // 3. Verify product belongs to the authenticated shop (DB-level check)
    const { data: existing, error: findError } = await supabase
      .from('dead_stock_products')
      .select('id, shop_id')
      .eq('id', id)
      .eq('shop_id', shopId)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Product not found or unauthorized' }, { status: 404 });
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
