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
