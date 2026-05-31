-- ============================================================================
-- Row Level Security (RLS) hardening — audit item 11
-- ----------------------------------------------------------------------------
-- Defense-in-depth. The application's API routes use the Supabase SERVICE ROLE
-- key, which BYPASSES RLS — so these policies do NOT replace the in-code
-- requireAdmin()/requireDealerSession() authorization. Their purpose is to make
-- the anon/authenticated keys safe-by-default: if any client-side query ever
-- hits these tables directly, it returns nothing unless an explicit policy
-- grants access.
--
-- Strategy:
--   1. Enable RLS on every application table (default-deny for anon/auth).
--   2. Grant dealers SELECT on their OWN rows only (keyed by auth.uid()).
--   3. All writes and all admin/cross-dealer reads continue to go through the
--      service-role API layer.
-- ============================================================================

-- Helper: a dealer's row id for the current auth user.
create or replace function public.current_dealer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.dealers where supabase_uid = auth.uid() limit 1
$$;

-- ── Enable RLS (default-deny) ────────────────────────────────────────────────
alter table public.dealer_registrations  enable row level security;
alter table public.dealers                enable row level security;
alter table public.dealer_permissions     enable row level security;
alter table public.parts_catalog          enable row level security;
alter table public.stock_availability     enable row level security;
alter table public.price_lists            enable row level security;
alter table public.price_list_items       enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_lines            enable row level security;
alter table public.order_approvals        enable row level security;
alter table public.order_timeline         enable row level security;
alter table public.inquiries              enable row level security;
alter table public.lost_sales             enable row level security;
alter table public.campaigns              enable row level security;
alter table public.campaign_items         enable row level security;
alter table public.campaign_orders        enable row level security;
alter table public.campaign_audit_log     enable row level security;
alter table public.dealer_targets         enable row level security;
alter table public.sync_logs              enable row level security;

-- ── Dealer self-service SELECT policies ──────────────────────────────────────
-- A dealer may read their own profile.
drop policy if exists dealers_select_own on public.dealers;
create policy dealers_select_own on public.dealers
  for select to authenticated
  using (supabase_uid = auth.uid());

-- A dealer may read their own permissions.
drop policy if exists dealer_permissions_select_own on public.dealer_permissions;
create policy dealer_permissions_select_own on public.dealer_permissions
  for select to authenticated
  using (dealer_id = public.current_dealer_id());

-- A dealer may read their own registration record.
drop policy if exists dealer_registrations_select_own on public.dealer_registrations;
create policy dealer_registrations_select_own on public.dealer_registrations
  for select to authenticated
  using (supabase_uid = auth.uid());

-- A dealer may read their own orders / lines / approvals / timeline.
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select to authenticated
  using (dealer_id = public.current_dealer_id());

drop policy if exists order_lines_select_own on public.order_lines;
create policy order_lines_select_own on public.order_lines
  for select to authenticated
  using (order_id in (select id from public.orders where dealer_id = public.current_dealer_id()));

drop policy if exists order_timeline_select_own on public.order_timeline;
create policy order_timeline_select_own on public.order_timeline
  for select to authenticated
  using (order_id in (select id from public.orders where dealer_id = public.current_dealer_id()));

-- A dealer may read their own inquiries / lost sales / targets.
drop policy if exists inquiries_select_own on public.inquiries;
create policy inquiries_select_own on public.inquiries
  for select to authenticated
  using (dealer_id = public.current_dealer_id());

drop policy if exists lost_sales_select_own on public.lost_sales;
create policy lost_sales_select_own on public.lost_sales
  for select to authenticated
  using (dealer_id = public.current_dealer_id());

drop policy if exists dealer_targets_select_own on public.dealer_targets;
create policy dealer_targets_select_own on public.dealer_targets
  for select to authenticated
  using (dealer_id = public.current_dealer_id());

-- Catalog + stock are readable by any authenticated dealer (browse parts).
drop policy if exists parts_catalog_select_auth on public.parts_catalog;
create policy parts_catalog_select_auth on public.parts_catalog
  for select to authenticated using (true);

drop policy if exists stock_availability_select_auth on public.stock_availability;
create policy stock_availability_select_auth on public.stock_availability
  for select to authenticated using (true);

-- NOTE: campaigns, sync_logs, price lists, audit logs, and all WRITES are
-- intentionally left with NO permissive policy → only the service-role API can
-- access them. Add tighter per-row policies if direct client access is ever
-- required.
