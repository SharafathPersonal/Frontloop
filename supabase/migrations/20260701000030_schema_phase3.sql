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
