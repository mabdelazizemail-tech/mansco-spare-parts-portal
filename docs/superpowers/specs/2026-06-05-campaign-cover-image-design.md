# Campaign Cover Image — Design

- **Date:** 2026-06-05
- **Status:** Approved (pending spec review)
- **Topic:** Allow admins to attach a cover image to a campaign, displayed to dealers.

## Problem

Admins create campaigns through a 6-step wizard, but campaigns have no visual identity. Dealers see campaigns as gradient-only cards. We want admins to optionally attach a cover image when creating/editing a campaign, and surface that image to dealers (and back to admins as a preview).

## Goals

- Admin can attach an optional cover image when **creating** a campaign (Basics step of the wizard).
- Admin can **replace** or **remove** the cover when **editing** a campaign.
- Dealers see the cover on the **campaigns page cards** and in a **dashboard banner**.
- Admins see a **thumbnail preview** in the campaigns list and detail/edit pages.
- Campaigns without a cover keep working (gradient fallback) — fully backward-compatible.

## Non-goals (out of scope)

- In-browser image cropping/editing UI.
- Multiple images / galleries per campaign.
- Per-locale (EN/AR) covers.
- Image CDN transforms beyond Next.js image optimization.

## Decisions (resolved with stakeholder)

1. **Storage:** new **public** Supabase Storage bucket `campaign-covers`. Covers are non-sensitive marketing images shown to all dealers; a public, cacheable URL is simplest. (This is the project's first public bucket.)
2. **Requirement:** cover is **optional**, with the existing **gradient fallback**.
3. **Surfaces:** dealer campaigns-page cards **and** dealer dashboard banner **and** admin list/detail preview.
4. **Banner behavior:** the dashboard banner is image-centric — it features the **soonest-ending active campaign that has a cover**; if no active campaign has a cover, the banner renders nothing.
5. **Constraints:** JPEG/PNG/WebP, ≤ 5 MB, recommended 16:9 landscape ≥ 1200 px wide; displayed with `object-cover`.
6. **Upload mechanism:** dedicated cover endpoint + two-phase create (Approach A below).

## Approach (chosen: A)

**A — dedicated cover endpoint + two-phase create.** A new `POST/DELETE /api/campaigns/[id]/cover` endpoint performs multipart upload via the service role to the public bucket. The create wizard saves the campaign as JSON (unchanged), then — if a cover file was selected — uploads it via the cover endpoint using the returned `id`, then redirects. The edit page uploads/replaces/removes immediately via the same endpoint.

Rejected alternatives:
- **B — single multipart create:** folds the file into `POST /api/campaigns`; mixes a file with the nested `items` JSON array, rewrites the working create API, and edit still needs a separate path.
- **C — client-direct upload to Storage:** browser uploads with the anon key; requires storage write-RLS for clients and cannot cleanly enforce admin-role on writes; diverges from the established service-role upload pattern (registration).

## Data model & migration

New migration `supabase/migrations/20260605_001_campaign_cover.sql`:

```sql
-- 1. Cover image column on campaigns
alter table public.campaigns
  add column if not exists cover_image_url text;

-- 2. Public bucket for campaign covers (dashboard fallback: create a public
--    bucket named 'campaign-covers' if this insert is restricted in your env)
insert into storage.buckets (id, name, public)
values ('campaign-covers', 'campaign-covers', true)
on conflict (id) do nothing;

-- 3. Storage RLS: public read; writes are service-role only (service role
--    bypasses RLS, so no insert/update/delete policy is added for clients).
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
```

`prisma/schema.prisma` — add to `model Campaign`: `coverImageUrl String? @map("cover_image_url")` (documentation/drift parity; runtime uses the Supabase client).

Object path convention: `campaign-covers/{campaignId}/cover_{timestamp}.{ext}`.

## API design

### New: `src/app/api/campaigns/[id]/cover/route.ts`

**`POST`** (admin-only via `getAdminUser`):
1. Read multipart `formData`, get `file: File`.
2. Validate: `file.type ∈ {image/jpeg, image/png, image/webp}` and `file.size ≤ 5 MB` → `400 VALIDATION_ERROR` otherwise.
3. Verify the campaign exists → `404 NOT_FOUND` otherwise.
4. Upload to `campaign-covers/{id}/cover_{Date.now()}.{ext}` via `supabaseAdmin.storage` (`contentType: file.type`, `upsert: false`).
5. `getPublicUrl(path)` → `update campaigns set cover_image_url = <publicUrl> where id = :id`.
6. Best-effort delete of the previously stored object (derive its path from the old `cover_image_url` if present).
7. `campaign_audit_log` insert `action = 'cover_updated'`.
8. Return `{ data: <updated campaign> }`.

**`DELETE`** (admin-only):
1. Verify campaign exists.
2. Best-effort delete of the stored object.
3. `update campaigns set cover_image_url = null`.
4. `campaign_audit_log` insert `action = 'cover_removed'`.
5. Return `{ data: <updated campaign> }`.

Error responses use the existing `dbError` / `storageError` / standard `{ error: { code, message } }` shapes.

### Changed: `src/app/api/campaigns/active/route.ts`

- Add `cover_image_url` to the `.select(...)` column list.
- Add `coverImageUrl: c.cover_image_url ?? null` to the mapped dealer payload (and to the `CampaignRow` type).

### Unchanged (already return the column via `select("*")`)

- `GET /api/campaigns` (admin list) and `GET /api/campaigns/[id]` (admin detail) already select `*`, so `cover_image_url` is included automatically once the column exists. `POST /api/campaigns` and `[id]/duplicate` are unchanged (cover is handled by the cover endpoint; duplicate intentionally does **not** copy the cover image — a new campaign starts with no cover).

## Admin UI changes

- **Create wizard (`src/app/dashboard/admin/campaigns/new/page.tsx`), Basics step:** add a cover image dropzone/file input below Description. Hold the selected `File` in state with a live preview via `URL.createObjectURL`, plus a "remove" affordance. Client-side validate type/size before accepting. On `handleSave`: create the campaign (JSON, unchanged) → if a file is selected, `POST` it to `/api/campaigns/{newId}/cover` → then redirect to the detail page. Upload failure shows an error but the campaign is already created (surface a non-fatal message: "Campaign created, but the cover upload failed — add it from the edit page").
- **Review step:** show the selected cover thumbnail.
- **Edit page (`src/app/dashboard/admin/campaigns/[id]/edit/page.tsx`):** a cover section showing the current cover (if any) with **Replace** and **Remove** actions wired to the cover endpoint (immediate, not deferred to form save).
- **Detail page (`src/app/dashboard/admin/campaigns/[id]/page.tsx`):** display the cover at the top of the campaign detail.
- **List page (`src/app/dashboard/admin/campaigns/page.tsx`):** show a small cover thumbnail per row (fallback to a placeholder/initial when null).

A small reusable `CampaignCoverUpload` client component (in `src/components/campaign-wizard/`) encapsulates file selection, validation, preview, and the POST/DELETE calls, used by both the wizard Basics step and the edit page.

## Dealer UI changes

- **Campaign cards (`src/app/dashboard/campaigns/page.tsx`):** add `coverImageUrl` to the `ActiveCampaign` type. In `CampaignCard`, when `coverImageUrl` is present, render it as the card's background/header image (Next `<Image>` with `object-cover`) under a dark gradient overlay for text legibility; when null, keep the current gradient. Discount badge, name, description, and "valid until" remain.
- **Dashboard banner (`src/components/dashboard/campaign-banner.tsx`, currently an empty stub):** implement a client component that fetches `/api/campaigns/active`, picks the **soonest-ending active campaign with a non-null `coverImageUrl`**, and renders a wide hero banner (cover via `object-cover`, name, discount label, days-left, link to `/dashboard/campaigns`). Renders `null` when there is no covered active campaign. Mount it near the top of the dealer dashboard (`src/app/dashboard/page.tsx`), above existing content.

## Next.js image configuration

Register the Supabase Storage public host in `next.config.ts` under `images.remotePatterns` (e.g. `{ protocol: 'https', hostname: '<project-ref>.supabase.co', pathname: '/storage/v1/object/public/campaign-covers/**' }`) so Next `<Image>` can optimize covers. Cards/banner pass appropriate `sizes`.

## Validation

- Server-side (authoritative): MIME allow-list + 5 MB cap in the cover endpoint, mirroring the registration upload checks.
- Client-side (UX): same checks before upload, with inline error messaging.

## Testing

- **Unit (Vitest):**
  - Cover validation helper: accepts JPEG/PNG/WebP ≤ 5 MB; rejects other MIME types and oversize files.
  - `active` mapping: output includes `coverImageUrl` (string when set, `null` when absent).
- **Manual / E2E:**
  - Create a campaign with a cover → cover shows on the dealer card, dashboard banner, admin list/detail.
  - Edit: replace cover (new image shows), remove cover (reverts to gradient; banner drops it if it was featured).
  - Create a campaign **without** a cover → gradient fallback everywhere; banner does not feature it.
  - Non-admin cannot call the cover endpoint (401/403).

## Files touched (summary)

**Add:**
- `supabase/migrations/20260605_001_campaign_cover.sql`
- `src/app/api/campaigns/[id]/cover/route.ts`
- `src/components/campaign-wizard/campaign-cover-upload.tsx`

**Change:**
- `prisma/schema.prisma` (Campaign.coverImageUrl)
- `src/app/api/campaigns/active/route.ts` (select + mapping)
- `src/app/dashboard/admin/campaigns/new/page.tsx` (Basics step + save orchestration + review thumbnail)
- `src/app/dashboard/admin/campaigns/[id]/edit/page.tsx` (cover replace/remove)
- `src/app/dashboard/admin/campaigns/[id]/page.tsx` (detail preview)
- `src/app/dashboard/admin/campaigns/page.tsx` (list thumbnail)
- `src/app/dashboard/campaigns/page.tsx` (card cover + fallback)
- `src/components/dashboard/campaign-banner.tsx` (implement banner)
- `src/app/dashboard/page.tsx` (mount banner)
- `next.config.ts` (images.remotePatterns)

## Open questions

None — all resolved during brainstorming.
