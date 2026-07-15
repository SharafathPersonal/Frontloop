-- ==============================================================================
-- SQL Migration: Add image_url column to shop_flash_offers table
-- Version: 1.1.0 | TRUE ATTENDLY BROADCAST
-- ==============================================================================

ALTER TABLE public.shop_flash_offers ADD COLUMN IF NOT EXISTS image_url TEXT;
