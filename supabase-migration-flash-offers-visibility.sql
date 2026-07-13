-- ==============================================================================
-- FLASH OFFERS VISIBILITY FIELDS MIGRATION
-- ==============================================================================

ALTER TABLE public.shop_flash_offers 
ADD COLUMN IF NOT EXISTS show_percentage_badge BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS show_discount_price BOOLEAN DEFAULT true NOT NULL;
