-- ==============================================================================
-- SCHEMA MIGRATION: ADD BRAND STORY
-- ==============================================================================
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS brand_story TEXT;
