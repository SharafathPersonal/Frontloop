-- 1. Extend the existing shops table with settings fields
alter table public.shops 
add column if not exists logo_url text null,
add column if not exists gst_number varchar(50) null,
add column if not exists invoice_theme_color varchar(20) default '#5C4033'; -- Default Warm Brown

-- 2. Create the items details table with serial/barcode indexes
create table if not exists public.invoice_items (
    id uuid default gen_random_uuid() primary key,
    invoice_id uuid references public.digital_invoices(id) on delete cascade,
    product_name varchar(255) not null,
    barcode_or_serial varchar(100) null,
    quantity integer default 1 not null,
    price decimal(10, 2) not null,
    item_total decimal(10, 2) not null
);

create index if not exists idx_items_barcode on public.invoice_items(barcode_or_serial);
