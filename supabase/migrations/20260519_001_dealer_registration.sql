-- Dealer Registrations table
create table if not exists public.dealer_registrations (
  id uuid default gen_random_uuid() primary key,
  supabase_uid uuid not null references auth.users(id) on delete cascade,
  email text not null,
  company_name text not null,
  contact_person text not null,
  phone text not null,
  tax_id text not null,
  commercial_register_number text not null,
  branch_address text not null,
  dealer_type_requested text not null default 'dealer' check (dealer_type_requested in ('dealer', 'sub_dealer')),
  parent_dealer_code text,
  documents_uploaded jsonb default '{}'::jsonb,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  submitted_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Dealers table (created on approval)
create table if not exists public.dealers (
  id uuid default gen_random_uuid() primary key,
  supabase_uid uuid not null unique references auth.users(id) on delete cascade,
  code text unique,
  email text not null,
  company_name text not null,
  contact_person text not null,
  phone text,
  tax_id text,
  branch_address text,
  dealer_type text not null default 'dealer' check (dealer_type in ('dealer', 'sub_dealer')),
  parent_dealer_code text,
  credit_limit numeric(12,2) default 0,
  overdue_balance numeric(12,2) default 0,
  financial_status text default 'active' check (financial_status in ('active', 'blocked', 'warning')),
  registration_status text not null default 'pending' check (registration_status in ('pending', 'approved', 'rejected', 'suspended')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS policies
alter table public.dealer_registrations enable row level security;
alter table public.dealers enable row level security;

-- Users can read their own registration
create policy "Users can view own registration"
  on public.dealer_registrations for select
  using (auth.uid() = supabase_uid);

-- Service role can do everything (admin operations go through service role)
-- Admins read all registrations via service role client

-- Dealers can read their own dealer record
create policy "Dealers can view own record"
  on public.dealers for select
  using (auth.uid() = supabase_uid);

-- Create storage bucket for dealer documents
insert into storage.buckets (id, name, public)
values ('dealer-documents', 'dealer-documents', false)
on conflict (id) do nothing;

-- Storage policy: users can upload to their own folder
create policy "Users can upload own documents"
  on storage.objects for insert
  with check (
    bucket_id = 'dealer-documents'
    and (storage.foldername(name))[1] = 'registrations'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Indexes
create index idx_dealer_registrations_status on public.dealer_registrations(review_status);
create index idx_dealer_registrations_uid on public.dealer_registrations(supabase_uid);
create index idx_dealers_uid on public.dealers(supabase_uid);
create index idx_dealers_code on public.dealers(code);
