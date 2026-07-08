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
alter table public.payment_logs enable row level security;
alter table public.pricing_tiers enable row level security;

-- Setup explicit user context verification checks
create policy "Shops isolation" on public.shops for all using (auth.uid() = id);
create policy "Wallets isolation" on public.wallets for all using (auth.uid() = shop_id);
create policy "Customers isolation" on public.customers_master for all using (auth.uid() = shop_id);
create policy "Campaigns isolation" on public.campaigns for all using (auth.uid() = shop_id);
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
