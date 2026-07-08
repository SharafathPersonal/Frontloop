-- ==============================================================================
-- PHASE 1: THE DEFINITIVE POSTGRESQL SCHEMA ENGINE
-- DANGER: This will drop existing tables to apply the new architecture cleanly.
-- ==============================================================================

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

-- ==============================================================================
-- PHASE 2: SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- Enable absolute isolation so shop owners can never read or mutate other users
-- ==============================================================================

alter table public.shops enable row level security;
alter table public.wallets enable row level security;
alter table public.customers_master enable row level security;
alter table public.campaigns enable row level security;
alter table public.payment_logs enable row level security;

-- Setup explicit user context verification checks
create policy "Shops isolation" on public.shops for all using (auth.uid() = id);
create policy "Wallets isolation" on public.wallets for all using (auth.uid() = shop_id);
create policy "Customers isolation" on public.customers_master for all using (auth.uid() = shop_id);
create policy "Campaigns isolation" on public.campaigns for all using (auth.uid() = shop_id);
create policy "Payment logs isolation" on public.payment_logs for all using (auth.uid() = shop_id);

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
