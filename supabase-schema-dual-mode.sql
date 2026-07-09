-- Supabase Schema Update for Dual Mode WhatsApp Engine

-- 1. Create ENUM for WhatsApp Mode
CREATE TYPE whatsapp_connection_mode AS ENUM ('META_API', 'QR_EXPRESS', 'NONE');

-- 2. Add columns to shops table
ALTER TABLE shops ADD COLUMN whatsapp_mode whatsapp_connection_mode DEFAULT 'NONE';
ALTER TABLE shops ADD COLUMN anti_ban_delay INT DEFAULT 45;

-- 3. Update existing shops to have META_API if they already have meta tokens
UPDATE shops 
SET whatsapp_mode = 'META_API' 
WHERE meta_access_token IS NOT NULL;

-- 4. Ensure campaigns table has a column to record how it was dispatched (optional but good for history)
ALTER TABLE campaigns ADD COLUMN dispatch_mode whatsapp_connection_mode DEFAULT 'META_API';

-- Update existing campaigns
UPDATE campaigns SET dispatch_mode = 'META_API';
