-- ==============================================================================
-- LIVE IN-STORE FLASH OFFERS — Database Layer Specification
-- Version: 1.0.0 | TRUE ATTENDLY BROADCAST
-- ==============================================================================

-- 1. FLASH OFFERS TABLE (Soft-delete + Analytics)
CREATE TABLE IF NOT EXISTS public.shop_flash_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
    product_name TEXT NOT NULL,
    offer_description TEXT,  -- AI-polished marketing copy
    original_price NUMERIC(10, 2) NOT NULL,
    discount_price NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,  -- SOFT DELETE FLAG
    views_count INT DEFAULT 0 NOT NULL,         -- QUICK ANALYTICS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for high-performance tenant fetching and fuzzy search execution
CREATE INDEX IF NOT EXISTS idx_flash_offers_lookup 
    ON public.shop_flash_offers (shop_id, is_active, is_deleted);

-- 2. ADD SLUG COLUMN TO SHOPS TABLE (for public-facing URLs)
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Backfill slugs from existing shop names (lowercase, hyphenated, unique)
-- This creates slugs like "johns-bakery" from "John's Bakery"
DO $$
DECLARE
    r RECORD;
    base_slug TEXT;
    final_slug TEXT;
    counter INT;
BEGIN
    FOR r IN SELECT id, shop_name FROM public.shops WHERE slug IS NULL
    LOOP
        -- Generate base slug: lowercase, replace non-alphanumeric with hyphens, trim
        base_slug := lower(regexp_replace(r.shop_name, '[^a-zA-Z0-9]+', '-', 'g'));
        base_slug := trim(BOTH '-' FROM base_slug);
        
        -- Ensure uniqueness
        final_slug := base_slug;
        counter := 1;
        WHILE EXISTS (SELECT 1 FROM public.shops WHERE slug = final_slug AND id != r.id) LOOP
            final_slug := base_slug || '-' || counter;
            counter := counter + 1;
        END LOOP;
        
        UPDATE public.shops SET slug = final_slug WHERE id = r.id;
    END LOOP;
END $$;

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.shop_flash_offers ENABLE ROW LEVEL SECURITY;

-- Merchants can manage their own offers
CREATE POLICY "Flash offers merchant isolation" 
    ON public.shop_flash_offers 
    FOR ALL 
    USING (auth.uid() = shop_id);

-- Public read access for active, non-deleted offers (customer portal)
CREATE POLICY "Flash offers public read" 
    ON public.shop_flash_offers 
    FOR SELECT 
    USING (is_active = true AND is_deleted = false);

-- 4. ATOMIC VIEW COUNT INCREMENT RPC
CREATE OR REPLACE FUNCTION public.increment_flash_offer_views(p_shop_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.shop_flash_offers
    SET views_count = views_count + 1,
        updated_at = NOW()
    WHERE shop_id = p_shop_id 
      AND is_active = true 
      AND is_deleted = false;
END;
$$;

-- 5. AUTO-UPDATE TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.update_flash_offer_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flash_offer_updated ON public.shop_flash_offers;
CREATE TRIGGER trg_flash_offer_updated
    BEFORE UPDATE ON public.shop_flash_offers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_flash_offer_timestamp();
