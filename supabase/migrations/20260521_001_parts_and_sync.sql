-- ============================================================
-- Parts Catalog, Stock, Pricing, Inquiries, Lost Sales, Sync Logs
-- ============================================================
-- Tables required by Module 4 (Parts Catalog & Search) and the
-- SAP CSV Sync admin page (/dashboard/admin/sync).
--
-- Apply via Supabase SQL editor, or `supabase db push`, or
-- `psql "$DATABASE_URL" -f 20260521_001_parts_and_sync.sql`.

-- ────────────────────────────────────────────────────────────
-- 1. Master parts catalog
-- ────────────────────────────────────────────────────────────
create table if not exists public.parts_catalog (
  part_number       text primary key,
  name_en           text not null,
  name_ar           text,
  category_id       text,
  model             text,
  oem               text,
  image_url         text,
  last_synced_at    timestamptz default now(),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists idx_parts_catalog_category on public.parts_catalog (category_id);
create index if not exists idx_parts_catalog_model    on public.parts_catalog (model);
create index if not exists idx_parts_catalog_oem      on public.parts_catalog (oem);

-- ────────────────────────────────────────────────────────────
-- 2. Stock availability (from SAP stock-availability.csv)
-- ────────────────────────────────────────────────────────────
create table if not exists public.stock_availability (
  part_number         text primary key,
  quantity_available  integer not null default 0,
  quantity_atp        integer not null default 0, -- available-to-promise
  source_location     text,
  replenishment_eta   date,
  last_synced_at      timestamptz default now(),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_stock_eta on public.stock_availability (replenishment_eta);

-- ────────────────────────────────────────────────────────────
-- 3. Price list items (from SAP pricing.csv)
--    Composite key allows the same part to live on multiple price lists.
-- ────────────────────────────────────────────────────────────
create table if not exists public.price_list_items (
  part_number       text not null,
  price_list_id     text not null default 'STANDARD',
  unit_price        numeric(12,2) not null default 0 check (unit_price >= 0),
  currency          text not null default 'EGP',
  effective_from    date,
  effective_to      date,
  discount_pct      numeric(5,2) default 0 check (discount_pct >= 0 and discount_pct <= 100),
  last_synced_at    timestamptz default now(),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  primary key (part_number, price_list_id)
);

create index if not exists idx_price_list_part on public.price_list_items (part_number);

-- ────────────────────────────────────────────────────────────
-- 4. Inquiries (search / order-attempt log)
-- ────────────────────────────────────────────────────────────
create table if not exists public.inquiries (
  id                       uuid default gen_random_uuid() primary key,
  dealer_id                text not null,
  part_number              text not null,
  quantity                 integer not null default 1 check (quantity > 0),
  inquiry_type             text not null default 'search'
    check (inquiry_type in ('search', 'order_attempt')),
  availability_at_inquiry  text, -- AVAILABLE | PARTIALLY_AVAILABLE | NOT_AVAILABLE_WITH_ETA | NOT_AVAILABLE_NO_ETA
  converted_to_order_id    uuid,
  created_at               timestamptz default now()
);

create index if not exists idx_inquiries_dealer  on public.inquiries (dealer_id);
create index if not exists idx_inquiries_part    on public.inquiries (part_number);
create index if not exists idx_inquiries_created on public.inquiries (created_at desc);

-- ────────────────────────────────────────────────────────────
-- 5. Lost sales (auto-logged when inquiry hits an unavailable part)
-- ────────────────────────────────────────────────────────────
create table if not exists public.lost_sales (
  id                  uuid default gen_random_uuid() primary key,
  inquiry_id          uuid references public.inquiries(id) on delete set null,
  dealer_id           text not null,
  part_number         text not null,
  quantity            integer not null default 1,
  reason              text not null
    check (reason in ('partial_stock', 'out_of_stock', 'no_eta', 'credit_block', 'quota_exceeded')),
  eta_if_available    date,
  created_at          timestamptz default now()
);

create index if not exists idx_lost_sales_dealer  on public.lost_sales (dealer_id);
create index if not exists idx_lost_sales_part    on public.lost_sales (part_number);
create index if not exists idx_lost_sales_reason  on public.lost_sales (reason);
create index if not exists idx_lost_sales_created on public.lost_sales (created_at desc);

-- ────────────────────────────────────────────────────────────
-- 6. Sync logs (every CSV import/export creates a row here)
-- ────────────────────────────────────────────────────────────
create table if not exists public.sync_logs (
  id                  uuid default gen_random_uuid() primary key,
  sync_type           text not null check (sync_type in ('import', 'export')),
  file_type           text not null check (file_type in ('stock', 'pricing', 'parts_catalog', 'orders', 'invoices')),
  file_name           text not null,
  status              text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  records_processed   integer default 0,
  records_failed      integer default 0,
  error_details       jsonb,
  started_at          timestamptz default now(),
  completed_at        timestamptz
);

create index if not exists idx_sync_logs_started   on public.sync_logs (started_at desc);
create index if not exists idx_sync_logs_file_type on public.sync_logs (file_type);
create index if not exists idx_sync_logs_status    on public.sync_logs (status);

-- ────────────────────────────────────────────────────────────
-- 7. updated_at triggers (keep timestamps fresh on UPDATE)
-- ────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_parts_catalog_updated_at on public.parts_catalog;
create trigger trg_parts_catalog_updated_at
  before update on public.parts_catalog
  for each row execute function public.set_updated_at();

drop trigger if exists trg_stock_availability_updated_at on public.stock_availability;
create trigger trg_stock_availability_updated_at
  before update on public.stock_availability
  for each row execute function public.set_updated_at();

drop trigger if exists trg_price_list_items_updated_at on public.price_list_items;
create trigger trg_price_list_items_updated_at
  before update on public.price_list_items
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 8. Row-Level Security
--    The service-role key bypasses RLS so the API routes (which use
--    supabaseAdmin) work regardless. These policies cover the case
--    where dealer-side queries hit these tables directly via the anon key.
-- ────────────────────────────────────────────────────────────
alter table public.parts_catalog        enable row level security;
alter table public.stock_availability   enable row level security;
alter table public.price_list_items     enable row level security;
alter table public.inquiries            enable row level security;
alter table public.lost_sales           enable row level security;
alter table public.sync_logs            enable row level security;

-- Authenticated users can read the public catalog / stock / prices.
-- (The no-price-on-unavailable rule is enforced at the API layer, not RLS.)
drop policy if exists "authenticated_read_catalog" on public.parts_catalog;
create policy "authenticated_read_catalog" on public.parts_catalog
  for select to authenticated using (true);

drop policy if exists "authenticated_read_stock" on public.stock_availability;
create policy "authenticated_read_stock" on public.stock_availability
  for select to authenticated using (true);

drop policy if exists "authenticated_read_prices" on public.price_list_items;
create policy "authenticated_read_prices" on public.price_list_items
  for select to authenticated using (true);

-- Dealers can only see their own inquiries / lost sales.
drop policy if exists "dealer_own_inquiries" on public.inquiries;
create policy "dealer_own_inquiries" on public.inquiries
  for select to authenticated using (dealer_id = auth.uid()::text);

drop policy if exists "dealer_own_lost_sales" on public.lost_sales;
create policy "dealer_own_lost_sales" on public.lost_sales
  for select to authenticated using (dealer_id = auth.uid()::text);

-- Sync logs are admin-only — no policy means no anon/authenticated SELECT.
-- The API uses the service role to read them, which bypasses RLS.
