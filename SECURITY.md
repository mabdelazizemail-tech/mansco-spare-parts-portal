# Security Model & Runbook — MANSCO Spare Parts Portal

This document describes the portal's security model, the controls added during
the 2026-05 hardening pass, the remaining known gaps, and operational runbooks.

## 1. Trust & identity

- **Identity provider:** Supabase Auth. Sessions are carried in httpOnly cookies
  via `@supabase/ssr`. The portal stores **no passwords**.
- **Roles** live in `user_metadata.role`: `dealer`, `sub_dealer`, `admin`,
  `super_admin`. Dealer access additionally requires
  `user_metadata.registration_status === "approved"`.
- **Service-role key** (`SUPABASE_SERVICE_ROLE_KEY`) is server-side only. It
  bypasses RLS, so **in-code authorization is the primary control** — RLS is
  defense-in-depth.

## 2. Authorization model (two layers)

1. **Edge middleware** (`src/middleware.ts`)
   - Public routes are matched **exactly** (`PUBLIC_EXACT`) or via an explicit
     page-prefix list (`PUBLIC_PAGE_PREFIXES`). `/api/registration` is public
     **only** as the exact signup POST — its sub-paths are protected.
   - No bypass cookies. (The former `demo-admin` backdoor and the `admin/admin`
     login shortcut were removed.)
2. **Per-route guards** (`src/lib/auth-guards.ts`)
   - `requireAdmin()` → `NextResponse | null`
   - `getAdminUser()` → `User | NextResponse` (use when you need the admin's id)
   - `requireDealerSession()` → dealer id `string | NextResponse`
   - `requireDealerOwnership()` → enforces a dealer can only touch their own data
   - **Rule:** audit/identity fields (`reviewed_by`, `approved_by`,
     `created_by`, `performed_by`, `reviewer_id`) are derived from the session,
     never from the request body.

## 3. Controls added in the 2026-05 hardening pass

| # | Control | Location |
|---|---------|----------|
| 1 | Admin guards on `registration/list`, `registration/[id]/review`, `registration/documents`, `orders/[id]/review`, and all `campaigns/**` routes | those route handlers |
| 2 | Exact-match public allowlist (no sub-path leakage) | `src/middleware.ts` |
| 3 | Removed `demo-admin` bypass + `admin/admin` login backdoor | `src/middleware.ts`, `src/app/page.tsx` |
| 4 | `registration/documents` scoped to `registrations/` prefix, traversal-blocked | `src/app/api/registration/documents/route.ts` |
| 5 | Session-derived reviewer identity | `src/app/api/orders/[id]/review/route.ts` |
| 6 | Rate-limit stub (NOT yet enforced) | `src/lib/rate-limit.ts` |
| 7 | Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) | `next.config.ts` |
| 8 | Build fails on type/lint errors | `next.config.ts` |
| 9 | Generic-in-prod error responses (no Postgres detail leakage) | `src/lib/api-errors.ts` |
| 10 | Registration upload MIME + 10 MB size validation | `src/app/api/registration/route.ts` |
| 11 | RLS enabled on all tables + dealer self-service policies | `supabase/migrations/20260531_001_enable_rls.sql` |
| 13 | Authorization integration tests | `tests/unit/api/authz-guards.test.ts` |
| 14 | CI (lint, typecheck, test, build, `npm audit`, drift) | `.github/workflows/ci.yml` |

## 4. Known gaps / follow-ups

- **Rate limiting (item 6) is NOT enforced.** Wire `src/lib/rate-limit.ts` to a
  durable store (Upstash Redis via Vercel Marketplace, or Vercel Firewall/BotID)
  on `POST /api/registration`, login, and uploads.
- **`xlsx@0.18.5` (item 10) has known CVEs** (CVE-2023-30533 prototype
  pollution; CVE-2024-22363 ReDoS). The npm registry version is frozen at
  0.18.5. **Action:** install the patched build from the SheetJS CDN, e.g.
  `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, then re-run
  `npm install` to refresh the lockfile. Not changed automatically to avoid
  breaking the lockfile without a verified install.
- **CSP uses `'unsafe-inline'`/`'unsafe-eval'` for scripts** as a pragmatic
  baseline. Harden to a nonce-based policy.
- **Data-layer drift (item 12):** runtime uses the Supabase client; the Prisma
  schema is documentation + drift target. Decide whether to adopt Prisma at
  runtime or formally retire it. `npm run prisma:drift` guards the schema.
- **Audit trail** is per-domain (`order_timeline`, `order_approvals`,
  `campaign_audit_log`, `sync_logs`). Consider a unified audit table.

## 5. Lightweight threat model (STRIDE)

| Threat | Vector | Mitigation |
|--------|--------|------------|
| Spoofing | Forged reviewer/creator id | Identity from session only (§2) |
| Tampering | Direct table writes via anon key | RLS default-deny + service-role-only writes |
| Repudiation | Untracked admin actions | Per-domain audit logs + session-stamped actors |
| Info disclosure | Unauth PII / document read (IDOR) | Admin guards + path allow-listing + RLS |
| DoS | Signup/login/upload flooding | **Open** — rate limiting deferred (item 6) |
| Elevation of privilege | Unguarded admin endpoints, bypass cookie | Guards on all routes; bypass removed |

## 6. Runbooks

### Rotate the Supabase service-role key
1. Supabase Dashboard → Project Settings → API → regenerate `service_role`.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel (all environments) and `.env.local`.
3. Redeploy. Verify admin API routes still authorize.

### Respond to a suspected data exposure
1. Rotate the service-role and anon keys immediately.
2. Review Supabase logs for anomalous reads on `dealer_registrations` / storage.
3. Confirm middleware public allowlist is exact-match and all `/api/*` handlers
   call a guard (`grep -L requireAdmin\|requireDealer\|getAdminUser src/app/api/**/route.ts`).
4. Verify RLS is enabled: `select relrowsecurity from pg_class where relname = 'dealers';`

### Before each release
- `npm run lint && npm run typecheck && npm test && npm run build`
- `npm audit --omit=dev --audit-level=high`
- Confirm no `.env*` (except `.env.example`) is staged.

## 7. Reporting

Report vulnerabilities privately to the MANSCO platform owner. Do not open public
issues for security findings.
