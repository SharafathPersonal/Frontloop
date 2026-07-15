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
