-- ==============================================================================
-- FLASH OFFERS SCHEDULING ENGINE MIGRATION
-- ==============================================================================

-- 1. Add scheduling columns to shop_flash_offers table
ALTER TABLE public.shop_flash_offers 
ADD COLUMN IF NOT EXISTS start_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
ADD COLUMN IF NOT EXISTS end_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' NOT NULL,
ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT false NOT NULL;

-- 2. Backfill start_at with created_at for any pre-existing rows
UPDATE public.shop_flash_offers 
SET start_at = created_at 
WHERE start_at IS NULL;

-- 3. Set correct status for already expired offers
UPDATE public.shop_flash_offers
SET status = 'expired'
WHERE end_at IS NOT NULL AND end_at <= NOW();

-- 4. Reload cache for PostgREST
NOTIFY pgrst, 'reload schema';
