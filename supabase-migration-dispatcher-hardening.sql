-- ==============================================================================
-- TRUE ATTENDLY BROADCAST — DEFINITIVE MIGRATION
-- Run this ONCE in Supabase SQL Editor → New Query → Run
-- It is fully idempotent (safe to run multiple times).
-- ==============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: shops — add missing runtime columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS whatsapp_mode      text    DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS qr_express_status  text    DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS anti_ban_delay     integer DEFAULT 45,
  ADD COLUMN IF NOT EXISTS meta_template_name text;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: campaigns — add missing counter + dispatch columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS dispatch_mode  text    DEFAULT 'QR_EXPRESS',
  ADD COLUMN IF NOT EXISTS total_sent     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_failed   integer NOT NULL DEFAULT 0;

-- Ensure total_delivered / total_read exist (may already be in schema)
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS total_delivered integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_read      integer NOT NULL DEFAULT 0;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: message_logs — fix the unique constraint + allow pending_dispatch
--
-- ROOT CAUSE: the original schema had `meta_message_id text NOT NULL UNIQUE`.
-- This blocks bulk pre-population of ledger rows with placeholder IDs.
-- Fix: drop blanket UNIQUE, make column nullable, add a SPARSE unique index
-- that only enforces uniqueness on real message IDs (not placeholders).
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 3a: drop the blanket UNIQUE constraint (by name or by inference)
DO $$
DECLARE
  cname text;
BEGIN
  SELECT constraint_name
    INTO cname
    FROM information_schema.table_constraints
   WHERE table_schema = 'public'
     AND table_name   = 'message_logs'
     AND constraint_type = 'UNIQUE'
     AND constraint_name LIKE '%meta_message_id%'
   LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.message_logs DROP CONSTRAINT %I', cname);
    RAISE NOTICE 'Dropped constraint: %', cname;
  ELSE
    RAISE NOTICE 'No meta_message_id UNIQUE constraint found — skipping drop.';
  END IF;
END $$;

-- Step 3b: make meta_message_id nullable
ALTER TABLE public.message_logs
  ALTER COLUMN meta_message_id DROP NOT NULL;

-- Step 3c: sparse unique index — only enforces uniqueness on REAL message IDs
--   Placeholders start with: pre_, pending_, failed_, meta_failed_, baileys_,
--   abort_no_socket_. Real IDs are opaque strings (e.g. "wamid.xxx", "mid.xxx").
DROP INDEX IF EXISTS public.message_logs_real_id_unique;

CREATE UNIQUE INDEX message_logs_real_id_unique
  ON public.message_logs (meta_message_id)
  WHERE meta_message_id IS NOT NULL
    AND meta_message_id NOT LIKE 'pre\_%'
    AND meta_message_id NOT LIKE 'pending\_%'
    AND meta_message_id NOT LIKE 'failed\_%'
    AND meta_message_id NOT LIKE 'meta\_failed\_%'
    AND meta_message_id NOT LIKE 'baileys\_%'
    AND meta_message_id NOT LIKE 'abort\_no\_socket\_%';

-- Step 3d: performance indexes for the dispatcher UPDATE patterns
CREATE INDEX IF NOT EXISTS message_logs_campaign_phone_idx
  ON public.message_logs (campaign_id, recipient_phone);

CREATE INDEX IF NOT EXISTS message_logs_campaign_status_idx
  ON public.message_logs (campaign_id, status);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: whatsapp_sessions table (for Baileys QR auth state)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id       uuid    REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  session_key   text    NOT NULL,
  session_value jsonb   NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_shop_session_key UNIQUE (shop_id, session_key)
);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sessions isolation" ON public.whatsapp_sessions;
CREATE POLICY "Sessions isolation"
  ON public.whatsapp_sessions
  FOR ALL
  USING (auth.uid() = shop_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: RPC — deduct_credits (idempotent replace)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.deduct_credits(p_shop_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.wallets
     SET credits_remaining = credits_remaining - p_amount,
         updated_at        = now()
   WHERE shop_id           = p_shop_id
     AND credits_remaining >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits or wallet not found for shop %', p_shop_id;
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: RPC — add_credits (for Cashfree webhook / admin credit top-up)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_credits(p_shop_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.wallets (shop_id, credits_remaining, updated_at)
    VALUES (p_shop_id, p_amount, now())
  ON CONFLICT (shop_id) DO UPDATE
    SET credits_remaining = wallets.credits_remaining + EXCLUDED.credits_remaining,
        updated_at        = now();
END;
$$;

-- Keep the legacy 'increment' alias pointing to the same logic
CREATE OR REPLACE FUNCTION public.increment(row_id uuid, value integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.wallets
     SET credits_remaining = credits_remaining + value,
         updated_at        = now()
   WHERE shop_id = row_id;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: RPC — increment_campaign_sent (idempotent replace)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_campaign_sent(campaign_row_id uuid, quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.campaigns
     SET total_sent = total_sent + quantity
   WHERE id = campaign_row_id;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8: RPC — increment_campaign_metric (idempotent replace)
-- Handles: delivered, read, failed
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_campaign_metric(
  campaign_row_id uuid,
  metric_name     text,
  quantity        integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF metric_name = 'delivered' THEN
    UPDATE public.campaigns
       SET total_delivered = total_delivered + quantity
     WHERE id = campaign_row_id;

  ELSIF metric_name = 'read' THEN
    UPDATE public.campaigns
       SET total_read = total_read + quantity
     WHERE id = campaign_row_id;

  ELSIF metric_name = 'failed' THEN
    UPDATE public.campaigns
       SET total_failed = total_failed + quantity
     WHERE id = campaign_row_id;

  ELSE
    RAISE WARNING 'Unknown metric_name: %', metric_name;
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9: Enable Realtime for live dashboard updates
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow Supabase Realtime to publish changes on these tables
-- (Only needed once per table; safe to re-run)
DO $$
BEGIN
  -- campaigns
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'campaigns'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
  END IF;

  -- message_logs
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'message_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_logs;
  END IF;

  -- shops (for QR status changes)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'shops'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shops;
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 'Migration applied successfully. All systems nominal.' AS result;
