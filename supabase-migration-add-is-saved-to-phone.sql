-- Add is_saved_to_phone column to customers_master
ALTER TABLE public.customers_master 
ADD COLUMN IF NOT EXISTS is_saved_to_phone BOOLEAN DEFAULT false;

-- Create an index to speed up querying
CREATE INDEX IF NOT EXISTS idx_customers_master_is_saved_to_phone ON public.customers_master(is_saved_to_phone);
