-- ==============================================================================
-- WEB PUSH NOTIFICATION ENGINE — Database Constraint Optimization
-- Version: 1.0.1 | TRUE ATTENDLY BROADCAST
-- ==============================================================================

-- Ensure the push_subscriptions table has a UNIQUE constraint on the endpoint column
DO $$
BEGIN
    -- Drop the constraint if it exists to recreate it cleanly
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_endpoint_key'
    ) THEN
        ALTER TABLE public.push_subscriptions DROP CONSTRAINT push_subscriptions_endpoint_key;
    END IF;
    
    -- Add the UNIQUE constraint on the endpoint column
    ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
    
    -- Log the success
    RAISE NOTICE 'Successfully applied unique constraint on push_subscriptions(endpoint)';
END
$$;

-- Reload schema cache to ensure PostgREST registers the update instantly
NOTIFY pgrst, 'reload schema';
