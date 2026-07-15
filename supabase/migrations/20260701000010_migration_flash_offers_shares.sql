-- ==============================================================================
-- FLASH OFFER SHARE TRACKING — Database Layer Specification
-- Version: 1.0.0 | TRUE ATTENDLY BROADCAST
-- ==============================================================================

-- 1. ADD TRACKING COLUMN FOR SHARES TO FLASH OFFERS TABLE
ALTER TABLE public.shop_flash_offers 
ADD COLUMN IF NOT EXISTS push_shared_count INT DEFAULT 0 NOT NULL;

-- 2. CREATE FUNCTION TO INCREMENT SHARE COUNTS ATOMICALLY
CREATE OR REPLACE FUNCTION public.increment_flash_offer_shares(p_offer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.shop_flash_offers
    SET push_shared_count = push_shared_count + 1,
        updated_at = NOW()
    WHERE id = p_offer_id;
END;
$$;

-- 3. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
