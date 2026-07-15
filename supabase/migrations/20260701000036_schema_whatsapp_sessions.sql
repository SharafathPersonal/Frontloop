-- Supabase Schema for Baileys Auth State (Single Session / Optimized Schema)
CREATE TABLE public.whatsapp_sessions (
  id TEXT PRIMARY KEY,
  creds JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
