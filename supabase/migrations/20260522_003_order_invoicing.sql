-- Migration: Add invoice issuance metadata to orders
-- Date: 2026-05-22
--
-- The orders table already has invoice_number. We add invoice_date and
-- invoiced_by so admins can record WHO issued the invoice and WHEN.
-- Phase 2 will replace this with a dedicated invoices table; this is the
-- pragmatic Phase 1 mechanism so admins have a way to mark an order as
-- invoiced today.

alter table public.orders
  add column if not exists invoice_date timestamptz default null,
  add column if not exists invoiced_by  uuid        default null references auth.users(id) on delete set null;

-- Index to support "Invoicing queue" view (approved/done/partial orders that
-- have NOT yet been invoiced).
create index if not exists idx_orders_invoicing_queue
  on public.orders (status)
  where invoice_number is null
    and status in ('approved', 'done', 'partial');

-- Index for listing already-invoiced orders sorted by date.
create index if not exists idx_orders_invoice_date
  on public.orders (invoice_date desc)
  where invoice_number is not null;

comment on column public.orders.invoice_date is
  'Timestamp when the order was marked as invoiced by an admin. NULL until an invoice is issued.';
comment on column public.orders.invoiced_by is
  'Supabase auth user id of the admin who issued the invoice. NULL until issued.';
