-- ==============================================================================
-- WEB PUSH BROADCAST FIX
-- Adds the missing broadcast_web_push column to persist merchant intent for scheduled offers.
-- ==============================================================================

ALTER TABLE public.shop_flash_offers 
ADD COLUMN IF NOT EXISTS broadcast_web_push BOOLEAN DEFAULT false NOT NULL;

NOTIFY pgrst, 'reload schema';
