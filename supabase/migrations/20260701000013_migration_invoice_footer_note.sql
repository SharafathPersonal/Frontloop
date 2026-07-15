-- ==============================================================================
-- TRUE ATTENDLY BROADCAST — INVOICE FOOTER NOTE IMMUTABILITY MIGRATION
-- Run this ONCE in Supabase SQL Editor → New Query → Run
-- It is fully idempotent (safe to run multiple times).
-- ==============================================================================

-- 1. Add custom invoice footer note to the shops table (config field)
alter table public.shops 
add column if not exists invoice_footer_note text default 'Thank you for visiting! Please come again. ✨';

-- 2. Add snapshot invoice footer note to digital_invoices table (immutable field)
alter table public.digital_invoices 
add column if not exists invoice_footer_note text;

-- 3. Populate existing historical billing records with their shop settings footer note
update public.digital_invoices i
set invoice_footer_note = coalesce(s.invoice_footer_note, 'Thank you for visiting!')
from public.shops s
where i.shop_id = s.id and i.invoice_footer_note is null;

-- 4. Re-declare create_digital_invoice_with_items function
-- Fetch current active note and snapshot it into digital_invoices at checkout time
CREATE OR REPLACE FUNCTION public.create_digital_invoice_with_items(
    p_shop_id uuid,
    p_invoice_number text,
    p_customer_name text,
    p_total_amount numeric,
    p_pdf_url text,
    p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice_id uuid;
    v_item jsonb;
    v_result jsonb;
    v_footer_note text;
BEGIN
    -- Fetch the active invoice_footer_note configuration from shop
    SELECT coalesce(invoice_footer_note, 'Thank you for visiting!')
    INTO v_footer_note
    FROM public.shops
    WHERE id = p_shop_id;

    -- Default fallback if column value is empty string
    IF v_footer_note IS NULL OR trim(v_footer_note) = '' THEN
        v_footer_note := 'Thank you for visiting!';
    END IF;

    -- 1. Insert the parent invoice row with the snapshot note
    INSERT INTO public.digital_invoices (
        shop_id,
        invoice_number,
        customer_name,
        customer_phone,
        total_amount,
        pdf_url,
        status,
        invoice_footer_note
    ) VALUES (
        p_shop_id,
        p_invoice_number,
        p_customer_name,
        NULL,
        p_total_amount,
        p_pdf_url,
        'pending',
        v_footer_note
    )
    RETURNING id INTO v_invoice_id;

    -- 2. Loop and insert child items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.invoice_items (
            invoice_id,
            product_name,
            barcode_or_serial,
            quantity,
            price,
            item_total
        ) VALUES (
            v_invoice_id,
            v_item->>'product_name',
            v_item->>'barcode_or_serial',
            (v_item->>'quantity')::integer,
            (v_item->>'price')::numeric,
            (v_item->>'item_total')::numeric
        );
    END LOOP;

    -- 3. Return the created invoice data
    SELECT jsonb_build_object(
        'id', v_invoice_id,
        'invoice_number', p_invoice_number,
        'customer_name', p_customer_name,
        'total_amount', p_total_amount,
        'pdf_url', p_pdf_url,
        'status', 'pending'
    ) INTO v_result;

    RETURN v_result;
END;
$$;
