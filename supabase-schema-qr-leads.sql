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
