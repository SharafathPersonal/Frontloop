-- ==============================================================================
-- ADD FAILURE REASON AND ERROR LOGGING SYSTEM
-- ==============================================================================

-- 1. Add failure_reason column to campaigns table if it doesn't exist
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- 2. Create system_logs table for global runtime failures
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    error_type VARCHAR(255) NOT NULL, -- e.g., 'WHATSAPP_SOCKET_ERROR', 'VERCEL_TIMEOUT'
    failure_reason TEXT NOT NULL,
    meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Security & Row Level Security (RLS) policies
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 4. Set RLS select policy for shop owner isolation
DROP POLICY IF EXISTS "Shops can view their own system logs" ON public.system_logs;
CREATE POLICY "Shops can view their own system logs" ON public.system_logs 
    FOR SELECT USING (auth.uid() = shop_id);
