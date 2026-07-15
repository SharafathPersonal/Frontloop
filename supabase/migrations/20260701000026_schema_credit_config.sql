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
