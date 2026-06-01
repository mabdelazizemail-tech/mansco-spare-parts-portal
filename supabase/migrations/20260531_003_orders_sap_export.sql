-- ============================================================
-- Module 9 — SAP CSV Sync: order export tracking
-- ============================================================
-- Adds a marker so the Portal→SAP orders export only sends each order once.
-- The exporter stamps exported_to_sap_at after writing an order into an
-- orders-export.csv batch; the export queue is "approved/partial orders not
-- yet exported".

alter table public.orders
  add column if not exists exported_to_sap_at timestamptz default null;

-- Export queue: orders ready to ship to SAP that haven't gone yet.
create index if not exists idx_orders_export_queue
  on public.orders (status)
  where exported_to_sap_at is null
    and status in ('approved', 'partial');

comment on column public.orders.exported_to_sap_at is
  'Timestamp when the order was written into a Portal→SAP orders-export batch. NULL until exported.';

-- ── Invoice SAP-sync provenance ──
-- Invoices created from a SAP invoices-import.csv carry the SAP reference and a
-- sync timestamp, distinguishing them from invoices issued in-portal.
alter table public.invoices
  add column if not exists sap_reference text        default null,
  add column if not exists synced_at     timestamptz default null;

comment on column public.invoices.sap_reference is
  'SAP invoice reference for invoices ingested via CSV sync. NULL for in-portal-issued invoices.';
comment on column public.invoices.synced_at is
  'Timestamp of the last SAP CSV sync that wrote this invoice. NULL for in-portal-issued invoices.';
