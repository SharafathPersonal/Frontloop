-- ==============================================================================
-- TRUE ATTENDLY BROADCAST — DIGITAL BILLING & LEADS MIGRATION
-- Run this ONCE in Supabase SQL Editor → New Query → Run
-- It is fully idempotent (safe to run multiple times).
-- ==============================================================================

-- 1. RPC: create_digital_invoice_with_items
-- Handles parent digital_invoices insert and child invoice_items insert atomically
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
BEGIN
    -- 1. Insert the parent invoice row
    INSERT INTO public.digital_invoices (
        shop_id,
        invoice_number,
        customer_name,
        customer_phone,
        total_amount,
        pdf_url,
        status
    ) VALUES (
        p_shop_id,
        p_invoice_number,
        p_customer_name,
        NULL,
        p_total_amount,
        p_pdf_url,
        'pending'
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


-- 2. RPC: upsert_customer_lead_tags
-- Handles atomic upsert into customers_master appending a static tag without duplicates
CREATE OR REPLACE FUNCTION public.upsert_customer_lead_tags(
    p_shop_id uuid,
    p_customer_name text,
    p_whatsapp_number text,
    p_tag text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.customers_master (
        shop_id,
        customer_name,
        whatsapp_number,
        tags,
        source
    ) VALUES (
        p_shop_id,
        p_customer_name,
        p_whatsapp_number,
        ARRAY[p_tag],
        p_tag
    )
    ON CONFLICT (shop_id, whatsapp_number)
    DO UPDATE SET
        tags = ARRAY(
            SELECT DISTINCT e 
            FROM unnest(array_cat(customers_master.tags, ARRAY[p_tag]::text[])) AS e
        ),
        source = EXCLUDED.source;
END;
$$;
