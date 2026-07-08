-- ================================================================
-- TRUE ATTENDLY BROADCAST — Supabase PostgreSQL Schema Engine
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- Enable UUID generation extension
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------
-- 1. SHOPS MASTER TABLE
-- Links directly to Supabase Auth user row (1:1 relationship)
-- ----------------------------------------------------------------
create table if not exists public.shops (
    id uuid references auth.users on delete cascade primary key,
    shop_name text not null,
    owner_phone text not null,
    industry_type text not null,
    meta_access_token text,
    meta_phone_number_id text,
    meta_business_account_id text,
    meta_template_name text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.shops is 'One row per registered merchant workspace, keyed to auth.users.id';

-- ----------------------------------------------------------------
-- 2. CREDIT WALLET LEDGER
-- One wallet per shop. credits_remaining must always be >= 0.
-- ----------------------------------------------------------------
create table if not exists public.wallets (
    shop_id uuid references public.shops(id) on delete cascade primary key,
    credits_remaining bigint not null default 0,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint check_positive_credits check (credits_remaining >= 0)
);

comment on table public.wallets is 'Pay-as-you-send credit ledger. 1 credit = 1 WhatsApp message dispatched.';

-- ----------------------------------------------------------------
-- 3. OUTBOUND CAMPAIGNS (BROADCAST STORIES)
-- ----------------------------------------------------------------
create table if not exists public.campaigns (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid references public.shops(id) on delete cascade not null,
    title text not null,
    message_body text not null,
    image_url text,
    status text not null default 'pending'
        check (status in ('pending', 'processing', 'completed', 'insufficient_credits')),
    total_recipients integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.campaigns is 'Each broadcast campaign. status transitions: pending → processing → completed | insufficient_credits';
comment on column public.campaigns.status is 'pending | processing | completed | insufficient_credits';

-- ================================================================
-- ROW LEVEL SECURITY (RLS) — Strict per-shop isolation
-- ================================================================

-- Enable RLS on all tables
alter table public.shops enable row level security;
alter table public.wallets enable row level security;
alter table public.campaigns enable row level security;

-- ── Shops policies ────────────────────────────────────────────────

-- Drop existing policies if re-running this migration
drop policy if exists "Users can view and edit their own shop profile" on public.shops;

create policy "Users can view and edit their own shop profile"
    on public.shops
    for all
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- ── Wallets policies ──────────────────────────────────────────────

drop policy if exists "Users can view their own wallet balances" on public.wallets;
drop policy if exists "Users can update their own wallet" on public.wallets;

create policy "Users can view their own wallet balances"
    on public.wallets
    for select
    using (auth.uid() = shop_id);

create policy "Users can update their own wallet"
    on public.wallets
    for update
    using (auth.uid() = shop_id)
    with check (auth.uid() = shop_id);

create policy "Users can insert their own wallet"
    on public.wallets
    for insert
    with check (auth.uid() = shop_id);

-- ── Campaigns policies ────────────────────────────────────────────

drop policy if exists "Users can manage their own campaigns" on public.campaigns;

create policy "Users can manage their own campaigns"
    on public.campaigns
    for all
    using (auth.uid() = shop_id)
    with check (auth.uid() = shop_id);

-- ================================================================
-- INDEXES — Performance optimization
-- ================================================================

create index if not exists idx_campaigns_shop_id on public.campaigns(shop_id);
create index if not exists idx_campaigns_created_at on public.campaigns(created_at desc);
create index if not exists idx_campaigns_status on public.campaigns(status);

-- ================================================================
-- HELPER FUNCTION: Safe credit deduction (prevents going negative)
-- Call via: select deduct_credits('<shop_id>', <amount>);
-- Returns: boolean (true if deducted, false if insufficient credits)
-- ================================================================

create or replace function public.deduct_credits(p_shop_id uuid, p_amount integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current bigint;
begin
  -- Lock the wallet row for this transaction
  select credits_remaining into v_current
  from public.wallets
  where shop_id = p_shop_id
  for update;

  if v_current is null or v_current < p_amount then
    return false;
  end if;

  update public.wallets
  set
    credits_remaining = credits_remaining - p_amount,
    updated_at = now()
  where shop_id = p_shop_id;

  return true;
end;
$$;

comment on function public.deduct_credits is 'Atomic credit deduction with negative-balance guard. Returns false if insufficient.';

-- ================================================================
-- VERIFICATION QUERIES (run after migration to confirm setup)
-- ================================================================
-- select * from public.shops limit 5;
-- select * from public.wallets limit 5;
-- select * from public.campaigns limit 5;
-- select tablename, policyname, cmd from pg_policies where schemaname = 'public';
