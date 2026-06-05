-- ============================================================
-- Campaign cover image: column + public bucket + read policy
-- ============================================================

-- 1. Cover image URL on campaigns (nullable; optional feature)
alter table public.campaigns
  add column if not exists cover_image_url text;

-- 2. Public bucket for campaign covers.
--    (If your environment restricts inserting into storage.buckets via SQL,
--     create a PUBLIC bucket named 'campaign-covers' in the Supabase dashboard
--     instead and skip this statement.)
insert into storage.buckets (id, name, public)
values ('campaign-covers', 'campaign-covers', true)
on conflict (id) do nothing;

-- 3. Storage RLS: allow public read of objects in this bucket. Writes are
--    performed by the service role (which bypasses RLS), so no insert/update/
--    delete policy is added for clients.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'campaign_covers_public_read'
  ) then
    create policy campaign_covers_public_read on storage.objects
      for select using (bucket_id = 'campaign-covers');
  end if;
end $$;
