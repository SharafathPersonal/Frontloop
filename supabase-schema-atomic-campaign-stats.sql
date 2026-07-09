-- 4. Create atomic increment_campaign_sent RPC
CREATE OR REPLACE FUNCTION increment_campaign_sent(campaign_row_id UUID, quantity INT) 
RETURNS void AS $$
BEGIN
  UPDATE campaigns 
  SET 
    total_sent = total_sent + quantity,
    total_delivered = total_delivered + quantity -- Optimistically set delivered
  WHERE id = campaign_row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
