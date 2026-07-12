-- Add tracking columns for VCF export and broadcast sequence
ALTER TABLE public.customers_master ADD COLUMN IF NOT EXISTS is_exported_to_vcf boolean DEFAULT false;
ALTER TABLE public.customers_master ADD COLUMN IF NOT EXISTS serial_number integer;
ALTER TABLE public.customers_master ADD COLUMN IF NOT EXISTS loyalty_credits integer DEFAULT 0;

-- Create a trigger to assign a progressive serial_number per merchant (shop_id) when a new lead is inserted
CREATE OR REPLACE FUNCTION assign_customer_serial()
RETURNS trigger AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    SELECT COALESCE(MAX(serial_number), 0) + 1 INTO NEW.serial_number
    FROM public.customers_master
    WHERE shop_id = NEW.shop_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_customer_serial ON public.customers_master;
CREATE TRIGGER trg_assign_customer_serial
BEFORE INSERT ON public.customers_master
FOR EACH ROW
EXECUTE FUNCTION assign_customer_serial();
