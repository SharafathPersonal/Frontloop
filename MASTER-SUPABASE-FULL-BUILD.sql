-- ==============================================================================
-- FILE: supabase-schema.sql
-- ==============================================================================

-- ==============================================================================
-- PHASE 1: THE DEFINITIVE POSTGRESQL SCHEMA ENGINE
-- DANGER: This will drop existing tables to apply the new architecture cleanly.
-- ==============================================================================

drop table if exists public.pricing_tiers cascade;
drop table if exists public.payment_logs cascade;
drop table if exists public.campaigns cascade;
drop table if exists public.customers_master cascade;
drop table if exists public.wallets cascade;
drop table if exists public.shops cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. SHOPS MASTER TABLE (Linked to Supabase Auth)
create table public.shops (
    id uuid references auth.users on delete cascade primary key,
    shop_name text not null,
    owner_phone text not null,
    contact_number text,
    location_address text,
    city text,
    district text,
    state text,
    country text,
    is_blocked boolean default false,
    industry_type text not null,
    meta_access_token text,
    meta_phone_number_id text,
    meta_business_account_id text,
    meta_template_name text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. CREDIT WALLET LEDGER
create table public.wallets (
    shop_id uuid references public.shops(id) on delete cascade primary key,
    credits_remaining bigint not null default 0,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint check_positive_credits check (credits_remaining >= 0)
);

-- 3. CUSTOMERS MASTER DISPATCH TABLE
create table public.customers_master (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid references public.shops(id) on delete cascade not null,
    customer_name text not null,
    whatsapp_number text not null,
    tags text[] default '{}'::text[], -- e.g., ['VIP', 'Regular']
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_shop_whatsapp unique (shop_id, whatsapp_number)
);

-- 4. OUTBOUND CAMPAIGNS & WHATSAPP LOGS TABLE
create table public.campaigns (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid references public.shops(id) on delete cascade not null,
    title text not null,
    message_body text not null,
    image_url text,
    status text not null default 'pending', -- pending, processing, completed, failed, insufficient_credits
    total_recipients integer not null default 0,
    total_sent integer not null default 0,
    total_delivered integer not null default 0,
    total_read integer not null default 0,
    total_failed integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4.5. MESSAGE LOGS FOR WEBHOOK MAPPING
create table public.message_logs (
    id uuid default gen_random_uuid() primary key,
    campaign_id uuid references public.campaigns(id) on delete cascade not null,
    meta_message_id text not null unique,
    recipient_phone text not null,
    status text not null default 'sent', -- sent, delivered, read, failed
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. PAYMENT TRANSACTION HISTORY LEDGER (Cashfree/Gateway Logs)
create table public.payment_logs (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid references public.shops(id) on delete cascade not null,
    order_id text not null unique,
    amount numeric(10, 2) not null,
    credits_credited integer not null,
    payment_status text not null default 'pending', -- pending, success, failed
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. DYNAMIC PRICING ENGINE TIERS
create table public.pricing_tiers (
    id serial primary key,
    amount_inr numeric(10, 2) not null,
    credit_count integer not null,
    per_message_rate numeric(10, 2) generated always as (amount_inr / credit_count) stored,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default pricing packages
insert into public.pricing_tiers (amount_inr, credit_count) values 
(199, 50),
(349, 100),
(599, 200),
(1299, 500);

-- ==============================================================================
-- PHASE 2: SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- Enable absolute isolation so shop owners can never read or mutate other users
-- ==============================================================================

alter table public.shops enable row level security;
alter table public.wallets enable row level security;
alter table public.customers_master enable row level security;
alter table public.campaigns enable row level security;
alter table public.message_logs enable row level security;
alter table public.payment_logs enable row level security;
alter table public.pricing_tiers enable row level security;

-- Setup explicit user context verification checks
create policy "Shops isolation" on public.shops for all using (auth.uid() = id);
create policy "Wallets isolation" on public.wallets for all using (auth.uid() = shop_id);
create policy "Customers isolation" on public.customers_master for all using (auth.uid() = shop_id);
create policy "Campaigns isolation" on public.campaigns for all using (auth.uid() = shop_id);
-- Message logs isolation assumes shop_id is not directly on message_logs, but we can bypass RLS for webhook via service_role
create policy "Payment logs isolation" on public.payment_logs for all using (auth.uid() = shop_id);
create policy "Pricing tiers are viewable by everyone" on public.pricing_tiers for select using (true);

-- ==============================================================================
-- PHASE 3: ATOMIC WALLET DEDUCTION RPC
-- Safely decrement credits exactly by 1 (or amount) ensuring no race conditions
-- ==============================================================================
create or replace function public.deduct_credits(p_shop_id uuid, p_amount integer)
returns void
language plpgsql
security definer
as $$
begin
    update public.wallets
    set credits_remaining = credits_remaining - p_amount,
        updated_at = now()
    where shop_id = p_shop_id and credits_remaining >= p_amount;

    if not found then
        raise exception 'Insufficient credits or wallet not found';
    end if;
end;
$$;

-- ==============================================================================
-- PHASE 4: ATOMIC WALLET INCREMENT RPC
-- Safely increment credits atomically from webhooks to prevent race conditions
-- ==============================================================================
create or replace function public.increment(row_id uuid, value integer)
returns void
language plpgsql
security definer
as $$
begin
    update public.wallets
    set credits_remaining = credits_remaining + value,
        updated_at = now()
    where shop_id = row_id;
end;
$$;

-- ==============================================================================
-- PHASE 5: FOUNDER SUPPORT & FEEDBACK CENTER
-- Tracks all merchant tickets and feedback submissions securely
-- ==============================================================================
create table public.shop_feedbacks (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid references public.shops(id) on delete cascade not null,
    rating integer not null check (rating >= 1 and rating <= 5),
    category text not null,
    message text not null,
    status text not null default 'open',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.shop_feedbacks enable row level security;
create policy "Feedbacks isolation" on public.shop_feedbacks for all using (auth.uid() = shop_id);

-- ==============================================================================
-- PHASE 6: USER ACTIVITY LOGS
-- ==============================================================================
create table public.user_activity_logs (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid references public.shops(id) on delete cascade not null,
    account_email text not null,
    action_type text not null, -- 'LOGIN' or 'LOGOUT'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_activity_logs enable row level security;
create policy "User activity logs isolation" on public.user_activity_logs for all using (auth.uid() = shop_id);

-- ==============================================================================
-- PHASE 7: REAL-TIME CAMPAIGN ANALYTICS SYNC
-- Helper RPC to safely increment sent count on broadcast dispatch
-- ==============================================================================
create or replace function public.increment_campaign_sent(campaign_row_id uuid, quantity integer)
returns void
language plpgsql
security definer
as $$
begin
    update public.campaigns
    set total_sent = total_sent + quantity
    where id = campaign_row_id;
end;
$$;

create or replace function public.increment_campaign_metric(campaign_row_id uuid, metric_name text, quantity integer)
returns void
language plpgsql
security definer
as $$
begin
    if metric_name = 'delivered' then
        update public.campaigns set total_delivered = total_delivered + quantity where id = campaign_row_id;
    elsif metric_name = 'read' then
        update public.campaigns set total_read = total_read + quantity where id = campaign_row_id;
    elsif metric_name = 'failed' then
        update public.campaigns set total_failed = total_failed + quantity where id = campaign_row_id;
    end if;
end;
$$;


-- ==============================================================================
-- FILE: supabase-migration-add-is-saved-to-phone.sql
-- ==============================================================================

-- Add is_saved_to_phone column to customers_master
ALTER TABLE public.customers_master 
ADD COLUMN IF NOT EXISTS is_saved_to_phone BOOLEAN DEFAULT false;

-- Create an index to speed up querying
CREATE INDEX IF NOT EXISTS idx_customers_master_is_saved_to_phone ON public.customers_master(is_saved_to_phone);
NOTIFY pgrst, 'reload schema';


-- ==============================================================================
-- FILE: supabase-migration-catchup.sql
-- ==============================================================================

-- ==============================================================================
-- TRUE ATTENDLY BROADCAST — Schema Catch-Up & Web Push Migration
-- Run this entire script in the Supabase SQL Editor to fix missing columns
-- and enable the new Push Notification features.
-- ==============================================================================

-- 1. ADD ALL POTENTIALLY MISSING COLUMNS TO FLASH OFFERS
ALTER TABLE public.shop_flash_offers ADD COLUMN IF NOT EXISTS offer_description TEXT;
ALTER TABLE public.shop_flash_offers ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.shop_flash_offers ADD COLUMN IF NOT EXISTS show_percentage_badge BOOLEAN DEFAULT true;
ALTER TABLE public.shop_flash_offers ADD COLUMN IF NOT EXISTS show_discount_price BOOLEAN DEFAULT true;
ALTER TABLE public.shop_flash_offers ADD COLUMN IF NOT EXISTS push_sent_count INT DEFAULT 0 NOT NULL;
ALTER TABLE public.shop_flash_offers ADD COLUMN IF NOT EXISTS push_opened_count INT DEFAULT 0 NOT NULL;

-- 2. CREATE PUSH SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT,
    auth TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for high-performance lookup of subscribers per shop
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_shop_id 
    ON public.push_subscriptions (shop_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow public write/inserts so browser clients can register push endpoints anonymously
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'push_subscriptions' AND policyname = 'Allow public insert to push_subscriptions'
    ) THEN
        CREATE POLICY "Allow public insert to push_subscriptions"
            ON public.push_subscriptions
            FOR INSERT
            WITH CHECK (true);
    END IF;
END
$$;

-- Allow merchants to view their subscriber count and endpoints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'push_subscriptions' AND policyname = 'Allow merchants to select their own subscriptions'
    ) THEN
        CREATE POLICY "Allow merchants to select their own subscriptions"
            ON public.push_subscriptions
            FOR SELECT
            USING (auth.uid() = shop_id);
    END IF;
END
$$;

-- 3. CREATE ATOMIC CLICK TRACKING RPC FUNCTION
CREATE OR REPLACE FUNCTION public.increment_flash_offer_clicks(p_offer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.shop_flash_offers
    SET push_opened_count = push_opened_count + 1,
        updated_at = NOW()
    WHERE id = p_offer_id;
END;
$$;

-- 4. RELOAD SUPABASE SCHEMA CACHE
-- This instantly fixes the "Could not find the column in the schema cache" error
NOTIFY pgrst, 'reload schema';


-- ==============================================================================
-- FILE: supabase-migration-credit-usage-ledger.sql
-- ==============================================================================

-- ==============================================================================
-- TRUE ATTENDLY BROADCAST — CREDIT USAGE LEDGER VIEW
-- Run this ONCE in Supabase SQL Editor → New Query → Run
-- It is fully idempotent (safe to run multiple times).
-- ==============================================================================

-- Create a unified security-defined view for credit usage tracking
create or replace view public.credit_usage_ledger as
select 
    id, 
    shop_id, 
    'WhatsApp Campaign' as usage_type, 
    title as reference_name, 
    (total_sent::numeric * 1.0) as credits, 
    created_at 
from public.campaigns
union all
select 
    id, 
    shop_id, 
    'Email Marketing' as usage_type, 
    subject as reference_name, 
    (total_recipients::numeric * 0.5) as credits, 
    created_at 
from public.email_campaigns
union all
select 
    id, 
    shop_id, 
    'Digital Bill Dynamic QR' as usage_type, 
    invoice_number as reference_name, 
    1.00 as credits, 
    created_at 
from public.digital_invoices
where status = 'delivered';

-- ==============================================================================
-- HARDENED STATS SYNCHRONIZATION RPCs
-- Transparently handles updates for both campaigns and email_campaigns
-- ==============================================================================
create or replace function public.increment_campaign_sent(campaign_row_id uuid, quantity integer)
returns void
language plpgsql
security definer
as $$
begin
    update public.campaigns
    set total_sent = total_sent + quantity
    where id = campaign_row_id;

    update public.email_campaigns
    set total_sent = total_sent + quantity
    where id = campaign_row_id;
end;
$$;

create or replace function public.increment_campaign_metric(campaign_row_id uuid, metric_name text, quantity integer)
returns void
language plpgsql
security definer
as $$
begin
    if metric_name = 'delivered' then
        update public.campaigns set total_delivered = total_delivered + quantity where id = campaign_row_id;
        update public.email_campaigns set total_delivered = total_delivered + quantity where id = campaign_row_id;
    elsif metric_name = 'read' then
        update public.campaigns set total_read = total_read + quantity where id = campaign_row_id;
    elsif metric_name = 'failed' then
        update public.campaigns set total_failed = total_failed + quantity where id = campaign_row_id;
        update public.email_campaigns set total_failed = total_failed + quantity where id = campaign_row_id;
    end if;
end;
$$;


-- ==============================================================================
-- FILE: supabase-migration-digital-billing-rpc.sql
-- ==============================================================================

-- ==============================================================================
-- TRUE ATTENDLY BROADCAST — DIGITAL BILLING & LEADS MIGRATION
-- Run this ONCE in Supabase SQL Editor → New Query → Run
-- It is fully idempotent (safe to run multiple times).
-- ==============================================================================

-- 1. RPC: create_digital_invoice_with_items
-- Handles parent digital_invoices insert and child invoice_items insert atomically
CREATE OR REPLACE FUNCTION public.create_digital_invoice_with_items(
    p_shop_id uuid,
    p_invoice_number text,
    p_customer_name text,
    p_total_amount numeric,
    p_pdf_url text,
    p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice_id uuid;
    v_item jsonb;
    v_result jsonb;
BEGIN
    -- 1. Insert the parent invoice row
    INSERT INTO public.digital_invoices (
        shop_id,
        invoice_number,
        customer_name,
        customer_phone,
        total_amount,
        pdf_url,
        status
    ) VALUES (
        p_shop_id,
        p_invoice_number,
        p_customer_name,
        NULL,
        p_total_amount,
        p_pdf_url,
        'pending'
    )
    RETURNING id INTO v_invoice_id;

    -- 2. Loop and insert child items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.invoice_items (
            invoice_id,
            product_name,
            barcode_or_serial,
            quantity,
            price,
            item_total
        ) VALUES (
            v_invoice_id,
            v_item->>'product_name',
            v_item->>'barcode_or_serial',
            (v_item->>'quantity')::integer,
            (v_item->>'price')::numeric,
            (v_item->>'item_total')::numeric
        );
    END LOOP;

    -- 3. Return the created invoice data
    SELECT jsonb_build_object(
        'id', v_invoice_id,
        'invoice_number', p_invoice_number,
        'customer_name', p_customer_name,
        'total_amount', p_total_amount,
        'pdf_url', p_pdf_url,
        'status', 'pending'
    ) INTO v_result;

    RETURN v_result;
END;
$$;


-- 2. RPC: upsert_customer_lead_tags
-- Handles atomic upsert into customers_master appending a static tag without duplicates
CREATE OR REPLACE FUNCTION public.upsert_customer_lead_tags(
    p_shop_id uuid,
    p_customer_name text,
    p_whatsapp_number text,
    p_tag text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.customers_master (
        shop_id,
        customer_name,
        whatsapp_number,
        tags,
        source
    ) VALUES (
        p_shop_id,
        p_customer_name,
        p_whatsapp_number,
        ARRAY[p_tag],
        p_tag
    )
    ON CONFLICT (shop_id, whatsapp_number)
    DO UPDATE SET
        tags = ARRAY(
            SELECT DISTINCT e 
            FROM unnest(array_cat(customers_master.tags, ARRAY[p_tag]::text[])) AS e
        ),
        source = EXCLUDED.source;
END;
$$;


-- ==============================================================================
-- FILE: supabase-migration-digital-invoices.sql
-- ==============================================================================

-- Create digital_invoices table
CREATE TABLE IF NOT EXISTS public.digital_invoices (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid references public.shops(id) on delete cascade not null,
    invoice_number varchar not null,
    customer_phone varchar,
    customer_name varchar,
    total_amount decimal not null,
    pdf_url text,
    status varchar not null default 'pending', -- pending, delivered, failed
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS and isolate by shop_id
ALTER TABLE public.digital_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Digital Invoices isolation" ON public.digital_invoices;
CREATE POLICY "Digital Invoices isolation" ON public.digital_invoices FOR ALL USING (auth.uid() = shop_id);


-- ==============================================================================
-- FILE: supabase-migration-dispatcher-hardening.sql
-- ==============================================================================

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
-- SECTION 10: message_logs RLS policy
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage message logs of their campaigns" ON public.message_logs;
CREATE POLICY "Users can manage message logs of their campaigns"
  ON public.message_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = message_logs.campaign_id
        AND c.shop_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND c.shop_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 'Migration applied successfully. All systems nominal.' AS result;


-- ==============================================================================
-- FILE: supabase-migration-flash-offers-image-url.sql
-- ==============================================================================

-- ==============================================================================
-- SQL Migration: Add image_url column to shop_flash_offers table
-- Version: 1.1.0 | TRUE ATTENDLY BROADCAST
-- ==============================================================================

ALTER TABLE public.shop_flash_offers ADD COLUMN IF NOT EXISTS image_url TEXT;


-- ==============================================================================
-- FILE: supabase-migration-flash-offers-repair.sql
-- ==============================================================================

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


-- ==============================================================================
-- FILE: supabase-migration-flash-offers-scheduling.sql
-- ==============================================================================

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


-- ==============================================================================
-- FILE: supabase-migration-flash-offers-shares.sql
-- ==============================================================================

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


-- ==============================================================================
-- FILE: supabase-migration-flash-offers-visibility.sql
-- ==============================================================================

-- ==============================================================================
-- FLASH OFFERS VISIBILITY FIELDS MIGRATION
-- ==============================================================================

ALTER TABLE public.shop_flash_offers 
ADD COLUMN IF NOT EXISTS show_percentage_badge BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS show_discount_price BOOLEAN DEFAULT true NOT NULL;


-- ==============================================================================
-- FILE: supabase-migration-flash-offers.sql
-- ==============================================================================

-- ==============================================================================
-- LIVE IN-STORE FLASH OFFERS — Database Layer Specification
-- Version: 1.0.0 | TRUE ATTENDLY BROADCAST
-- ==============================================================================

-- 1. FLASH OFFERS TABLE (Soft-delete + Analytics)
CREATE TABLE IF NOT EXISTS public.shop_flash_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
    product_name TEXT NOT NULL,
    offer_description TEXT,  -- AI-polished marketing copy
    original_price NUMERIC(10, 2) NOT NULL,
    discount_price NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,  -- SOFT DELETE FLAG
    views_count INT DEFAULT 0 NOT NULL,         -- QUICK ANALYTICS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for high-performance tenant fetching and fuzzy search execution
CREATE INDEX IF NOT EXISTS idx_flash_offers_lookup 
    ON public.shop_flash_offers (shop_id, is_active, is_deleted);

-- 2. ADD SLUG COLUMN TO SHOPS TABLE (for public-facing URLs)
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Backfill slugs from existing shop names (lowercase, hyphenated, unique)
-- This creates slugs like "johns-bakery" from "John's Bakery"
DO $$
DECLARE
    r RECORD;
    base_slug TEXT;
    final_slug TEXT;
    counter INT;
BEGIN
    FOR r IN SELECT id, shop_name FROM public.shops WHERE slug IS NULL
    LOOP
        -- Generate base slug: lowercase, replace non-alphanumeric with hyphens, trim
        base_slug := lower(regexp_replace(r.shop_name, '[^a-zA-Z0-9]+', '-', 'g'));
        base_slug := trim(BOTH '-' FROM base_slug);
        
        -- Ensure uniqueness
        final_slug := base_slug;
        counter := 1;
        WHILE EXISTS (SELECT 1 FROM public.shops WHERE slug = final_slug AND id != r.id) LOOP
            final_slug := base_slug || '-' || counter;
            counter := counter + 1;
        END LOOP;
        
        UPDATE public.shops SET slug = final_slug WHERE id = r.id;
    END LOOP;
END $$;

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.shop_flash_offers ENABLE ROW LEVEL SECURITY;

-- Merchants can manage their own offers
CREATE POLICY "Flash offers merchant isolation" 
    ON public.shop_flash_offers 
    FOR ALL 
    USING (auth.uid() = shop_id);

-- Public read access for active, non-deleted offers (customer portal)
CREATE POLICY "Flash offers public read" 
    ON public.shop_flash_offers 
    FOR SELECT 
    USING (is_active = true AND is_deleted = false);

-- 4. ATOMIC VIEW COUNT INCREMENT RPC
CREATE OR REPLACE FUNCTION public.increment_flash_offer_views(p_shop_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.shop_flash_offers
    SET views_count = views_count + 1,
        updated_at = NOW()
    WHERE shop_id = p_shop_id 
      AND is_active = true 
      AND is_deleted = false;
END;
$$;

-- 5. AUTO-UPDATE TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.update_flash_offer_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flash_offer_updated ON public.shop_flash_offers;
CREATE TRIGGER trg_flash_offer_updated
    BEFORE UPDATE ON public.shop_flash_offers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_flash_offer_timestamp();


-- ==============================================================================
-- FILE: supabase-migration-invoice-footer-note.sql
-- ==============================================================================

-- ==============================================================================
-- TRUE ATTENDLY BROADCAST — INVOICE FOOTER NOTE IMMUTABILITY MIGRATION
-- Run this ONCE in Supabase SQL Editor → New Query → Run
-- It is fully idempotent (safe to run multiple times).
-- ==============================================================================

-- 1. Add custom invoice footer note to the shops table (config field)
alter table public.shops 
add column if not exists invoice_footer_note text default 'Thank you for visiting! Please come again. ✨';

-- 2. Add snapshot invoice footer note to digital_invoices table (immutable field)
alter table public.digital_invoices 
add column if not exists invoice_footer_note text;

-- 3. Populate existing historical billing records with their shop settings footer note
update public.digital_invoices i
set invoice_footer_note = coalesce(s.invoice_footer_note, 'Thank you for visiting!')
from public.shops s
where i.shop_id = s.id and i.invoice_footer_note is null;

-- 4. Re-declare create_digital_invoice_with_items function
-- Fetch current active note and snapshot it into digital_invoices at checkout time
CREATE OR REPLACE FUNCTION public.create_digital_invoice_with_items(
    p_shop_id uuid,
    p_invoice_number text,
    p_customer_name text,
    p_total_amount numeric,
    p_pdf_url text,
    p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice_id uuid;
    v_item jsonb;
    v_result jsonb;
    v_footer_note text;
BEGIN
    -- Fetch the active invoice_footer_note configuration from shop
    SELECT coalesce(invoice_footer_note, 'Thank you for visiting!')
    INTO v_footer_note
    FROM public.shops
    WHERE id = p_shop_id;

    -- Default fallback if column value is empty string
    IF v_footer_note IS NULL OR trim(v_footer_note) = '' THEN
        v_footer_note := 'Thank you for visiting!';
    END IF;

    -- 1. Insert the parent invoice row with the snapshot note
    INSERT INTO public.digital_invoices (
        shop_id,
        invoice_number,
        customer_name,
        customer_phone,
        total_amount,
        pdf_url,
        status,
        invoice_footer_note
    ) VALUES (
        p_shop_id,
        p_invoice_number,
        p_customer_name,
        NULL,
        p_total_amount,
        p_pdf_url,
        'pending',
        v_footer_note
    )
    RETURNING id INTO v_invoice_id;

    -- 2. Loop and insert child items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.invoice_items (
            invoice_id,
            product_name,
            barcode_or_serial,
            quantity,
            price,
            item_total
        ) VALUES (
            v_invoice_id,
            v_item->>'product_name',
            v_item->>'barcode_or_serial',
            (v_item->>'quantity')::integer,
            (v_item->>'price')::numeric,
            (v_item->>'item_total')::numeric
        );
    END LOOP;

    -- 3. Return the created invoice data
    SELECT jsonb_build_object(
        'id', v_invoice_id,
        'invoice_number', p_invoice_number,
        'customer_name', p_customer_name,
        'total_amount', p_total_amount,
        'pdf_url', p_pdf_url,
        'status', 'pending'
    ) INTO v_result;

    RETURN v_result;
END;
$$;


-- ==============================================================================
-- FILE: supabase-migration-invoice-items.sql
-- ==============================================================================

-- 1. Extend the existing shops table with settings fields
alter table public.shops 
add column if not exists logo_url text null,
add column if not exists gst_number varchar(50) null,
add column if not exists invoice_theme_color varchar(20) default '#5C4033'; -- Default Warm Brown

-- 2. Create the items details table with serial/barcode indexes
create table if not exists public.invoice_items (
    id uuid default gen_random_uuid() primary key,
    invoice_id uuid references public.digital_invoices(id) on delete cascade,
    product_name varchar(255) not null,
    barcode_or_serial varchar(100) null,
    quantity integer default 1 not null,
    price decimal(10, 2) not null,
    item_total decimal(10, 2) not null
);

create index if not exists idx_items_barcode on public.invoice_items(barcode_or_serial);


-- ==============================================================================
-- FILE: supabase-migration-process-payment-atomically.sql
-- ==============================================================================

-- ==============================================================================
-- PHASE 2: ATOMIC TRANSACTION & IDEMPOTENCY GUARD FOR CASHFREE WEBHOOK
-- Exposes process_payment_atomically to prevent TOCTOU race conditions
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.process_payment_atomically(
  p_order_id TEXT,
  p_shop_id UUID,
  p_amount NUMERIC,
  p_credits INT,
  p_payment_status TEXT DEFAULT 'SUCCESS'
) RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Atomic Idempotency Check & Logging
  INSERT INTO public.payment_logs (order_id, shop_id, amount, credits_credited, payment_status, created_at)
  VALUES (p_order_id, p_shop_id, p_amount, p_credits, p_payment_status, NOW())
  ON CONFLICT (order_id) DO NOTHING;

  -- 2. Atomic Wallet Update ONLY if the insert succeeded (first-time processing)
  IF FOUND THEN
    INSERT INTO public.wallets (shop_id, credits_remaining, updated_at)
    VALUES (p_shop_id, p_credits, NOW())
    ON CONFLICT (shop_id) 
    DO UPDATE SET 
      credits_remaining = public.wallets.credits_remaining + p_credits,
      updated_at = NOW();
      
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- FILE: supabase-migration-template-lifecycle.sql
-- ==============================================================================

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


-- ==============================================================================
-- FILE: supabase-migration-templates-image-url.sql
-- ==============================================================================

-- SQL Migration: Add image_url column to message_templates table
ALTER TABLE public.message_templates ADD COLUMN IF NOT EXISTS image_url text;


-- ==============================================================================
-- FILE: supabase-migration-web-push-fix.sql
-- ==============================================================================

-- ==============================================================================
-- WEB PUSH BROADCAST FIX
-- Adds the missing broadcast_web_push column to persist merchant intent for scheduled offers.
-- ==============================================================================

ALTER TABLE public.shop_flash_offers 
ADD COLUMN IF NOT EXISTS broadcast_web_push BOOLEAN DEFAULT false NOT NULL;

NOTIFY pgrst, 'reload schema';


-- ==============================================================================
-- FILE: supabase-migration-web-push-unique.sql
-- ==============================================================================

-- ==============================================================================
-- WEB PUSH NOTIFICATION ENGINE — Database Constraint Optimization
-- Version: 1.0.1 | TRUE ATTENDLY BROADCAST
-- ==============================================================================

-- Ensure the push_subscriptions table has a UNIQUE constraint on the endpoint column
DO $$
BEGIN
    -- Drop the constraint if it exists to recreate it cleanly
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_endpoint_key'
    ) THEN
        ALTER TABLE public.push_subscriptions DROP CONSTRAINT push_subscriptions_endpoint_key;
    END IF;
    
    -- Add the UNIQUE constraint on the endpoint column
    ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
    
    -- Log the success
    RAISE NOTICE 'Successfully applied unique constraint on push_subscriptions(endpoint)';
END
$$;

-- Reload schema cache to ensure PostgREST registers the update instantly
NOTIFY pgrst, 'reload schema';


-- ==============================================================================
-- FILE: supabase-migration-web-push.sql
-- ==============================================================================

-- ==============================================================================
-- IN-FLASH WEB PUSH NOTIFICATION BROADCAST — Database Layer Specification
-- Version: 1.0.0 | TRUE ATTENDLY BROADCAST
-- ==============================================================================

-- 1. CREATE PUSH SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT,
    auth TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for high-performance lookup of subscribers per shop
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_shop_id 
    ON public.push_subscriptions (shop_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow public write/inserts so browser clients can register push endpoints anonymously
CREATE POLICY "Allow public insert to push_subscriptions"
    ON public.push_subscriptions
    FOR INSERT
    WITH CHECK (true);

-- Allow merchants to view their subscriber count and endpoints
CREATE POLICY "Allow merchants to select their own subscriptions"
    ON public.push_subscriptions
    FOR SELECT
    USING (auth.uid() = shop_id);

-- 2. ADD ANALYTICS TRACKING COLUMNS TO FLASH OFFERS TABLE
ALTER TABLE public.shop_flash_offers ADD COLUMN IF NOT EXISTS push_sent_count INT DEFAULT 0 NOT NULL;
ALTER TABLE public.shop_flash_offers ADD COLUMN IF NOT EXISTS push_opened_count INT DEFAULT 0 NOT NULL;

-- 3. CREATE ATOMIC CLICK TRACKING RPC FUNCTION
CREATE OR REPLACE FUNCTION public.increment_flash_offer_clicks(p_offer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.shop_flash_offers
    SET push_opened_count = push_opened_count + 1,
        updated_at = NOW()
    WHERE id = p_offer_id;
END;
$$;


-- ==============================================================================
-- FILE: supabase-schema-add-paused.sql
-- ==============================================================================

ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'paused_logout';


-- ==============================================================================
-- FILE: supabase-schema-atomic-campaign-stats.sql
-- ==============================================================================

-- 4. Create atomic increment_campaign_sent RPC
CREATE OR REPLACE FUNCTION increment_campaign_sent(campaign_row_id UUID, quantity INT) 
RETURNS void AS $$
BEGIN
  UPDATE campaigns 
  SET 
    total_sent = total_sent + quantity,
    total_delivered = total_delivered + quantity -- Optimistically set delivered
  WHERE id = campaign_row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- FILE: supabase-schema-atomic-credits.sql
-- ==============================================================================

-- 1. Ensure order_id is strictly unique to prevent double-crediting
ALTER TABLE payment_logs ADD CONSTRAINT uq_payment_logs_order_id UNIQUE (order_id);

-- 2. Create atomic add_credits RPC to prevent race conditions
CREATE OR REPLACE FUNCTION add_credits(p_shop_id UUID, p_amount INT) 
RETURNS void AS $$
BEGIN
  -- UPSERT logic: Insert if missing, otherwise atomically increment
  INSERT INTO wallets (shop_id, credits_remaining, updated_at)
  VALUES (p_shop_id, p_amount, NOW())
  ON CONFLICT (shop_id) 
  DO UPDATE SET 
    credits_remaining = wallets.credits_remaining + p_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- FILE: supabase-schema-atomic-deduct.sql
-- ==============================================================================

-- 3. Create atomic deduct_credits RPC to prevent negative balances and race conditions
CREATE OR REPLACE FUNCTION deduct_credits(p_shop_id UUID, p_amount INT) 
RETURNS void AS $$
BEGIN
  UPDATE wallets 
  SET 
    credits_remaining = credits_remaining - p_amount,
    updated_at = NOW()
  WHERE shop_id = p_shop_id AND credits_remaining >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits or wallet not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- FILE: supabase-schema-brand-story.sql
-- ==============================================================================

-- ==============================================================================
-- SCHEMA MIGRATION: ADD BRAND STORY
-- ==============================================================================
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS brand_story TEXT;


-- ==============================================================================
-- FILE: supabase-schema-credit-config.sql
-- ==============================================================================

-- 1. Create System Settings Table for Dynamic Credit Costs
CREATE TABLE IF NOT EXISTS public.system_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default values
INSERT INTO public.system_settings (key, value)
VALUES 
    ('whatsapp_credit_cost', 1.0),
    ('email_credit_cost', 0.5)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS (Read-only for public, Admin handles updates via service role or separate policy)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Config Read" ON public.system_settings FOR SELECT USING (true);

-- 2. Alter wallets to support decimals
ALTER TABLE public.wallets ALTER COLUMN credits_remaining TYPE NUMERIC(10, 2) USING credits_remaining::NUMERIC(10, 2);

-- 3. Replace deduct_credits to accept numeric
CREATE OR REPLACE FUNCTION public.deduct_credits(p_shop_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
    UPDATE public.wallets
    SET credits_remaining = credits_remaining - p_amount,
        updated_at = now()
    WHERE shop_id = p_shop_id AND credits_remaining >= p_amount;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient credits or wallet not found';
    END IF;
END;
$$;


-- ==============================================================================
-- FILE: supabase-schema-credits-used.sql
-- ==============================================================================

ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS credits_used bigint not null default 0;

CREATE OR REPLACE FUNCTION increment_credits_used(p_shop_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.wallets
    SET credits_used = credits_used + 1
    WHERE shop_id = p_shop_id;
END;
$$;


-- ==============================================================================
-- FILE: supabase-schema-dual-mode.sql
-- ==============================================================================

-- Supabase Schema Update for Dual Mode WhatsApp Engine

-- 1. Create ENUM for WhatsApp Mode
CREATE TYPE whatsapp_connection_mode AS ENUM ('META_API', 'QR_EXPRESS', 'NONE');

-- 2. Add columns to shops table
ALTER TABLE shops ADD COLUMN whatsapp_mode whatsapp_connection_mode DEFAULT 'NONE';
ALTER TABLE shops ADD COLUMN anti_ban_delay INT DEFAULT 45;

-- 3. Update existing shops to have META_API if they already have meta tokens
UPDATE shops 
SET whatsapp_mode = 'META_API' 
WHERE meta_access_token IS NOT NULL;

-- 4. Ensure campaigns table has a column to record how it was dispatched (optional but good for history)
ALTER TABLE campaigns ADD COLUMN dispatch_mode whatsapp_connection_mode DEFAULT 'META_API';

-- Update existing campaigns
UPDATE campaigns SET dispatch_mode = 'META_API';


-- ==============================================================================
-- FILE: supabase-schema-email-campaigns.sql
-- ==============================================================================

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


-- ==============================================================================
-- FILE: supabase-schema-phase3.sql
-- ==============================================================================

-- ================================================================
-- PHASE 3 SCHEMA EXTENSION: CUSTOMERS MASTER TABLE
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Adds: customers_master for audience management with tag support
-- ================================================================

-- ----------------------------------------------------------------
-- 4. CUSTOMERS MASTER TABLE
-- One row per unique phone number per shop. Upsert-safe.
-- ----------------------------------------------------------------
create table if not exists public.customers_master (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid references public.shops(id) on delete cascade not null,
    name text not null default '',
    phone text not null,
    tag text not null default 'Regular'
        check (tag in ('VIP', 'Regular', 'New')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_shop_phone unique (shop_id, phone)
);

comment on table public.customers_master is 'All known contacts per shop. Tag-classified for targeted broadcasting.';
comment on column public.customers_master.tag is 'VIP | Regular | New — used for targeted broadcast filtering';

-- Enable RLS
alter table public.customers_master enable row level security;

-- Drop & recreate policies (idempotent)
drop policy if exists "Users can manage their own customers" on public.customers_master;

create policy "Users can manage their own customers"
    on public.customers_master
    for all
    using (auth.uid() = shop_id)
    with check (auth.uid() = shop_id);

-- Performance indexes
create index if not exists idx_customers_shop_id on public.customers_master(shop_id);
create index if not exists idx_customers_tag on public.customers_master(shop_id, tag);
create index if not exists idx_customers_phone on public.customers_master(phone);

-- ================================================================
-- BROADCAST ASSET STORAGE BUCKET
-- Create via Supabase Dashboard → Storage → New Bucket
-- Name: broadcast-assets  |  Public: true
-- Or run the Supabase Management API call below (reference only):
-- POST /storage/v1/bucket { "id": "broadcast-assets", "public": true }
-- ================================================================


-- ==============================================================================
-- FILE: supabase-schema-qr-express-status.sql
-- ==============================================================================

ALTER TABLE shops ADD COLUMN qr_express_status TEXT DEFAULT 'disconnected';


-- ==============================================================================
-- FILE: supabase-schema-qr-leads.sql
-- ==============================================================================

-- Add source column to customers_master to segment QR leads
ALTER TABLE public.customers_master ADD COLUMN IF NOT EXISTS source text DEFAULT 'MANUAL';

-- Create qr_analytics table for efficient daily aggregation
CREATE TABLE IF NOT EXISTS public.qr_analytics (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid references public.shops(id) on delete cascade not null,
    scan_date date not null default current_date,
    scans integer not null default 0,
    credits_consumed numeric(10, 2) not null default 0,
    constraint unique_shop_date unique (shop_id, scan_date)
);

ALTER TABLE public.qr_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "QR Analytics isolation" ON public.qr_analytics;
CREATE POLICY "QR Analytics isolation" ON public.qr_analytics FOR ALL USING (auth.uid() = shop_id);

-- Atomic RPC for QR scan increment
CREATE OR REPLACE FUNCTION increment_qr_analytics(p_shop_id uuid, p_credits numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.qr_analytics (shop_id, scan_date, scans, credits_consumed)
    VALUES (p_shop_id, current_date, 1, p_credits)
    ON CONFLICT (shop_id, scan_date)
    DO UPDATE SET 
        scans = public.qr_analytics.scans + 1,
        credits_consumed = public.qr_analytics.credits_consumed + p_credits;
END;
$$;


-- ==============================================================================
-- FILE: supabase-schema-qr-vcf.sql
-- ==============================================================================

-- Add tracking columns for VCF export and broadcast sequence
ALTER TABLE public.customers_master ADD COLUMN IF NOT EXISTS is_exported_to_vcf boolean DEFAULT false;
ALTER TABLE public.customers_master ADD COLUMN IF NOT EXISTS serial_number integer;
ALTER TABLE public.customers_master ADD COLUMN IF NOT EXISTS loyalty_credits integer DEFAULT 0;

-- Create a trigger to assign a progressive serial_number per merchant (shop_id) when a new lead is inserted
CREATE OR REPLACE FUNCTION assign_customer_serial()
RETURNS trigger AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    SELECT COALESCE(MAX(serial_number), 0) + 1 INTO NEW.serial_number
    FROM public.customers_master
    WHERE shop_id = NEW.shop_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_customer_serial ON public.customers_master;
CREATE TRIGGER trg_assign_customer_serial
BEFORE INSERT ON public.customers_master
FOR EACH ROW
EXECUTE FUNCTION assign_customer_serial();


-- ==============================================================================
-- FILE: supabase-schema-system-logs.sql
-- ==============================================================================

-- ==============================================================================
-- ADD FAILURE REASON AND ERROR LOGGING SYSTEM
-- ==============================================================================

-- 1. Add failure_reason column to campaigns table if it doesn't exist
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- 2. Create system_logs table for global runtime failures
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    error_type VARCHAR(255) NOT NULL, -- e.g., 'WHATSAPP_SOCKET_ERROR', 'VERCEL_TIMEOUT'
    failure_reason TEXT NOT NULL,
    meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Security & Row Level Security (RLS) policies
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 4. Set RLS select policy for shop owner isolation
DROP POLICY IF EXISTS "Shops can view their own system logs" ON public.system_logs;
CREATE POLICY "Shops can view their own system logs" ON public.system_logs 
    FOR SELECT USING (auth.uid() = shop_id);


-- ==============================================================================
-- FILE: supabase-schema-templates.sql
-- ==============================================================================

-- Supabase Schema Update for Message Templates

CREATE TABLE message_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('MARKETING', 'UTILITY')),
  header_type VARCHAR(50) CHECK (header_type IN ('IMAGE', 'NONE')),
  body_text TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates" 
  ON message_templates FOR SELECT 
  USING (auth.uid() = shop_id);

CREATE POLICY "Users can insert their own templates" 
  ON message_templates FOR INSERT 
  WITH CHECK (auth.uid() = shop_id);

CREATE POLICY "Users can update their own templates" 
  ON message_templates FOR UPDATE 
  USING (auth.uid() = shop_id);

CREATE POLICY "Users can delete their own templates" 
  ON message_templates FOR DELETE 
  USING (auth.uid() = shop_id);


-- ==============================================================================
-- FILE: supabase-schema-whatsapp-sessions.sql
-- ==============================================================================

-- Supabase Schema for Baileys Auth State (Single Session / Optimized Schema)
CREATE TABLE public.whatsapp_sessions (
  id TEXT PRIMARY KEY,
  creds JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


