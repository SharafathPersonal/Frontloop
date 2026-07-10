-- ==============================================================================
-- TRUE ATTENDLY BROADCAST — Template Lifecycle Hardening Migration
-- Adds: rejection_reason, meta_template_id, updated_at, shop-scoped unique index
-- Run ONCE in Supabase SQL Editor → New Query → Run  (safe to re-run)
-- ==============================================================================

-- Add missing columns to message_templates
ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS meta_template_id  TEXT,
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();

-- Remove old blanket unique index on template_name if it exists (was too broad)
DROP INDEX IF EXISTS public.message_templates_template_name_key;

-- Unique index scoped per shop — prevents cross-shop collision in webhook matching
-- (allows multiple shops to each have a template called "promo_1")
CREATE UNIQUE INDEX IF NOT EXISTS message_templates_shop_name_unique
  ON public.message_templates (shop_id, template_name);

SELECT 'Template lifecycle migration applied successfully.' AS result;
