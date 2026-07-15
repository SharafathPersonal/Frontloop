-- ==============================================================================
-- LIVE IN-STORE FLASH OFFERS — Infrastructure Repair Migration
-- Resolves: Forensic Data Audit Report (July 15, 2026)
-- ==============================================================================

-- 1. REFACTOR VIEW INCREMENT RPC TO TARGET OFFER ID
CREATE OR REPLACE FUNCTION public.increment_flash_offer_views(p_shop_id UUID, p_offer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.shop_flash_offers
    SET views_count = views_count + 1,
        updated_at = NOW()
    WHERE shop_id = p_shop_id 
      AND id = p_offer_id
      AND is_active = true 
      AND is_deleted = false;
END;
$$;

-- 2. ENFORCE COMPOSITE UNIQUENESS
-- Protect against race condition dual submissions and missing UI debounce hooks
ALTER TABLE public.shop_flash_offers 
  ADD CONSTRAINT unique_shop_product_start UNIQUE (shop_id, product_name, start_at);
