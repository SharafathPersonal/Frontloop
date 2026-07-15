-- ==============================================================================
-- PHASE 2: ATOMIC TRANSACTION & IDEMPOTENCY GUARD FOR CASHFREE WEBHOOK
-- Exposes process_payment_atomically to prevent TOCTOU race conditions
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.process_payment_atomically(
  p_order_id TEXT,
  p_shop_id UUID,
  p_amount NUMERIC,
  p_credits INT,
  p_payment_status TEXT DEFAULT 'SUCCESS'
) RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Atomic Idempotency Check & Logging
  INSERT INTO public.payment_logs (order_id, shop_id, amount, credits_credited, payment_status, created_at)
  VALUES (p_order_id, p_shop_id, p_amount, p_credits, p_payment_status, NOW())
  ON CONFLICT (order_id) DO NOTHING;

  -- 2. Atomic Wallet Update ONLY if the insert succeeded (first-time processing)
  IF FOUND THEN
    INSERT INTO public.wallets (shop_id, credits_remaining, updated_at)
    VALUES (p_shop_id, p_credits, NOW())
    ON CONFLICT (shop_id) 
    DO UPDATE SET 
      credits_remaining = public.wallets.credits_remaining + p_credits,
      updated_at = NOW();
      
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
