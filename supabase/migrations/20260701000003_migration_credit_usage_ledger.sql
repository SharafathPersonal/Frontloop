-- ==============================================================================
-- TRUE ATTENDLY BROADCAST — CREDIT USAGE LEDGER VIEW
-- Run this ONCE in Supabase SQL Editor → New Query → Run
-- It is fully idempotent (safe to run multiple times).
-- ==============================================================================

-- Create a unified security-defined view for credit usage tracking
create or replace view public.credit_usage_ledger as
select 
    id, 
    shop_id, 
    'WhatsApp Campaign' as usage_type, 
    title as reference_name, 
    (total_sent::numeric * 1.0) as credits, 
    created_at 
from public.campaigns
union all
select 
    id, 
    shop_id, 
    'Email Marketing' as usage_type, 
    subject as reference_name, 
    (total_recipients::numeric * 0.5) as credits, 
    created_at 
from public.email_campaigns
union all
select 
    id, 
    shop_id, 
    'Digital Bill Dynamic QR' as usage_type, 
    invoice_number as reference_name, 
    1.00 as credits, 
    created_at 
from public.digital_invoices
where status = 'delivered';

-- ==============================================================================
-- HARDENED STATS SYNCHRONIZATION RPCs
-- Transparently handles updates for both campaigns and email_campaigns
-- ==============================================================================
create or replace function public.increment_campaign_sent(campaign_row_id uuid, quantity integer)
returns void
language plpgsql
security definer
as $$
begin
    update public.campaigns
    set total_sent = total_sent + quantity
    where id = campaign_row_id;

    update public.email_campaigns
    set total_sent = total_sent + quantity
    where id = campaign_row_id;
end;
$$;

create or replace function public.increment_campaign_metric(campaign_row_id uuid, metric_name text, quantity integer)
returns void
language plpgsql
security definer
as $$
begin
    if metric_name = 'delivered' then
        update public.campaigns set total_delivered = total_delivered + quantity where id = campaign_row_id;
        update public.email_campaigns set total_delivered = total_delivered + quantity where id = campaign_row_id;
    elsif metric_name = 'read' then
        update public.campaigns set total_read = total_read + quantity where id = campaign_row_id;
    elsif metric_name = 'failed' then
        update public.campaigns set total_failed = total_failed + quantity where id = campaign_row_id;
        update public.email_campaigns set total_failed = total_failed + quantity where id = campaign_row_id;
    end if;
end;
$$;
