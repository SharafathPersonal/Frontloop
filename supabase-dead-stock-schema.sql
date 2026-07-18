-- ============================================================
-- DEAD STOCK MARKETPLACE — SUPABASE SCHEMA (v2 — Direct Shop Join)
-- Run this entire file in: Supabase Dashboard > SQL Editor
-- ============================================================
--
-- ┌─────────────────────────────────────────────────────────┐
-- │  DEVELOPER INSTRUCTION — CRITICAL JOIN SETUP            │
-- │                                                         │
-- │  dead_stock_products.shop_id  ──FK──►  public.shops.id  │
-- │                                                         │
-- │  The marketplace API joins dead_stock_products directly  │
-- │  with public.shops to surface:                          │
-- │    • shops.shop_name      → merchant display name       │
-- │    • shops.contact_number → WhatsApp CTA number         │
-- │    • shops.owner_phone    → fallback phone              │
-- │    • shops.location_address / city / district / state   │
-- │    • shops.logo_url       → merchant avatar in UI       │
-- │                                                         │
-- │  ⚠️  ACTION REQUIRED AFTER RUNNING THIS FILE:           │
-- │  Scroll to the BOTTOM of this file and UNCOMMENT the    │
-- │  trigger block under "Step 6 — Auto-Sync Trigger".      │
-- │  Run it once to backfill existing shop rows into the    │
-- │  marketplace_merchant_profiles view, ensuring every     │
-- │  shop has a marketplace-ready profile row with a        │
-- │  seamless one-to-one join on shop_id.                   │
-- └─────────────────────────────────────────────────────────┘
-- ============================================================


-- ============================================================
-- STEP 1: DROP legacy merchants table if it exists from v1
-- (The v2 schema eliminates this — all merchant data is now
--  read directly from public.shops via FK join.)
-- ============================================================
DROP TABLE IF EXISTS public.merchants CASCADE;


-- ============================================================
-- STEP 2: Extend public.shops with marketplace-specific columns
-- (Non-destructive — uses ADD COLUMN IF NOT EXISTS)
-- These columns are needed for the public Dead Stock marketplace
-- to display merchant location and contact details without
-- requiring merchants to re-enter data they already provided
-- during shop registration.
-- ============================================================

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS google_maps_url    TEXT,
  ADD COLUMN IF NOT EXISTS marketplace_active BOOLEAN NOT NULL DEFAULT true;

-- Index for marketplace active filter
CREATE INDEX IF NOT EXISTS idx_shops_marketplace_active
  ON public.shops(marketplace_active);


-- ============================================================
-- STEP 3: dead_stock_products table
-- FK: shop_id → public.shops(id)
-- This is the primary join. Every product row carries shop_id,
-- which the API uses to JOIN public.shops and retrieve:
--   shop_name, contact_number, owner_phone, location_address,
--   city, district, state, logo_url, google_maps_url
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dead_stock_products (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ─── MERCHANT JOIN KEY ────────────────────────────────────
  -- shop_id is the single FK that links this product to the
  -- existing shops table. No separate merchants table needed.
  shop_id             UUID        NOT NULL
                        REFERENCES public.shops(id)
                        ON DELETE CASCADE,
  -- ──────────────────────────────────────────────────────────

  product_name        TEXT        NOT NULL,
  original_price      NUMERIC(12, 2) NOT NULL CHECK (original_price > 0),
  clearance_price     NUMERIC(12, 2) NOT NULL CHECK (clearance_price > 0),
  discount_percentage INT         NOT NULL DEFAULT 0
                        CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  category            TEXT        NOT NULL,
  description         TEXT,
  condition_notes     TEXT,
  images              TEXT[]      NOT NULL DEFAULT '{}',

  -- ─── CORE BUSINESS LOGIC FLAG ─────────────────────────────
  -- When is_cleared = TRUE, the API instantly excludes this
  -- product from the public marketplace (/broadcast/dead-stock).
  -- Merchant toggles this from /dashboard/dead-stock.
  is_cleared          BOOLEAN     NOT NULL DEFAULT false,
  -- ──────────────────────────────────────────────────────────

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraint: clearance price must always be below original
ALTER TABLE public.dead_stock_products
  DROP CONSTRAINT IF EXISTS chk_clearance_below_original;
ALTER TABLE public.dead_stock_products
  ADD CONSTRAINT chk_clearance_below_original
    CHECK (clearance_price < original_price);


-- ============================================================
-- STEP 4: Performance Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_dsp_shop_id
  ON public.dead_stock_products(shop_id);

CREATE INDEX IF NOT EXISTS idx_dsp_category
  ON public.dead_stock_products(category);

-- Primary public filter: is_cleared = false
CREATE INDEX IF NOT EXISTS idx_dsp_is_cleared
  ON public.dead_stock_products(is_cleared)
  WHERE is_cleared = false;

CREATE INDEX IF NOT EXISTS idx_dsp_clearance_price
  ON public.dead_stock_products(clearance_price);

CREATE INDEX IF NOT EXISTS idx_dsp_discount
  ON public.dead_stock_products(discount_percentage DESC);

CREATE INDEX IF NOT EXISTS idx_dsp_created_at
  ON public.dead_stock_products(created_at DESC);

-- Composite: most common public query pattern
CREATE INDEX IF NOT EXISTS idx_dsp_public_listing
  ON public.dead_stock_products(is_cleared, created_at DESC)
  WHERE is_cleared = false;


-- ============================================================
-- STEP 5: Row Level Security
-- ============================================================

ALTER TABLE public.dead_stock_products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "dsp_public_read"    ON public.dead_stock_products;
DROP POLICY IF EXISTS "dsp_owner_read"     ON public.dead_stock_products;
DROP POLICY IF EXISTS "dsp_owner_insert"   ON public.dead_stock_products;
DROP POLICY IF EXISTS "dsp_owner_update"   ON public.dead_stock_products;
DROP POLICY IF EXISTS "dsp_owner_delete"   ON public.dead_stock_products;

-- Anyone can read active (uncleared) listings
CREATE POLICY "dsp_public_read" ON public.dead_stock_products
  FOR SELECT USING (is_cleared = false);

-- Merchants can read ALL their own items (including cleared)
CREATE POLICY "dsp_owner_read" ON public.dead_stock_products
  FOR SELECT USING (auth.uid() = shop_id);

-- Merchants can only insert their own products
CREATE POLICY "dsp_owner_insert" ON public.dead_stock_products
  FOR INSERT WITH CHECK (auth.uid() = shop_id);

-- Merchants can only update their own products
-- (includes toggling is_cleared — the core business logic)
CREATE POLICY "dsp_owner_update" ON public.dead_stock_products
  FOR UPDATE
  USING (auth.uid() = shop_id)
  WITH CHECK (auth.uid() = shop_id);

-- Merchants can only delete their own products
CREATE POLICY "dsp_owner_delete" ON public.dead_stock_products
  FOR DELETE USING (auth.uid() = shop_id);


-- ============================================================
-- STEP 5b: Ensure public.shops is readable by anon role
-- (Required for the FK join to work in public marketplace)
-- Only add if not already present.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'shops'
      AND policyname = 'shops_public_marketplace_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "shops_public_marketplace_read" ON public.shops
        FOR SELECT USING (marketplace_active = true);
    $policy$;
  END IF;
END $$;


-- ============================================================
-- STEP 5c: Supabase Storage — product-images bucket
-- Uncomment and run manually in SQL Editor if bucket doesn't exist.
-- ============================================================

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('product-images', 'product-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
-- CREATE POLICY "product_images_public_read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'product-images');

-- DROP POLICY IF EXISTS "product_images_auth_upload" ON storage.objects;
-- CREATE POLICY "product_images_auth_upload" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'product-images'
--     AND auth.role() = 'authenticated'
--   );

-- DROP POLICY IF EXISTS "product_images_owner_delete" ON storage.objects;
-- CREATE POLICY "product_images_owner_delete" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'product-images'
--     AND auth.role() = 'authenticated'
--   );


-- ============================================================
-- STEP 5d: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dsp_updated_at ON public.dead_stock_products;
CREATE TRIGGER trg_dsp_updated_at
  BEFORE UPDATE ON public.dead_stock_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- STEP 6: MARKETPLACE MERCHANT PROFILE VIEW
-- This is a convenience view the API can SELECT from.
-- It mirrors exactly the columns the frontend expects from
-- the "merchant" join object, sourced from public.shops.
-- ============================================================

CREATE OR REPLACE VIEW public.marketplace_merchant_profiles AS
SELECT
  s.id                                       AS shop_id,
  s.shop_name,
  COALESCE(s.location_address, '')           AS address,
  COALESCE(s.city, '')                       AS city,
  COALESCE(s.district, '')                   AS district,
  COALESCE(s.state, '')                      AS state,
  COALESCE(s.country, 'India')               AS country,
  -- Prefer contact_number for WhatsApp CTA; fall back to owner_phone
  COALESCE(s.contact_number, s.owner_phone)  AS whatsapp_number,
  COALESCE(s.google_maps_url, '')            AS google_maps_url,
  COALESCE(s.logo_url, '')                   AS shop_logo_url,
  COALESCE(s.marketplace_active, true)       AS is_active
FROM public.shops s
WHERE COALESCE(s.is_blocked, false) = false;


-- ============================================================
-- STEP 6b (OPTIONAL — Supabase Foreign Key Hint for PostgREST)
-- This tells PostgREST the relationship so the API route can
-- use the ?select=*,shop:shops(*) syntax for auto-joining.
-- ============================================================

COMMENT ON TABLE public.dead_stock_products IS
  'Hyper-local dead stock / factory clearance marketplace listings.
   Join with public.shops on dead_stock_products.shop_id = shops.id
   to retrieve merchant name, address, phone, and logo.
   Use the marketplace_merchant_profiles view for pre-shaped join columns.';

COMMENT ON COLUMN public.dead_stock_products.shop_id IS
  'FK → public.shops(id). The owning merchant shop.
   Join query example (Supabase JS):
     supabase.from(''dead_stock_products'')
       .select(''*, shop:shops(shop_name, contact_number, owner_phone,
                               location_address, city, district, state,
                               logo_url, google_maps_url)'')
       .eq(''is_cleared'', false)';

COMMENT ON COLUMN public.dead_stock_products.is_cleared IS
  'Core business logic gate.
   TRUE  → item is sold/cleared; EXCLUDED from public marketplace.
   FALSE → item is live on /broadcast/dead-stock.
   Merchant toggles this via PATCH /api/dead-stock from the dashboard.';


-- ============================================================
-- STEP 7: BACKFILL + AUTO-SYNC TRIGGER
-- ============================================================
--
-- ⚠️  DEVELOPER — ACTION REQUIRED:
-- ─────────────────────────────────────────────────────────────
-- The dead_stock_products table joins directly into public.shops
-- via shop_id. No separate merchants table is needed.
--
-- HOWEVER: The marketplace API and views reference the
-- marketplace_merchant_profiles view (defined above in Step 6),
-- which wraps public.shops.
--
-- To ensure every existing shop row is marketplace-visible:
--
--   1. Run the backfill UPDATE below to set marketplace_active = true
--      for all existing un-blocked shops.
--
--   2. UNCOMMENT the trigger below to auto-set marketplace_active = true
--      on new shop registrations going forward.
--
-- Uncomment and run:
-- ─────────────────────────────────────────────────────────────

-- BACKFILL: Mark all existing active shops as marketplace-ready
-- UPDATE public.shops
--   SET marketplace_active = true
--   WHERE COALESCE(is_blocked, false) = false;


-- TRIGGER FUNCTION: Auto-activate marketplace on new shop registration
-- CREATE OR REPLACE FUNCTION public.activate_marketplace_on_shop_create()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Newly registered shops are marketplace-active by default
--   -- unless they are blocked or explicitly opt out.
--   IF NEW.marketplace_active IS NULL THEN
--     NEW.marketplace_active := true;
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- DROP TRIGGER IF EXISTS trg_marketplace_activate ON public.shops;
-- CREATE TRIGGER trg_marketplace_activate
--   BEFORE INSERT ON public.shops
--   FOR EACH ROW EXECUTE FUNCTION public.activate_marketplace_on_shop_create();

-- ─────────────────────────────────────────────────────────────
-- After uncommenting and running, every shop in public.shops
-- automatically has a seamless row-per-shop join with
-- dead_stock_products via shop_id, with no duplicate data entry.
-- ─────────────────────────────────────────────────────────────
