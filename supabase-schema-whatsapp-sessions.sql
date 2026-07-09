-- Supabase Schema for Baileys Auth State
CREATE TABLE whatsapp_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  session_key TEXT NOT NULL,
  session_value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, session_key)
);

CREATE INDEX idx_whatsapp_sessions_shop_id ON whatsapp_sessions(shop_id);
