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
