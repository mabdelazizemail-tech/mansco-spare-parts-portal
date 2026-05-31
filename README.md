# MANSCO Spare Parts Portal

A centralized web portal for MANSCO / Peugeot Egypt dealers and sub-dealers to
manage the spare-parts lifecycle: inquiries, order placement, order tracking,
financial follow-up, and reporting. It integrates with SAP **offline** via
batch CSV exchange (SAP is the source of truth for inventory, pricing, rules).

> Architectural detail, data model, and business rules live in [`CLAUDE.md`](./CLAUDE.md).
> Security model, threat notes, and the hardening runbook live in [`SECURITY.md`](./SECURITY.md).

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) + TypeScript + React 19 |
| UI | Tailwind CSS v4 + shadcn/ui |
| Auth & identity | Supabase Auth (RBAC via `user_metadata.role`) |
| Data access (runtime) | Supabase JS client against Postgres |
| Schema / migrations | Prisma schema (source of truth) + SQL migrations in `supabase/migrations` |
| Storage | Supabase Storage (dealer documents, CSV, invoices) |
| CSV/Excel | papaparse + SheetJS (xlsx) |
| Testing | Vitest (unit/integration) + Playwright (E2E) |

> Note on the data layer: API routes currently use the Supabase client
> (`supabaseAdmin`) directly — there is no Prisma runtime client. The Prisma
> schema is retained for documentation and drift-checking. See `SECURITY.md`
> and `CLAUDE.md` for the open architectural decision.

## Getting started

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local      # fill in Supabase credentials

# 3. Run the dev server
npm run dev                     # http://localhost:3000
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (type + lint errors fail the build) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit + integration suite |
| `npm run test:coverage` | Coverage report |
| `npm run test:e2e:playwright` | Playwright E2E |
| `npm run prisma:validate` | Validate the Prisma schema |
| `npm run prisma:drift` | Fail if the schema and the live DB have drifted (needs `DATABASE_URL`) |

## Project structure

```
src/
├── app/                 # App Router pages + API route handlers
│   ├── api/             # Route handlers (all self-guard with auth-guards)
│   └── dashboard/       # Dealer + admin portal pages
├── components/          # UI + feature components
├── lib/
│   ├── auth-guards.ts   # requireAdmin / getAdminUser / requireDealerSession
│   ├── api-errors.ts    # Generic-in-prod error responses
│   ├── rate-limit.ts    # Rate-limit stub (not yet enforced — see SECURITY.md)
│   ├── rules/           # Business rule checks (availability, financial, ...)
│   ├── sync/            # SAP CSV import
│   └── supabase/        # Browser / server / service-role clients
└── middleware.ts        # Edge auth gate + route guards
supabase/migrations/     # SQL migrations (incl. RLS)
prisma/schema.prisma     # Schema source of truth
```

## Security

Authorization is enforced in two layers:

1. **Middleware** (`src/middleware.ts`) — gates page/route access by session and
   role. Public routes are matched **exactly** (no sub-path wildcarding).
2. **Per-route guards** (`src/lib/auth-guards.ts`) — every `/api/*` handler
   calls `requireAdmin()` / `getAdminUser()` / `requireDealerSession()`.
   Identity for audit fields is taken from the **session**, never the request body.

Defense-in-depth RLS policies are in `supabase/migrations/20260531_001_enable_rls.sql`.

See [`SECURITY.md`](./SECURITY.md) for the full model, known gaps, and runbook.

## Deployment

Targets Vercel (Next.js App Router). CI (`.github/workflows/ci.yml`) runs lint,
typecheck, tests, build, and `npm audit` on every PR.
```
