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
