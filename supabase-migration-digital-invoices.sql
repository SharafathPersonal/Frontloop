-- Create digital_invoices table
CREATE TABLE IF NOT EXISTS public.digital_invoices (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid references public.shops(id) on delete cascade not null,
    invoice_number varchar not null,
    customer_phone varchar,
    customer_name varchar,
    total_amount decimal not null,
    pdf_url text,
    status varchar not null default 'pending', -- pending, delivered, failed
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS and isolate by shop_id
ALTER TABLE public.digital_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Digital Invoices isolation" ON public.digital_invoices;
CREATE POLICY "Digital Invoices isolation" ON public.digital_invoices FOR ALL USING (auth.uid() = shop_id);
