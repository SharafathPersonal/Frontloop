-- ============================================================
-- TRUE ATTENDLY BROADCAST — Email Campaign Schema Migration
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Create the email_campaigns table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           uuid          NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title             text          NOT NULL,
  subject           text          NOT NULL,
  html_body         text          NOT NULL,
  status            text          NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','processing','completed','failed')),
  total_recipients  integer       NOT NULL DEFAULT 0,
  total_sent        integer       NOT NULL DEFAULT 0,
  total_delivered   integer       NOT NULL DEFAULT 0,
  total_failed      integer       NOT NULL DEFAULT 0,
  failure_reason    text,
  target_tags       text[]        NOT NULL DEFAULT '{}',
  created_at        timestamptz   NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- 3. RLS: each shop can only see/modify its own campaigns
CREATE POLICY "email_campaigns_owner_policy"
  ON public.email_campaigns
  FOR ALL
  USING (shop_id = auth.uid())
  WITH CHECK (shop_id = auth.uid());

-- 4. Indexes for fast dashboard queries
CREATE INDEX IF NOT EXISTS idx_email_campaigns_shop_id
  ON public.email_campaigns (shop_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status
  ON public.email_campaigns (shop_id, status);

-- ============================================================
-- INSTRUCTIONS:
-- 1. Open your Supabase project → SQL Editor
-- 2. Paste and run the entire block above
-- 3. Verify the table appears in Table Editor
-- ============================================================
