-- Migration: Add soft-delete support to dealers table
-- Date: 2026-05-22
--
-- Adds deleted_at and deleted_by columns to support soft deletion of dealer records.
-- Per CLAUDE.md: "Don't hard-delete records — use soft delete".
-- Deletion is a separate concern from suspension (is_active):
--   - is_active = false  → temporary suspension, dealer can be reactivated
--   - deleted_at IS NOT NULL → soft-deleted, hidden from default listings

alter table public.dealers
  add column if not exists deleted_at timestamptz default null,
  add column if not exists deleted_by uuid default null references auth.users(id) on delete set null;

-- Index for fast filtering of non-deleted rows (partial index keeps it small)
create index if not exists idx_dealers_not_deleted
  on public.dealers (id)
  where deleted_at is null;

-- Index to support lookups of deleted dealers (e.g. for an admin "Trash" view)
create index if not exists idx_dealers_deleted_at
  on public.dealers (deleted_at)
  where deleted_at is not null;

comment on column public.dealers.deleted_at is
  'Timestamp when the dealer record was soft-deleted. NULL means the dealer is not deleted.';
comment on column public.dealers.deleted_by is
  'Supabase auth user id of the admin who performed the soft delete. NULL if not deleted.';
