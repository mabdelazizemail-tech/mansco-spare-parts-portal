-- ============================================================
-- Campaign Manager Module – Database Schema
-- ============================================================

-- 1. Campaigns table (master record)
create table if not exists public.campaigns (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  campaign_type text not null default 'discount'
    check (campaign_type in ('discount', 'bundled_offer', 'seasonal_promotion', 'target_incentive')),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  start_date date not null,
  end_date date not null,

  -- Audience targeting
  target_audience text not null default 'all'
    check (target_audience in ('all', 'group', 'individual')),
  target_dealer_ids uuid[] default '{}',          -- specific dealer IDs
  target_dealer_group text,                        -- e.g. "Cairo Region", "High-Value"

  -- Eligibility criteria (JSON for flexibility)
  eligibility_rules jsonb default '{}'::jsonb,
  -- Example: {"min_credit_limit": 50000, "min_target_pct": 80, "financial_status": ["active"], "order_types": ["daily"]}

  -- Metadata
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint campaigns_dates_check check (end_date >= start_date)
);

-- 2. Campaign items (parts assigned to a campaign)
create table if not exists public.campaign_items (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  part_number text not null,
  part_description text,

  -- Discount configuration
  discount_type text not null default 'percentage'
    check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2) not null default 0,

  -- Item-level eligibility
  min_order_quantity int default 1,
  order_type_restriction text[],  -- e.g. {'daily','stock'} or null for all

  -- Performance tracking (denormalized for speed)
  total_inquiries int default 0,
  total_orders int default 0,
  total_qty_sold int default 0,
  total_discount_given numeric(12,2) default 0,
  total_backorders int default 0,

  created_at timestamptz default now(),

  unique(campaign_id, part_number)
);

-- 3. Campaign orders (tracks which orders used campaign discounts)
create table if not exists public.campaign_orders (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  campaign_item_id uuid references public.campaign_items(id) on delete set null,
  dealer_id uuid not null,
  order_id uuid,                   -- references orders table when it exists
  part_number text not null,
  quantity int not null default 0,
  discount_applied numeric(10,2) default 0,
  is_first_purchase boolean default false,
  created_at timestamptz default now()
);

-- 4. Campaign audit log
create table if not exists public.campaign_audit_log (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  action text not null,            -- 'created','activated','paused','resumed','completed','archived','edited','item_added','item_removed','extended'
  details jsonb default '{}'::jsonb,
  performed_by uuid,
  created_at timestamptz default now()
);

-- RLS
alter table public.campaigns enable row level security;
alter table public.campaign_items enable row level security;
alter table public.campaign_orders enable row level security;
alter table public.campaign_audit_log enable row level security;

-- Indexes
create index idx_campaigns_status on public.campaigns(status);
create index idx_campaigns_dates on public.campaigns(start_date, end_date);
create index idx_campaign_items_campaign on public.campaign_items(campaign_id);
create index idx_campaign_items_part on public.campaign_items(part_number);
create index idx_campaign_orders_campaign on public.campaign_orders(campaign_id);
create index idx_campaign_orders_dealer on public.campaign_orders(dealer_id);
create index idx_campaign_audit_campaign on public.campaign_audit_log(campaign_id);
