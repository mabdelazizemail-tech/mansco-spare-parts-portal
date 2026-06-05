# Campaign Cover Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins attach an optional cover image to a campaign (create + edit), shown to dealers on campaign cards and a dashboard banner, and previewed in the admin UI.

**Architecture:** A `cover_image_url` column on `campaigns` holds a public URL from a new public Supabase Storage bucket `campaign-covers`. A dedicated `POST/DELETE /api/campaigns/[id]/cover` endpoint (admin-only, service-role) handles uploads; the create wizard does a two-phase save (create JSON → upload cover by id). Pure logic (file validation, dealer mapping) is extracted into small testable modules.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · Supabase (Postgres + Storage, service-role) · Vitest (node) · Tailwind.

---

## ⚠️ Staging discipline (read first)

The working tree currently contains **unrelated uncommitted changes** (a `middleware.ts → proxy.ts` rename, logo-image fixes, an auth fix). **Never run `git add -A` / `git add .`** in this plan. Each commit step lists the exact files to `git add`. Stage only those.

Branch: `feature/campaign-cover-image` (already checked out). All tasks commit here.

## Spec

Source spec: `docs/superpowers/specs/2026-06-05-campaign-cover-image-design.md`.

## File structure

**Create:**
- `supabase/migrations/20260605_001_campaign_cover.sql` — column + bucket + storage read policy
- `src/lib/campaigns/cover-validation.ts` — pure MIME/size validation + path helpers
- `src/lib/campaigns/active-mapper.ts` — pure dealer-campaign row→DTO mapper (adds `coverImageUrl`)
- `src/app/api/campaigns/[id]/cover/route.ts` — `POST` (upload/replace) + `DELETE` (remove)
- `src/components/campaign-wizard/campaign-cover-upload.tsx` — reusable picker (deferred + immediate modes)
- `tests/unit/campaigns/cover-validation.test.ts`
- `tests/unit/campaigns/active-mapper.test.ts`

**Modify:**
- `prisma/schema.prisma` — `Campaign.coverImageUrl`
- `src/app/api/campaigns/active/route.ts` — select `cover_image_url`, use mapper
- `next.config.ts` — `images.remotePatterns` for the Supabase host
- `src/app/dashboard/admin/campaigns/new/page.tsx` — Basics cover field + two-phase save + review thumbnail
- `src/app/dashboard/admin/campaigns/[id]/edit/page.tsx` — cover section (immediate replace/remove)
- `src/app/dashboard/admin/campaigns/[id]/page.tsx` — overview cover preview
- `src/app/dashboard/admin/campaigns/page.tsx` — list thumbnail
- `src/app/dashboard/campaigns/page.tsx` — dealer card cover + gradient fallback
- `src/components/dashboard/campaign-banner.tsx` — implement banner (currently `export {}`)
- `src/app/dashboard/page.tsx` — mount banner

## Testing note

The repo's Vitest setup is **node-environment, pure-logic only** (no React Testing Library / jsdom). So:
- **Pure logic** (Tasks 2, 4) gets real failing-first Vitest tests.
- **API route + UI** (Tasks 3, 5–12) are verified with `npm run typecheck` plus the **manual verification checklist** in Task 13. Do not invent an RTL harness.

---

### Task 1: Database migration + Prisma field

**Files:**
- Create: `supabase/migrations/20260605_001_campaign_cover.sql`
- Modify: `prisma/schema.prisma` (Campaign model, after `description String?`)

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260605_001_campaign_cover.sql`:

```sql
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
```

- [ ] **Step 2: Add the Prisma field**

In `prisma/schema.prisma`, inside `model Campaign`, add the field directly after the `description String?` line (line ~302):

```prisma
  description             String?
  coverImageUrl           String?  @map("cover_image_url")
```

- [ ] **Step 3: Validate the Prisma schema**

Run: `npm run prisma:validate`
Expected: `The schema at prisma\schema.prisma is valid 🚀`

- [ ] **Step 4: Apply the migration**

Apply `20260605_001_campaign_cover.sql` to the Supabase project (via the Supabase SQL editor or your migration runner). Then confirm in the SQL editor:

```sql
select column_name from information_schema.columns
where table_name = 'campaigns' and column_name = 'cover_image_url';
-- expect 1 row
select id, public from storage.buckets where id = 'campaign-covers';
-- expect 1 row, public = true
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260605_001_campaign_cover.sql prisma/schema.prisma
git commit -m "feat(campaigns): add cover_image_url column + public campaign-covers bucket"
```

---

### Task 2: Cover validation helper (TDD)

**Files:**
- Create: `src/lib/campaigns/cover-validation.ts`
- Test: `tests/unit/campaigns/cover-validation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/campaigns/cover-validation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  validateCoverFile,
  coverExtension,
  coverObjectPathFromUrl,
  MAX_COVER_BYTES,
} from "@/lib/campaigns/cover-validation";

describe("validateCoverFile", () => {
  it("accepts jpeg, png, webp under the size cap", () => {
    expect(validateCoverFile({ type: "image/jpeg", size: 1000 }).ok).toBe(true);
    expect(validateCoverFile({ type: "image/png", size: 1000 }).ok).toBe(true);
    expect(validateCoverFile({ type: "image/webp", size: 1000 }).ok).toBe(true);
  });

  it("rejects a missing/empty file", () => {
    expect(validateCoverFile(null)).toMatchObject({ ok: false, code: "MISSING_FILE" });
    expect(validateCoverFile({ type: "image/png", size: 0 })).toMatchObject({ ok: false, code: "MISSING_FILE" });
  });

  it("rejects disallowed MIME types", () => {
    expect(validateCoverFile({ type: "image/gif", size: 1000 })).toMatchObject({ ok: false, code: "INVALID_FILE_TYPE" });
    expect(validateCoverFile({ type: "application/pdf", size: 1000 })).toMatchObject({ ok: false, code: "INVALID_FILE_TYPE" });
  });

  it("rejects files over the size cap", () => {
    expect(validateCoverFile({ type: "image/png", size: MAX_COVER_BYTES + 1 })).toMatchObject({ ok: false, code: "FILE_TOO_LARGE" });
  });
});

describe("coverExtension", () => {
  it("maps MIME to a file extension", () => {
    expect(coverExtension("image/png")).toBe("png");
    expect(coverExtension("image/webp")).toBe("webp");
    expect(coverExtension("image/jpeg")).toBe("jpg");
  });
});

describe("coverObjectPathFromUrl", () => {
  it("extracts the in-bucket path from a public URL", () => {
    const url = "https://ref.supabase.co/storage/v1/object/public/campaign-covers/abc/cover_123.jpg";
    expect(coverObjectPathFromUrl(url)).toBe("abc/cover_123.jpg");
  });
  it("returns null for null or non-matching URLs", () => {
    expect(coverObjectPathFromUrl(null)).toBeNull();
    expect(coverObjectPathFromUrl("https://example.com/x.jpg")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/campaigns/cover-validation.test.ts`
Expected: FAIL — `Cannot find module '@/lib/campaigns/cover-validation'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/campaigns/cover-validation.ts`:

```ts
/** Allowed cover image MIME types. */
export const ALLOWED_COVER_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Maximum cover image size: 5 MB. */
export const MAX_COVER_BYTES = 5 * 1024 * 1024;

export type CoverValidation =
  | { ok: true }
  | {
      ok: false;
      code: "MISSING_FILE" | "INVALID_FILE_TYPE" | "FILE_TOO_LARGE";
      message: string;
    };

/** Validate a cover file's MIME type and size. Pure — safe to use on client and server. */
export function validateCoverFile(
  file: { type: string; size: number } | null | undefined
): CoverValidation {
  if (!file || file.size === 0) {
    return { ok: false, code: "MISSING_FILE", message: "A cover image file is required" };
  }
  if (!ALLOWED_COVER_MIME.has(file.type)) {
    return { ok: false, code: "INVALID_FILE_TYPE", message: "Only JPG, PNG, or WEBP images are allowed" };
  }
  if (file.size > MAX_COVER_BYTES) {
    return { ok: false, code: "FILE_TOO_LARGE", message: "Cover image exceeds the 5 MB limit" };
  }
  return { ok: true };
}

/** File extension for a validated cover MIME type. */
export function coverExtension(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

/** Derive the in-bucket object path from a public campaign-covers URL (for cleanup). */
export function coverObjectPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = "/campaign-covers/";
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/campaigns/cover-validation.test.ts`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/campaigns/cover-validation.ts tests/unit/campaigns/cover-validation.test.ts
git commit -m "feat(campaigns): add cover image validation helpers with tests"
```

---

### Task 3: Cover upload/remove API endpoint

**Files:**
- Create: `src/app/api/campaigns/[id]/cover/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/api/campaigns/[id]/cover/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/auth-guards";
import { dbError, storageError } from "@/lib/api-errors";
import {
  validateCoverFile,
  coverExtension,
  coverObjectPathFromUrl,
} from "@/lib/campaigns/cover-validation";

const BUCKET = "campaign-covers";

// POST /api/campaigns/[id]/cover — upload or replace the cover (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (admin instanceof NextResponse) return admin;
  const { id } = await params;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: { code: "MISSING_FILE", message: "A cover image file is required" } },
        { status: 400 }
      );
    }
    const check = validateCoverFile(file);
    if (!check.ok) {
      return NextResponse.json({ error: { code: check.code, message: check.message } }, { status: 400 });
    }

    // Confirm the campaign exists and grab the old cover for cleanup.
    const { data: campaign, error: fetchErr } = await supabaseAdmin
      .from("campaigns")
      .select("id, cover_image_url")
      .eq("id", id)
      .single();
    if (fetchErr || !campaign) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    const path = `${id}/cover_${Date.now()}.${coverExtension(file.type)}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) return storageError(uploadError, "campaign-cover.upload");

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("campaigns")
      .update({ cover_image_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (updateError) return dbError(updateError, "campaign-cover.update");

    // Best-effort cleanup of the previous object.
    const oldPath = coverObjectPathFromUrl(campaign.cover_image_url);
    if (oldPath && oldPath !== path) {
      await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
    }

    await supabaseAdmin.from("campaign_audit_log").insert({
      campaign_id: id,
      action: "cover_updated",
      details: { cover_image_url: publicUrl },
      performed_by: admin.id,
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id]/cover — remove the cover (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (admin instanceof NextResponse) return admin;
  const { id } = await params;

  try {
    const { data: campaign, error: fetchErr } = await supabaseAdmin
      .from("campaigns")
      .select("id, cover_image_url")
      .eq("id", id)
      .single();
    if (fetchErr || !campaign) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    const path = coverObjectPathFromUrl(campaign.cover_image_url);
    if (path) await supabaseAdmin.storage.from(BUCKET).remove([path]);

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("campaigns")
      .update({ cover_image_url: null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (updateError) return dbError(updateError, "campaign-cover.delete");

    await supabaseAdmin.from("campaign_audit_log").insert({
      campaign_id: id,
      action: "cover_removed",
      details: {},
      performed_by: admin.id,
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/campaigns/[id]/cover/route.ts
git commit -m "feat(campaigns): add cover upload/remove API endpoint"
```

(Runtime verification of this endpoint happens in Task 13's manual checklist.)

---

### Task 4: Dealer active-campaign mapper + `coverImageUrl` (TDD)

**Files:**
- Create: `src/lib/campaigns/active-mapper.ts`
- Test: `tests/unit/campaigns/active-mapper.test.ts`
- Modify: `src/app/api/campaigns/active/route.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/campaigns/active-mapper.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { toActiveCampaign, discountLabelFromItems } from "@/lib/campaigns/active-mapper";

describe("discountLabelFromItems", () => {
  it("prefers the highest percentage", () => {
    expect(discountLabelFromItems([
      { discount_type: "percentage", discount_value: 10 },
      { discount_type: "percentage", discount_value: 25 },
      { discount_type: "fixed", discount_value: 50 },
    ])).toBe("25%");
  });
  it("falls back to the highest fixed amount", () => {
    expect(discountLabelFromItems([{ discount_type: "fixed", discount_value: 50 }])).toBe("50 EGP");
  });
  it("returns null with no items", () => {
    expect(discountLabelFromItems([])).toBeNull();
  });
});

describe("toActiveCampaign", () => {
  const base = {
    id: "c1", name: "Summer", description: null, campaign_type: "discount",
    start_date: "2026-06-01", end_date: "2026-06-30", target_audience: "all",
  };
  it("maps coverImageUrl when present", () => {
    const out = toActiveCampaign({ ...base, cover_image_url: "https://x/y.jpg", campaign_items: [] });
    expect(out.coverImageUrl).toBe("https://x/y.jpg");
    expect(out.description).toBe("");
    expect(out.itemCount).toBe(0);
  });
  it("defaults coverImageUrl to null when absent", () => {
    const out = toActiveCampaign({ ...base, campaign_items: [{ discount_type: "percentage", discount_value: 15 }] });
    expect(out.coverImageUrl).toBeNull();
    expect(out.discountLabel).toBe("15%");
    expect(out.itemCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/campaigns/active-mapper.test.ts`
Expected: FAIL — `Cannot find module '@/lib/campaigns/active-mapper'`.

- [ ] **Step 3: Write the mapper**

Create `src/lib/campaigns/active-mapper.ts`:

```ts
export type ActiveCampaignItemRow = { discount_type: string; discount_value: number };

export type ActiveCampaignRow = {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  start_date: string;
  end_date: string;
  target_audience: string;
  cover_image_url?: string | null;
  campaign_items?: ActiveCampaignItemRow[];
};

export type ActiveCampaign = {
  id: string;
  name: string;
  description: string;
  campaignType: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
  discountLabel: string | null;
  itemCount: number;
};

/** Representative discount label: highest percentage, else highest fixed amount. */
export function discountLabelFromItems(items: ActiveCampaignItemRow[]): string | null {
  const pct = items.filter((i) => i.discount_type === "percentage").map((i) => Number(i.discount_value));
  const fixed = items.filter((i) => i.discount_type === "fixed").map((i) => Number(i.discount_value));
  const maxPct = pct.length ? Math.max(...pct) : null;
  const maxFixed = fixed.length ? Math.max(...fixed) : null;
  if (maxPct !== null) return `${maxPct}%`;
  if (maxFixed !== null) return `${maxFixed} EGP`;
  return null;
}

/** Shape a raw campaign row into the dealer card/banner DTO. */
export function toActiveCampaign(row: ActiveCampaignRow): ActiveCampaign {
  const items = row.campaign_items ?? [];
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    campaignType: row.campaign_type,
    startDate: row.start_date,
    endDate: row.end_date,
    coverImageUrl: row.cover_image_url ?? null,
    discountLabel: discountLabelFromItems(items),
    itemCount: items.length,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/campaigns/active-mapper.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the mapper into the active route**

In `src/app/api/campaigns/active/route.ts`:

(a) Add the import after the existing imports (below line 5):

```ts
import { toActiveCampaign, type ActiveCampaignRow } from "@/lib/campaigns/active-mapper";
```

(b) Add `cover_image_url` to the `.select(...)` string (currently line 42-44) so it reads:

```ts
    .select(
      "id, name, description, campaign_type, status, start_date, end_date, target_audience, target_dealer_ids, cover_image_url, campaign_items(discount_type, discount_value)"
    )
```

(c) Replace the entire block from `type ItemRow = {` through the end of the `const campaigns = (data ?? []).map(...)` assignment (currently lines 56-99) with:

```ts
  const campaigns = (data ?? []).map((c) => toActiveCampaign(c as ActiveCampaignRow));
```

Leave `return NextResponse.json({ data: campaigns });` unchanged.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/campaigns/active-mapper.ts tests/unit/campaigns/active-mapper.test.ts src/app/api/campaigns/active/route.ts
git commit -m "feat(campaigns): expose coverImageUrl from active endpoint via tested mapper"
```

---

### Task 5: Allow Supabase image host in Next config

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Add the host derivation**

In `next.config.ts`, directly after the `supabaseOrigin` IIFE block (after line 11), add:

```ts
const supabaseHost = (() => {
  try {
    return supabaseUrl ? new URL(supabaseUrl).hostname : "";
  } catch {
    return "";
  }
})();
```

- [ ] **Step 2: Add the `images` config**

In the `nextConfig` object, add an `images` key after the `turbopack` block (after line 50, before `typescript:`):

```ts
  images: supabaseHost
    ? {
        remotePatterns: [
          {
            protocol: "https" as const,
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ],
      }
    : undefined,
```

(The existing CSP already allows `img-src ... ${supabaseOrigin}`, so no CSP change is needed.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts
git commit -m "feat(campaigns): allow Supabase storage host for next/image"
```

---

### Task 6: Reusable `CampaignCoverUpload` component

**Files:**
- Create: `src/components/campaign-wizard/campaign-cover-upload.tsx`

This component has two modes:
- **Deferred** (no `campaignId`): used by the create wizard. Never calls the network; reports the chosen `File` via `onFileSelected`. Shows a local preview.
- **Immediate** (`campaignId` set): used by the edit page. Uploads/removes against `/api/campaigns/[id]/cover` right away and manages its own preview from `initialUrl` + server responses.

- [ ] **Step 1: Write the component**

Create `src/components/campaign-wizard/campaign-cover-upload.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2, AlertCircle } from "lucide-react";
import { validateCoverFile } from "@/lib/campaigns/cover-validation";

interface CampaignCoverUploadProps {
  /** Current saved cover URL (edit mode) or null. */
  initialUrl?: string | null;
  /**
   * When set, the component uploads/removes immediately against
   * /api/campaigns/[id]/cover (edit mode). When omitted, it works in deferred
   * mode and reports the chosen File via onFileSelected (create/wizard mode).
   */
  campaignId?: string;
  /** Deferred mode only: receives the chosen File, or null when cleared. */
  onFileSelected?: (file: File | null) => void;
}

export default function CampaignCoverUpload({
  initialUrl = null,
  campaignId,
  onFileSelected,
}: CampaignCoverUploadProps) {
  const immediate = Boolean(campaignId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(initialUrl);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Revoke object URLs to avoid leaks.
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const preview = localPreview ?? savedUrl;

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    const check = validateCoverFile(file);
    if (!check.ok) {
      setErr(check.message);
      return;
    }
    setErr("");

    if (!immediate) {
      // Deferred: keep a local preview and hand the File to the parent.
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(URL.createObjectURL(file));
      onFileSelected?.(file);
      return;
    }

    // Immediate: upload now.
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/campaigns/${campaignId}/cover`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Upload failed");
      setSavedUrl(body.data.cover_image_url ?? null);
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
        setLocalPreview(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setErr("");
    if (!immediate) {
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
      setSavedUrl(null);
      onFileSelected?.(null);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/cover`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Remove failed");
      setSavedUrl(null);
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
        setLocalPreview(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleSelect} className="hidden" />

      {preview ? (
        <div className="relative h-40 w-full overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#0D0D0D]">
          <Image src={preview} alt="Campaign cover" fill sizes="(max-width: 1024px) 100vw, 640px" className="object-cover" unoptimized={Boolean(localPreview)} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-md bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/80 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-md bg-black/60 px-3 py-1.5 text-xs font-semibold text-red-300 backdrop-blur transition hover:bg-black/80 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#2A2A2A] bg-[#0D0D0D] text-white/40 transition hover:border-[#00BFA6]/40 hover:text-[#00BFA6] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          <span className="text-sm font-semibold">Add cover image</span>
          <span className="text-[11px] text-white/30">JPG, PNG, or WEBP · ≤ 5 MB · 16:9 recommended</span>
        </button>
      )}

      {err && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" /> {err}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/campaign-wizard/campaign-cover-upload.tsx
git commit -m "feat(campaigns): add reusable CampaignCoverUpload component"
```

---

### Task 7: Wizard Basics step — cover field + two-phase save

**Files:**
- Modify: `src/app/dashboard/admin/campaigns/new/page.tsx`

- [ ] **Step 1: Import the component**

After the existing import `import ItemsCSVUpload from "@/components/campaign-wizard/items-csv-upload";` (line 25), add:

```ts
import CampaignCoverUpload from "@/components/campaign-wizard/campaign-cover-upload";
```

- [ ] **Step 2: Add cover state**

After `const [description, setDescription] = useState("");` (line 68), add:

```ts
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const coverPreview = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : null),
    [coverFile]
  );
```

- [ ] **Step 3: Render the cover field in the Basics step**

In the Basics step, immediately after the Description `<div>` block (which ends at line 353, just before the `Campaign Type *` block), insert:

```tsx
              <div>
                <Label className={labelClass}>Cover Image</Label>
                <p className="mb-2 text-[11px] text-white/30">
                  Optional. Shown to dealers on campaign cards and the dashboard banner.
                </p>
                <CampaignCoverUpload onFileSelected={setCoverFile} />
              </div>
```

- [ ] **Step 4: Upload the cover after create (two-phase save)**

In `handleSave`, replace the success block (currently lines 203-204):

```ts
      const body = await res.json();
      router.push(`/dashboard/admin/campaigns/${body.data.id}`);
```

with:

```ts
      const body = await res.json();
      const newId = body.data.id as string;

      // Phase 2: upload the cover (optional). If it fails, the campaign still
      // exists — send the admin to the edit page to retry rather than losing it.
      if (coverFile) {
        const fd = new FormData();
        fd.append("file", coverFile);
        const coverRes = await fetch(`/api/campaigns/${newId}/cover`, { method: "POST", body: fd });
        if (!coverRes.ok) {
          router.push(`/dashboard/admin/campaigns/${newId}/edit`);
          return;
        }
      }
      router.push(`/dashboard/admin/campaigns/${newId}`);
```

- [ ] **Step 5: Show the cover in the Review step**

In the Review step summary, after the `<ReviewRow label="Description" ... />` line (line 683), insert:

```tsx
                <ReviewRow
                  label="Cover"
                  value={
                    coverPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverPreview} alt="Cover preview" className="h-16 w-28 rounded-md object-cover" />
                    ) : (
                      "None"
                    )
                  }
                />
```

(A plain `<img>` is used here because the preview is a local `blob:` object URL, which `next/image` should not optimize.)

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: exit 0. (`useMemo` is already imported in this file.)

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/admin/campaigns/new/page.tsx
git commit -m "feat(campaigns): add cover image to the new-campaign wizard"
```

---

### Task 8: Edit page — cover section (immediate)

**Files:**
- Modify: `src/app/dashboard/admin/campaigns/[id]/edit/page.tsx`

- [ ] **Step 1: Import the component**

After `import { Label } from "@/components/ui/label";` (line 14), add:

```ts
import CampaignCoverUpload from "@/components/campaign-wizard/campaign-cover-upload";
```

- [ ] **Step 2: Add cover state**

After `const [campaignStatus, setCampaignStatus] = useState("");` (line 54), add:

```ts
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
```

- [ ] **Step 3: Load the existing cover**

In the load effect, after `setCampaignStatus(c.status || "");` (line 81), add:

```ts
        setCoverUrl(c.cover_image_url ?? null);
```

- [ ] **Step 4: Render the cover section**

Immediately after the "Basic Info" `</Card>` (closes at line 276), insert a new card:

```tsx
      {/* Cover Image */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader><CardTitle className="text-sm text-white">Cover Image</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-2 text-[11px] text-white/30">
            Optional. Changes are saved immediately. Shown to dealers on campaign cards and the dashboard banner.
          </p>
          <CampaignCoverUpload campaignId={campaignId} initialUrl={coverUrl} />
        </CardContent>
      </Card>
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/admin/campaigns/[id]/edit/page.tsx
git commit -m "feat(campaigns): add cover image management to campaign edit page"
```

---

### Task 9: Admin detail page — cover preview

**Files:**
- Modify: `src/app/dashboard/admin/campaigns/[id]/page.tsx`

- [ ] **Step 1: Import next/image**

After `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";` (line 35), add:

```ts
import Image from "next/image";
```

- [ ] **Step 2: Add the field to the Campaign type**

In the `type Campaign = {` block, after `description: string | null;` (line 71), add:

```ts
  cover_image_url: string | null;
```

- [ ] **Step 3: Render the cover in the Overview tab**

Find the Overview tab panel (search for `activeTab === "overview"`). Insert this block as the **first child** of that panel's top-level container:

```tsx
          {campaign.cover_image_url && (
            <div className="relative mb-4 h-48 w-full overflow-hidden rounded-xl border border-[#2A2A2A]">
              <Image
                src={campaign.cover_image_url}
                alt={campaign.name}
                fill
                sizes="(max-width: 1024px) 100vw, 960px"
                className="object-cover"
              />
            </div>
          )}
```

(If the overview panel renders a fragment `<>...</>` or a grid as its first element, place this block immediately inside that wrapper, before the existing first child.)

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/admin/campaigns/[id]/page.tsx
git commit -m "feat(campaigns): show cover preview on campaign detail page"
```

---

### Task 10: Admin list — cover thumbnail

**Files:**
- Modify: `src/app/dashboard/admin/campaigns/page.tsx`

- [ ] **Step 1: Import next/image**

After `import { Input } from "@/components/ui/input";` (line 39), add:

```ts
import Image from "next/image";
```

- [ ] **Step 2: Add the field to the Campaign type**

In the `type Campaign = {` block, after `description: string | null;` (line 52), add:

```ts
  cover_image_url: string | null;
```

- [ ] **Step 3: Render a thumbnail in the Campaign cell**

In the table body, replace the Campaign `<TableCell>` block (currently lines 617-624) with:

```tsx
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {c.cover_image_url ? (
                            <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md border border-[#2A2A2A]">
                              <Image src={c.cover_image_url} alt={c.name} fill sizes="64px" className="object-cover" />
                            </div>
                          ) : (
                            <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md border border-[#2A2A2A] bg-[#0D0D0D]">
                              <Megaphone className="h-4 w-4 text-white/20" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white">{c.name}</p>
                            <p className="mt-0.5 max-w-xs truncate text-xs text-white/40">
                              {c.description || "No description"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
```

(`Megaphone` is already imported in this file.)

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/admin/campaigns/page.tsx
git commit -m "feat(campaigns): show cover thumbnail in admin campaigns list"
```

---

### Task 11: Dealer campaign cards — cover + gradient fallback

**Files:**
- Modify: `src/app/dashboard/campaigns/page.tsx`

- [ ] **Step 1: Import next/image**

At the top, after `import { useEffect, useMemo, useState } from "react";` (line 3), add:

```ts
import Image from "next/image";
```

- [ ] **Step 2: Add `coverImageUrl` to the type**

In `type ActiveCampaign = {`, after `description: string;` (line 10), add:

```ts
  coverImageUrl: string | null;
```

- [ ] **Step 3: Replace the `CampaignCard` component**

Replace the entire `CampaignCard` function (currently lines 31-65) with:

```tsx
function CampaignCard({ campaign, idx }: { campaign: ActiveCampaign; idx: number }) {
  const daysLeft = daysLeftFrom(campaign.endDate);
  const isExpired = daysLeft === 0;
  const hasCover = Boolean(campaign.coverImageUrl);

  return (
    <div
      className={`relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-xl border border-[#2A2A2A] ${
        hasCover ? "bg-[#0D0D0D]" : `bg-gradient-to-br p-6 ${gradients[idx % gradients.length]}`
      }`}
    >
      {hasCover && (
        <>
          <Image
            src={campaign.coverImageUrl as string}
            alt={campaign.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
        </>
      )}

      <div className={`relative z-10 flex flex-1 flex-col justify-between ${hasCover ? "p-6" : ""}`}>
        <div className="flex items-center justify-between">
          <StatusBadge
            tone={isExpired ? "destructive" : daysLeft <= 7 ? "warning" : "success"}
            label={isExpired ? "Expired" : `${daysLeft} days left`}
          />
          {campaign.discountLabel && (
            <div className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white/10 px-2 text-sm font-bold text-white">
              {campaign.discountLabel}
            </div>
          )}
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-bold text-white">{campaign.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-white/60">{campaign.description}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
            <CalendarDays className="h-3.5 w-3.5" />
            Valid until{" "}
            {new Date(campaign.endDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
```

(Text colors are lifted slightly — `text-white/60`, `text-white/50` — for legibility over a photo; the gradient overlay guarantees contrast.)

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/campaigns/page.tsx
git commit -m "feat(campaigns): render cover image on dealer campaign cards"
```

---

### Task 12: Dealer dashboard banner

**Files:**
- Modify: `src/components/dashboard/campaign-banner.tsx` (currently `export {}`)
- Modify: `src/app/dashboard/page.tsx` (mount it)

- [ ] **Step 1: Implement the banner**

Replace the entire contents of `src/components/dashboard/campaign-banner.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

type ActiveCampaign = {
  id: string;
  name: string;
  description: string;
  endDate: string;
  coverImageUrl: string | null;
  discountLabel: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
function daysLeftFrom(end: string): number {
  return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / DAY_MS));
}

export function CampaignBanner() {
  const [featured, setFeatured] = useState<ActiveCampaign | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/campaigns/active")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((body) => {
        const list: ActiveCampaign[] = body.data ?? [];
        // The active endpoint returns soonest-ending first; feature the first
        // one that actually has a cover image.
        const withCover = list.find((c) => c.coverImageUrl) ?? null;
        if (!cancelled) setFeatured(withCover);
      })
      .catch(() => {
        if (!cancelled) setFeatured(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!featured || !featured.coverImageUrl) return null;
  const left = daysLeftFrom(featured.endDate);

  return (
    <Link
      href="/dashboard/campaigns"
      className="group relative block h-44 w-full overflow-hidden rounded-2xl border border-[#2A2A2A]"
    >
      <Image
        src={featured.coverImageUrl}
        alt={featured.name}
        fill
        sizes="100vw"
        className="object-cover transition duration-500 group-hover:scale-105"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />
      <div className="relative z-10 flex h-full max-w-xl flex-col justify-center gap-2 p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#00BFA6]/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#00BFA6]">
            Campaign
          </span>
          {featured.discountLabel && (
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white">
              {featured.discountLabel}
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold text-white">{featured.name}</h2>
        {featured.description && (
          <p className="line-clamp-1 text-sm text-white/60">{featured.description}</p>
        )}
        <div className="mt-1 flex items-center gap-3 text-xs text-white/50">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {left} day{left !== 1 ? "s" : ""} left
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-[#00BFA6]">
            View campaigns
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Mount the banner on the dealer dashboard**

In `src/app/dashboard/page.tsx`, after the lucide-react import block (after line 29), add:

```ts
import { CampaignBanner } from "@/components/dashboard/campaign-banner";
```

Then, inside the returned JSX, immediately after the closing `</div>` of the page-header block (the `<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">…</div>` that starts at line 114), insert on its own line:

```tsx
      <CampaignBanner />
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/campaign-banner.tsx src/app/dashboard/page.tsx
git commit -m "feat(campaigns): add cover-image campaign banner to dealer dashboard"
```

---

### Task 13: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the unit tests**

Run: `npm test`
Expected: PASS, including the new `tests/unit/campaigns/*` suites.

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck`
Expected: exit 0.

Run: `npm run lint`
Expected: no errors (warnings acceptable if pre-existing).

- [ ] **Step 3: Manual verification checklist**

Start the dev server if not running (`npm run dev`) and verify, signed in as an admin:

1. **Create with cover:** New Campaign wizard → Basics → add a JPG/PNG cover (preview shows) → complete the wizard → Create. You land on the detail page and the cover shows in the Overview tab.
2. **Validation:** Try a `.gif` or a >5 MB image → inline error, no upload.
3. **List thumbnail:** `/dashboard/admin/campaigns` shows the cover thumbnail for that campaign; campaigns without a cover show the placeholder icon.
4. **Edit replace/remove:** Open the campaign's Edit page → Replace the cover (updates immediately) → Remove (reverts to placeholder).
5. **Dealer card:** Activate the campaign (target "all"). Sign in as an approved dealer → `/dashboard/campaigns` shows the cover as the card background; a campaign without a cover shows the gradient.
6. **Dealer banner:** On `/dashboard`, the banner features the soonest-ending active campaign that has a cover. With no covered active campaign, the banner is absent.
7. **Authz:** A dealer calling `POST /api/campaigns/<id>/cover` is rejected (401/403).

- [ ] **Step 4: Final confirmation**

Confirm `git status` shows only the intended campaign-cover files committed across Tasks 1–12 (plus the pre-existing unrelated working-tree changes still uncommitted, untouched).

---

## Self-review (completed by plan author)

- **Spec coverage:** column + bucket (Task 1) ✓; storage approach public (Task 1) ✓; upload endpoint POST/DELETE (Task 3) ✓; validation 5 MB / JPEG-PNG-WEBP (Tasks 2,3,6) ✓; active endpoint `coverImageUrl` (Task 4) ✓; next/image host (Task 5) ✓; reusable upload component (Task 6) ✓; wizard Basics + two-phase create + review thumbnail (Task 7) ✓; edit replace/remove immediate (Task 8) ✓; detail preview (Task 9) ✓; list thumbnail (Task 10) ✓; dealer card + gradient fallback (Task 11) ✓; dashboard banner, cover-only, hidden when none (Task 12) ✓; tests + manual checklist (Task 13) ✓. Out-of-scope items (cropping, galleries, per-locale, duplicate copying the cover) are not implemented — correct.
- **Placeholder scan:** none — every code step has complete code; UI edits use search-anchor + complete blocks.
- **Type consistency:** `coverImageUrl` (camel, DTO/active-mapper + dealer card + banner) vs `cover_image_url` (snake, DB column + admin row types + API) are used consistently per layer. `validateCoverFile`, `coverExtension`, `coverObjectPathFromUrl`, `toActiveCampaign`, `discountLabelFromItems`, `CampaignCoverUpload` names match across definition and use sites.
