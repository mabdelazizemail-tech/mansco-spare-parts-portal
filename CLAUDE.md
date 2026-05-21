# MANSCO Spare Parts Portal

## Project Overview

A centralized web portal for MANSCO/Peugeot Egypt dealers and sub-dealers to manage the end-to-end spare parts lifecycle: inquiries, order placement, order tracking, financial follow-up, and reporting. Replaces manual representative-mediated processes with self-service + governed exceptions.

The portal integrates with SAP **offline** through structured CSV-based data exchange. SAP is the single source of truth for inventory, pricing, and business rules. Sync is batch-based (scheduled + event-driven), not real-time.

## Architecture

### Tech Stack

- **Framework:** Next.js 14+ (App Router) with TypeScript
- **UI:** Tailwind CSS + shadcn/ui component library
- **Database:** Supabase PostgreSQL (hosted) + Prisma ORM for application queries
- **Auth & Registration:** Supabase Auth (email/password, magic link, OAuth) — handles dealer self-registration, email verification, password reset, and session management. RBAC enforced via Supabase RLS policies + application middleware
- **SAP Integration:** CSV parser (papaparse) + node-cron for batch sync
- **File Storage:** Supabase Storage for CSV staging, invoices, audit logs (replaces raw S3)
- **Testing:** Vitest (unit), Playwright (E2E), Supertest (API)
- **Deployment:** Docker, GitHub Actions CI/CD

### Project Structure

```
mansco-portal/
├── CLAUDE.md                    # This file
├── prisma/
│   ├── schema.prisma            # Database schema
│   ├── migrations/              # Prisma migrations
│   └── seed.ts                  # Seed data for dev/testing
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Auth pages
│   │   │   ├── login/           # Dealer & admin login
│   │   │   ├── register/        # Dealer self-registration form
│   │   │   ├── verify-email/    # Email verification callback
│   │   │   ├── forgot-password/ # Password reset request
│   │   │   ├── reset-password/  # Password reset form
│   │   │   └── pending-approval/# Post-registration waiting screen
│   │   ├── (dealer)/            # Dealer-facing routes (requires approved status)
│   │   │   ├── dashboard/       # Financial summary, targets, campaigns
│   │   │   ├── parts/           # Part search & availability
│   │   │   ├── orders/          # Order creation, history, tracking
│   │   │   │   ├── new/         # New order flow (by type)
│   │   │   │   └── [id]/        # Order detail & tracking
│   │   │   ├── invoices/        # Invoice listing & detail
│   │   │   └── backorders/      # Backorder tracking
│   │   ├── (admin)/             # Admin-facing routes
│   │   │   ├── dashboard/       # Operational dashboard
│   │   │   ├── dealers/         # Dealer/sub-dealer management
│   │   │   │   ├── registrations/ # Pending registration review queue
│   │   │   │   └── [id]/        # Dealer detail, edit, permissions
│   │   │   ├── approvals/       # Order review queue
│   │   │   ├── reports/         # Inquiry, lost-sales, operational
│   │   │   └── settings/        # System config, rules, campaigns
│   │   ├── api/                 # API routes
│   │   │   ├── auth/            # Auth endpoints (Supabase callbacks)
│   │   │   │   └── callback/    # Supabase auth callback handler
│   │   │   ├── registration/    # Dealer registration + admin approval
│   │   │   ├── dealers/         # Dealer CRUD
│   │   │   ├── parts/           # Part search, availability
│   │   │   ├── orders/          # Order CRUD, status updates
│   │   │   ├── invoices/        # Invoice endpoints
│   │   │   ├── reports/         # Report generation
│   │   │   └── sync/            # SAP CSV sync triggers
│   │   └── layout.tsx           # Root layout
│   ├── components/
│   │   ├── ui/                  # shadcn/ui base components
│   │   ├── dealer/              # Dealer-specific components
│   │   ├── admin/               # Admin-specific components
│   │   └── shared/              # Shared components (tables, charts, status badges)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        # Browser Supabase client (createBrowserClient)
│   │   │   ├── server.ts        # Server-side Supabase client (createServerClient)
│   │   │   ├── admin.ts         # Supabase service-role client (admin operations)
│   │   │   └── middleware.ts    # Supabase auth middleware for Next.js
│   │   ├── auth.ts              # Auth helpers, session getters, role checks
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── validators/          # Zod schemas for all entities
│   │   ├── rules/               # Business rule engine
│   │   │   ├── engine.ts        # Main rule orchestrator
│   │   │   ├── eligibility.ts   # Dealer eligibility checks
│   │   │   ├── stock.ts         # Stock availability validation
│   │   │   ├── pricing.ts       # Pricing & discount rules
│   │   │   ├── quota.ts         # Quota & order limit checks
│   │   │   └── financial.ts     # Credit/financial block rules
│   │   ├── sync/                # SAP CSV sync engine
│   │   │   ├── importer.ts      # CSV import (SAP → Portal)
│   │   │   ├── exporter.ts      # CSV export (Portal → SAP)
│   │   │   ├── scheduler.ts     # Cron job scheduler
│   │   │   ├── schemas/         # CSV column definitions per file type
│   │   │   └── audit.ts         # Sync audit logging
│   │   ├── notifications/       # Email/in-app notification service
│   │   └── utils/               # General utilities
│   ├── hooks/                   # Custom React hooks
│   ├── types/                   # Shared TypeScript types
│   └── middleware.ts            # Auth middleware, role guards
├── public/                      # Static assets
├── tests/
│   ├── unit/                    # Vitest unit tests
│   │   ├── rules/               # Rule engine tests (critical)
│   │   └── sync/                # CSV sync tests
│   ├── integration/             # API integration tests
│   └── e2e/                     # Playwright E2E tests
├── scripts/
│   ├── sync-sap.ts              # Manual SAP sync trigger
│   └── generate-test-csv.ts     # Generate sample CSV files
├── csv-schemas/                 # CSV format documentation
│   ├── README.md                # CSV exchange protocol
│   ├── stock-availability.csv   # Sample: stock data from SAP
│   ├── pricing.csv              # Sample: price lists from SAP
│   ├── orders-export.csv        # Sample: orders sent to SAP
│   └── invoices-import.csv      # Sample: invoices from SAP
├── docker-compose.yml           # Local dev (Supabase local via CLI, or MinIO fallback)
├── Dockerfile                   # Production build
├── supabase/
│   ├── config.toml              # Supabase local dev config
│   └── migrations/              # Supabase SQL migrations (RLS policies, triggers)
└── .env.example                 # Environment variables template
```

## Data Model (Core Entities)

### Dealers & Auth

- `Dealer` — id, supabase_uid (FK to auth.users), code, name, branch, type (dealer|sub_dealer), parent_dealer_id, permissions, financial_status, credit_limit, overdue_balance, covering_status, registration_status (pending|approved|rejected|suspended), approved_by, approved_at, rejection_reason, is_active
- `DealerRegistration` — id, supabase_uid, email, company_name, contact_person, phone, tax_id, commercial_register_number, branch_address, dealer_type_requested (dealer|sub_dealer), parent_dealer_code?, documents_uploaded (trade_license, tax_card, etc.), submitted_at, reviewed_by, reviewed_at, review_status (pending|approved|rejected), rejection_reason, notes
- `User` — id, supabase_uid (FK to auth.users), email, role (dealer|sub_dealer|admin|super_admin), dealer_id?, last_login (Note: password is managed by Supabase Auth, NOT stored here)
- `DealerPermission` — dealer_id, allowed_categories[], stock_visibility_scope, price_list_id

### Parts & Stock

- `Part` — id, part_number (unique), description, model, category, campaign_id?
- `StockAvailability` — part_id, quantity_available, quantity_atp (available-to-promise), source_location, replenishment_eta, last_synced_at
- `PriceList` — id, name, effective_from, effective_to
- `PriceListItem` — price_list_id, part_id, unit_price, discount_pct, currency

### Orders

- `Order` — id, order_number, dealer_id, order_type (daily|air_dhl|stock), status (submitted|under_review|approved|rejected|done|partial|back_ordered|invoiced|shipped|delivered), submitted_at, approved_at, approved_by, total_amount, eta_calculated, eta_actual
- `OrderLine` — id, order_id, part_id, quantity_requested, quantity_confirmed, quantity_backordered, unit_price, line_status, backorder_eta
- `OrderApproval` — id, order_id, reviewer_id, action (approve|reject|partial_approve), notes, decided_at

### Fulfillment

- `Invoice` — id, invoice_number, order_id, invoice_date, total_amount, delivery_note
- `Shipment` — id, order_id, invoice_id, carrier, tracking_number (awb/dhl), shipment_eta, actual_delivery_date
- `BackOrder` — id, order_line_id, quantity, original_eta, current_eta, status, last_updated

### Analytics & Reporting

- `Inquiry` — id, dealer_id, part_id, quantity, inquiry_type (search|order_attempt), converted_to_order_id?, created_at
- `LostSale` — id, inquiry_id, dealer_id, part_id, quantity, reason (out_of_stock|no_eta|credit_block|quota_exceeded), eta_if_available, logged_at

### Campaigns & Targets

- `Campaign` — id, name, description, start_date, end_date, discount_rules, target_dealers[], is_active
- `DealerTarget` — id, dealer_id, period, target_amount, achieved_amount, kpi_metrics

### SAP Sync

- `SyncLog` — id, sync_type (import|export), file_name, file_type (stock|pricing|orders|invoices), records_processed, records_failed, started_at, completed_at, status, error_details

## Critical Business Rules

These rules are **non-negotiable** and must be enforced across the entire codebase:

### 1. Unavailable Items Must Not Be Priced
```
IF part.stock_availability.status IN ('not_available', 'not_available_no_eta')
THEN price MUST NOT be displayed to dealer
```
This is a **mandatory pricing rule** from MANSCO. Violations are a critical bug.

### 2. Availability States
Every part search must resolve to exactly one of:
- `AVAILABLE` — in stock, show price + quantity + ETA
- `PARTIALLY_AVAILABLE` — limited stock, show available qty + price + ETA for remainder
- `NOT_AVAILABLE_WITH_ETA` — out of stock, show ETA only, **no price**
- `NOT_AVAILABLE_NO_ETA` — out of stock, no ETA, **no price**

### 3. Order Types & ETA Logic
- **Daily Order** — standard replenishment, ETA derived from SAP logistics schedule
- **Air/DHL Order** — expedited, shorter ETA, potentially different pricing
- **Stock Order** — bulk/allocation-based, ETA based on warehouse availability

Each type has its own default ETA calculation, overlaid with actual ETA from SAP CSV data.

### 4. Order Validation Chain
Before any order is confirmed, the rule engine must validate **all** of these in sequence:
1. Dealer eligibility (active account, not blocked)
2. Stock availability (quantity check against current CSV data)
3. Quota and order limits (per dealer, per period)
4. Target-based discount eligibility
5. Pricing rules (correct price list, no pricing on unavailable items)
6. Credit/financial block rules (credit limit, overdue balance, covering status)

If ALL pass and within auto-approval thresholds → auto-confirm.
If ANY exception → route to admin review queue.

### 5. Partial Fulfillment
When an order cannot be fully fulfilled:
- Available lines → confirmed immediately
- Unavailable lines → converted to backorder lines
- ETA recalculated per backorder line
- Dealer notified of split

### 6. Lost Sale Logging
Every unfulfilled inquiry or order attempt MUST be logged as a lost sale candidate with: part_id, quantity, reason, ETA if available. This feeds the lost-sales report which is critical for MANSCO demand planning.

### 7. Financial Controls
- Each dealer/sub-dealer has a credit limit and financial standing
- Orders that would exceed credit limit or violate financial blocks must route to admin
- Financial covering status is checked pre-order
- Target vs. achievement is visible on dealer dashboard

### 8. Dealer Registration Requires Admin Approval
No dealer can access portal features (dashboard, parts, orders) until an admin has explicitly approved their registration. A Supabase auth account alone is NOT sufficient — the `DealerRegistration.review_status` must be `approved` and a corresponding `Dealer` record with `registration_status = 'approved'` must exist.

## Dealer Registration & Approval Process

This is the complete lifecycle for onboarding a new dealer, from self-registration through admin approval to first login. Supabase Auth handles identity (signup, email verification, sessions), while the portal manages the business approval layer.

### Registration Flow (Step by Step)

```
1. Dealer visits /register
2. Fills registration form (company info, contact, documents)
3. Supabase Auth creates account (email + password)
4. Supabase sends verification email automatically
5. Dealer clicks verification link → email confirmed in Supabase
6. Dealer is redirected to /pending-approval screen
7. DealerRegistration record created in DB with status = 'pending'
8. Admin gets notified (in-app notification + optional email)
9. Admin reviews registration at /admin/dealers/registrations
10. Admin approves OR rejects:
    - APPROVE → Dealer record created, permissions assigned, dealer notified
    - REJECT → Rejection reason stored, dealer notified via email
11. On next login, approved dealer lands on dashboard
    On next login, rejected dealer sees rejection message + resubmit option
```

### Registration States

```
SUPABASE AUTH          PORTAL DB (DealerRegistration)     ACCESS LEVEL
─────────────          ────────────────────────────────    ────────────
Not signed up          No record                          None
Signed up, unverified  pending                            /verify-email only
Signed up, verified    pending                            /pending-approval only
Signed up, verified    approved                           Full dealer portal access
Signed up, verified    rejected                           /pending-approval + resubmit
Signed up, verified    suspended (post-approval)          Blocked, contact admin message
```

### Registration Form Fields

The `/register` page collects:

```typescript
// src/lib/validators/registration.ts
const dealerRegistrationSchema = z.object({
  // Account (goes to Supabase Auth)
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),  // Min 8, 1 uppercase, 1 number

  // Company info (goes to DealerRegistration table)
  company_name: z.string().min(2).max(200),
  contact_person: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  tax_id: z.string().min(5).max(20),
  commercial_register_number: z.string().min(3).max(30),
  branch_address: z.string().min(10).max(500),
  dealer_type_requested: z.enum(["dealer", "sub_dealer"]),
  parent_dealer_code: z.string().optional(),  // Required if sub_dealer

  // Document uploads (stored in Supabase Storage)
  trade_license: z.instanceof(File),
  tax_card: z.instanceof(File),
  commercial_register_doc: z.instanceof(File),
  additional_documents: z.array(z.instanceof(File)).optional(),
});
```

### Supabase Auth Setup

#### Client Configuration
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}
```

```typescript
// src/lib/supabase/admin.ts — SERVICE ROLE CLIENT (server-side only, never expose to browser)
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // Never expose this key
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

#### Auth Middleware (Next.js)
```typescript
// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Public routes — no auth needed
  if (path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/verify-email")) {
    return supabaseResponse;
  }

  // No Supabase session → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Has Supabase session but check portal approval status
  // This is checked via a lightweight DB query or cached in session metadata
  const approvalStatus = user.user_metadata?.registration_status;

  if (path.startsWith("/dashboard") || path.startsWith("/parts") || path.startsWith("/orders")) {
    if (approvalStatus !== "approved") {
      return NextResponse.redirect(new URL("/pending-approval", request.url));
    }
  }

  // Admin routes — check admin role
  if (path.startsWith("/admin")) {
    const role = user.user_metadata?.role;
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth/callback).*)"],
};
```

### Registration API Implementation

#### Step 1: Dealer Submits Registration
```typescript
// src/app/api/registration/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { dealerRegistrationSchema } from "@/lib/validators/registration";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const parsed = dealerRegistrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } }, { status: 400 });
  }

  const { email, password, ...businessData } = parsed.data;

  // 1. Create Supabase Auth account
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,  // Require email verification
    user_metadata: {
      role: "dealer",
      registration_status: "pending",
      company_name: businessData.company_name,
    },
  });

  if (authError) {
    if (authError.message.includes("already registered")) {
      return NextResponse.json({ error: { code: "EMAIL_EXISTS", message: "This email is already registered" } }, { status: 409 });
    }
    return NextResponse.json({ error: { code: "AUTH_ERROR", message: authError.message } }, { status: 500 });
  }

  // 2. Upload documents to Supabase Storage
  const documentUrls: Record<string, string> = {};
  for (const docField of ["trade_license", "tax_card", "commercial_register_doc"]) {
    const file = formData.get(docField) as File;
    if (file) {
      const filePath = `registrations/${authData.user.id}/${docField}_${Date.now()}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("dealer-documents")
        .upload(filePath, file);
      if (!uploadError) documentUrls[docField] = filePath;
    }
  }

  // 3. Create DealerRegistration record in portal DB
  const registration = await db.dealerRegistration.create({
    data: {
      supabase_uid: authData.user.id,
      email,
      company_name: businessData.company_name,
      contact_person: businessData.contact_person,
      phone: businessData.phone,
      tax_id: businessData.tax_id,
      commercial_register_number: businessData.commercial_register_number,
      branch_address: businessData.branch_address,
      dealer_type_requested: businessData.dealer_type_requested,
      parent_dealer_code: businessData.parent_dealer_code,
      documents_uploaded: documentUrls,
      review_status: "pending",
      submitted_at: new Date(),
    },
  });

  // 4. Send verification email (Supabase handles this automatically)
  // 5. Notify admins of new registration
  await notifyAdminsNewRegistration(registration);

  return NextResponse.json({
    data: { message: "Registration submitted. Please verify your email.", registration_id: registration.id },
  }, { status: 201 });
}
```

#### Step 2: Admin Reviews & Approves/Rejects
```typescript
// src/app/api/registration/[id]/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Verify admin session
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !["admin", "super_admin"].includes(user.user_metadata?.role)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const { action, rejection_reason, assigned_dealer_code, assigned_permissions } = await req.json();

  const registration = await db.dealerRegistration.findUnique({ where: { id: params.id } });
  if (!registration || registration.review_status !== "pending") {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  if (action === "approve") {
    // 1. Create Dealer record in portal DB
    const dealer = await db.dealer.create({
      data: {
        supabase_uid: registration.supabase_uid,
        code: assigned_dealer_code,  // Admin assigns the dealer code
        name: registration.company_name,
        branch: registration.branch_address,
        type: registration.dealer_type_requested,
        parent_dealer_id: registration.parent_dealer_code
          ? (await db.dealer.findUnique({ where: { code: registration.parent_dealer_code } }))?.id
          : null,
        registration_status: "approved",
        approved_by: user.id,
        approved_at: new Date(),
        is_active: true,
        credit_limit: 0,  // Admin sets initial credit limit
        financial_status: "active",
      },
    });

    // 2. Create User record linked to Dealer
    await db.user.create({
      data: {
        supabase_uid: registration.supabase_uid,
        email: registration.email,
        role: registration.dealer_type_requested,
        dealer_id: dealer.id,
      },
    });

    // 3. Assign default permissions (admin can customize)
    if (assigned_permissions) {
      await db.dealerPermission.create({
        data: { dealer_id: dealer.id, ...assigned_permissions },
      });
    }

    // 4. Update Supabase user metadata so middleware allows access
    await supabaseAdmin.auth.admin.updateUserById(registration.supabase_uid, {
      user_metadata: {
        role: registration.dealer_type_requested,
        registration_status: "approved",
        dealer_id: dealer.id,
        dealer_code: assigned_dealer_code,
      },
    });

    // 5. Update registration record
    await db.dealerRegistration.update({
      where: { id: params.id },
      data: { review_status: "approved", reviewed_by: user.id, reviewed_at: new Date() },
    });

    // 6. Send approval email to dealer
    await sendDealerApprovalEmail(registration.email, registration.company_name, assigned_dealer_code);

    return NextResponse.json({ data: { dealer_id: dealer.id, status: "approved" } });
  }

  if (action === "reject") {
    // 1. Update registration record with rejection
    await db.dealerRegistration.update({
      where: { id: params.id },
      data: {
        review_status: "rejected",
        rejection_reason,
        reviewed_by: user.id,
        reviewed_at: new Date(),
      },
    });

    // 2. Update Supabase user metadata
    await supabaseAdmin.auth.admin.updateUserById(registration.supabase_uid, {
      user_metadata: { registration_status: "rejected" },
    });

    // 3. Send rejection email with reason
    await sendDealerRejectionEmail(registration.email, registration.company_name, rejection_reason);

    return NextResponse.json({ data: { status: "rejected" } });
  }

  return NextResponse.json({ error: { code: "INVALID_ACTION" } }, { status: 400 });
}
```

### Admin Registration Review UI Requirements

The admin panel at `/admin/dealers/registrations` must include:

**Queue view:**
- Table of pending registrations sorted by submitted_at (oldest first)
- Columns: company_name, contact_person, email, phone, dealer_type_requested, submitted_at, days_pending
- Badge count in admin sidebar showing number of pending registrations
- Filter by status: pending | approved | rejected | all

**Detail view (on click):**
- Full registration details with all submitted fields
- Document preview/download links (trade_license, tax_card, commercial_register)
- If sub_dealer: show parent dealer info and validate parent exists
- Action buttons:
  - **Approve** — opens modal to assign dealer_code, set initial credit_limit, assign permissions (categories, price list, stock visibility)
  - **Reject** — opens modal requiring rejection_reason (mandatory text field)
- History log of all review actions if re-submitted

### Post-Approval: What Changes

When admin clicks Approve:
1. `Dealer` record is created with `registration_status = 'approved'`
2. `User` record links the Supabase UID to the new Dealer
3. `DealerPermission` record is created with admin-assigned defaults
4. Supabase `user_metadata` is updated with `registration_status: 'approved'`, `dealer_id`, `dealer_code`
5. Approval email sent to dealer with their assigned dealer code
6. On next login, middleware detects `approved` status and allows access to `/dashboard`

### Post-Rejection: Resubmission Flow

When admin clicks Reject:
1. `DealerRegistration.review_status` set to `rejected` with `rejection_reason`
2. Supabase `user_metadata` updated with `registration_status: 'rejected'`
3. Rejection email sent with the reason
4. Dealer can log in and see `/pending-approval` page showing:
   - Rejection reason
   - **Resubmit** button that lets them update their registration info and re-upload documents
5. Resubmission creates a new `DealerRegistration` record (preserving history) with `review_status: 'pending'`
6. Admin is re-notified of the resubmission

### Supabase Storage Buckets

```
dealer-documents/           # Private bucket — registration documents
  registrations/
    {supabase_uid}/
      trade_license_{timestamp}
      tax_card_{timestamp}
      commercial_register_{timestamp}
      additional_{n}_{timestamp}

mansco-csv/                 # Private bucket — SAP CSV files
  imports/
  exports/
  archive/

mansco-invoices/            # Private bucket — generated invoice PDFs
  {year}/{month}/
    {invoice_number}.pdf
```

RLS policies on `dealer-documents`:
- Dealers can only read their own documents (`auth.uid() = folder owner`)
- Admins can read all documents
- Only the registration API (service role) can write

## SAP CSV Sync Protocol

### Import (SAP → Portal)
- **Stock availability CSV** — part quantities, ATP, source locations, replenishment ETAs
- **Pricing CSV** — price lists, discount conditions, effective dates
- **Invoice CSV** — invoice numbers, dates, amounts linked to order references
- Sync frequency: configurable (default every 30 minutes during business hours)
- Each import creates a `SyncLog` entry with record counts and any errors

### Export (Portal → SAP)
- **Orders CSV** — new orders, with dealer code, part numbers, quantities, order type
- Triggered on order submission or on schedule
- Each export creates a `SyncLog` entry

### CSV File Handling
- Incoming CSVs are staged in Supabase Storage (`mansco-csv/imports/`) before processing
- Processed CSVs are archived to `mansco-csv/archive/` with timestamp
- Failed records are logged individually with error details
- Stale data indicator: if last sync > configured threshold, UI shows warning badge

## API Design Conventions

- All API routes under `/api/` using Next.js Route Handlers
- Request/response validation with Zod schemas
- Consistent error response format:
  ```json
  { "error": { "code": "INSUFFICIENT_STOCK", "message": "...", "details": {} } }
  ```
- Pagination: `?page=1&limit=20` with response metadata `{ data: [], meta: { total, page, limit, pages } }`
- Auth: Supabase session validated via `supabase.auth.getUser()` in server components and API routes; middleware guards route access based on `user_metadata.registration_status` and `user_metadata.role`
- All mutations return the updated resource
- Soft-delete pattern for dealers and orders (never hard delete)

## Role-Based Access Control

### Dealer Role
- View own dashboard (financial, targets, campaigns)
- Search parts within assigned permissions/categories
- Place orders (Daily, Air/DHL, Stock)
- View own orders, invoices, shipments, backorders
- Cannot see other dealers' data

### Sub-Dealer Role
- Same as Dealer but scoped to parent dealer's permissions
- Financial data shows sub-dealer specific covering

### Admin Role
- View all dealers and their activity
- Review and approve/reject/partially-approve orders in the queue
- Manage dealer accounts, permissions, stock visibility rights
- Access all reports (inquiry, lost-sales, operational dashboard)
- Configure campaigns, targets, and business rules

### Super Admin Role
- All Admin capabilities
- Manage admin accounts
- Configure system settings (sync schedule, approval thresholds, etc.)

## UI/UX Patterns

### Component Architecture
- Use shadcn/ui as the base component library
- Extend with custom components in `components/shared/`
- Data tables: use `@tanstack/react-table` for all tabular data with sorting, filtering, pagination
- Charts: use Recharts for dashboard visualizations
- Forms: React Hook Form + Zod resolver for all forms
- Toast notifications: sonner for success/error feedback
- Loading states: skeleton loaders for all async data

### Status Badge Colors
Standardize across the app:
- `submitted` → blue
- `under_review` → yellow
- `approved` → green
- `rejected` → red
- `done` → green (darker)
- `partial` → orange
- `back_ordered` → purple
- `invoiced` → teal
- `shipped` → indigo
- `delivered` → green (with checkmark)

### Responsive Design
- Desktop-first (dealers primarily use desktop)
- Minimum supported width: 1024px
- Admin panel: sidebar navigation with collapsible menu
- Dealer portal: top navigation with dropdown menus

## Testing Strategy

### Unit Tests (Vitest)
- **Rule engine**: 100% coverage mandatory. Every rule in `lib/rules/` must have tests for pass, fail, and edge cases
- **CSV sync**: Test parsing, validation, error handling, and audit logging
- **Validators**: All Zod schemas tested with valid and invalid inputs

### Integration Tests
- API routes: test auth, RBAC, request validation, database operations
- SAP sync: end-to-end CSV import/export with test files

### E2E Tests (Playwright)
- Dealer happy path: login → search → order → track
- Admin approval flow: login → review queue → approve/reject → dealer notification
- Out-of-stock flow: search → no price shown → inquiry logged

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Public anon key (safe for browser)
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # Secret service role key (server-side ONLY, never expose)

# Database (Supabase PostgreSQL — connection pooler recommended)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# SAP Sync
SAP_SYNC_CRON=*/30 * * * *         # Every 30 minutes
SAP_SYNC_STALE_THRESHOLD_MINUTES=60 # Warn if data older than this
SAP_CSV_IMPORT_DIR=imports/
SAP_CSV_EXPORT_DIR=exports/
SAP_CSV_ARCHIVE_DIR=archive/

# App
NEXT_PUBLIC_APP_NAME=MANSCO Spare Parts Portal
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Development Workflow

### Getting Started
```bash
# 1. Clone and install
git clone <repo-url>
cd mansco-portal
npm install

# 2. Set up Supabase
# Option A: Supabase Cloud (recommended)
# - Create project at https://supabase.com/dashboard
# - Copy URL + anon key + service role key to .env.local

# Option B: Supabase Local (for offline dev)
npx supabase init
npx supabase start   # Starts local Supabase (Docker required)

# 3. Configure environment
cp .env.example .env.local
# Fill in Supabase credentials

# 4. Setup database
npx prisma migrate dev
npx prisma db seed

# 5. Create Supabase Storage buckets (run once)
npx tsx scripts/setup-storage-buckets.ts

# 6. Create initial admin user (run once)
npx tsx scripts/create-admin-user.ts

# 7. Run dev server
npm run dev
```

### Branch Strategy
- `main` — production-ready, deploys to production
- `staging` — integration testing, deploys to staging
- `develop` — active development, feature branches merge here
- `feature/<phase>-<name>` — e.g., `feature/p1-part-search`, `feature/p2-rule-engine`

### Commit Convention
```
<type>(<scope>): <description>

Types: feat, fix, refactor, test, docs, chore
Scopes: auth, registration, dealer, admin, parts, orders, sync, rules, reports, ui
```

## Phase Implementation Order

### Phase 0 — Foundation (Current)
1. Initialize Next.js project with TypeScript + Tailwind + shadcn/ui
2. Set up Supabase project (auth, database, storage buckets)
3. Set up Prisma schema with all entities defined above (including DealerRegistration)
4. Configure Supabase Auth (email/password provider, email templates, redirect URLs)
5. Implement Supabase auth middleware for Next.js (session refresh, route guards)
6. Build dealer registration flow: `/register` form → Supabase signup → email verification → `/pending-approval`
7. Build admin registration review panel: `/admin/dealers/registrations` queue → approve/reject with dealer code assignment
8. Create Supabase Storage buckets (dealer-documents, mansco-csv, mansco-invoices) with RLS policies
9. Create seed script with sample admin user, dealers, parts, stock data
10. Set up Vitest + Playwright configs

### Phase 1 — Dealer Core
1. Dealer dashboard page (mock data first, then wire to DB)
2. Part search with filters + availability display
3. Out-of-stock exception flow (no price, ETA, lost-sale logging)
4. Order creation form by type (Daily / Air-DHL / Stock)
5. Order submission + basic status tracking

### Phase 2 — Backend Engine & Admin
1. Rule engine (`lib/rules/`) with full test suite
2. Auto-approval vs. manual routing logic
3. Admin approval panel (queue, review, approve/reject)
4. Fulfillment outcome handling (full/partial/backorder/reject)
5. SAP CSV sync engine (`lib/sync/`)

### Phase 3 — Fulfillment & Tracking
1. Invoice model + linkage to confirmed order lines
2. Shipment tracking (carrier, AWB, DHL, ETA tracking)
3. Backorder lifecycle management + ETA recalculation
4. Dealer order history + status filtering

### Phase 4 — Reporting & Analytics
1. Inquiry report (all inquiries, converted or not)
2. Lost-sales report (item, qty, reason, ETA)
3. Operational dashboard (orders by status, finance, targets, campaigns)
4. Export functionality (CSV/Excel/PDF)

### Phase 5 — Hardening & Launch
1. Security audit + penetration testing remediation
2. Performance optimization + load testing
3. UAT support + bug fixes
4. Production deployment + monitoring setup

## Common Patterns

### Creating a New API Route
```typescript
// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createOrderSchema } from "@/lib/validators/order";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "dealer" || user.user_metadata?.registration_status !== "approved") {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } }, { status: 400 });
  }

  // Run rule engine validation
  const ruleResult = await validateOrder(parsed.data, user.user_metadata.dealer_id);
  if (!ruleResult.passed) {
    // Route to admin if exception, or reject if hard block
  }

  const order = await db.order.create({ data: { ... } });
  return NextResponse.json({ data: order }, { status: 201 });
}
```

### Using the Rule Engine
```typescript
// src/lib/rules/engine.ts
import { checkEligibility } from "./eligibility";
import { checkStock } from "./stock";
import { checkQuota } from "./quota";
import { checkPricing } from "./pricing";
import { checkFinancial } from "./financial";

export async function validateOrder(order: OrderInput, dealerId: string): Promise<RuleResult> {
  const checks = [
    await checkEligibility(dealerId),
    await checkStock(order.lines),
    await checkQuota(dealerId, order),
    await checkPricing(order.lines, dealerId),
    await checkFinancial(dealerId, order.totalAmount),
  ];

  const failures = checks.filter(c => !c.passed);
  const needsManualReview = failures.some(f => f.severity === "review");
  const hardBlocked = failures.some(f => f.severity === "block");

  return {
    passed: failures.length === 0,
    needsManualReview: !hardBlocked && needsManualReview,
    hardBlocked,
    failures,
  };
}
```

### CSV Sync Import Pattern
```typescript
// src/lib/sync/importer.ts
import Papa from "papaparse";
import { db } from "@/lib/db";

export async function importStockCSV(filePath: string): Promise<SyncResult> {
  const syncLog = await db.syncLog.create({
    data: { sync_type: "import", file_type: "stock", file_name: filePath, status: "running", started_at: new Date() },
  });

  try {
    const csvContent = await readFromSupabaseStorage(filePath);
    const { data, errors } = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

    let processed = 0, failed = 0;
    for (const row of data) {
      try {
        await db.stockAvailability.upsert({
          where: { part_number: row.part_number },
          update: { quantity_available: parseInt(row.qty), /* ... */ last_synced_at: new Date() },
          create: { /* ... */ },
        });
        processed++;
      } catch (err) {
        failed++;
        // Log individual row error
      }
    }

    await db.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "completed", records_processed: processed, records_failed: failed, completed_at: new Date() },
    });

    return { processed, failed };
  } catch (err) {
    await db.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "failed", error_details: err.message, completed_at: new Date() },
    });
    throw err;
  }
}
```

## Do's and Don'ts

### Do
- Always validate with Zod before touching the database
- Always check Supabase auth session + `user_metadata.role` + `registration_status` before processing any API request
- Always check `registration_status === 'approved'` before allowing any dealer portal access — a valid Supabase session alone is NOT sufficient
- Always log inquiries and lost sales — this is a core business requirement
- Always enforce the no-price-on-unavailable rule at both API and UI layers
- Always create SyncLog entries for every CSV import/export operation
- Use `createServerSupabaseClient()` in server components and API routes, `createClient()` in client components
- Use `supabaseAdmin` (service role) only for admin operations: creating users, updating user_metadata, managing storage
- Use Prisma transactions for multi-step operations (order + order_lines + inquiry)
- Return consistent error response shapes from all API routes
- Use TypeScript strict mode — no `any` types

### Don't
- Don't show prices for unavailable parts — ever
- Don't allow dealer portal access without `registration_status === 'approved'` — pending/rejected dealers see only `/pending-approval`
- Don't expose `SUPABASE_SERVICE_ROLE_KEY` to the browser — it's server-side only, never import `supabase/admin.ts` in client components
- Don't store passwords in the portal database — Supabase Auth manages all credentials
- Don't hard-delete records — use soft delete (is_active flag or deleted_at timestamp)
- Don't skip the rule engine for any order path, including admin-created orders
- Don't assume SAP data is fresh — always check last_synced_at and warn if stale
- Don't store raw CSV files permanently in the database — archive to Supabase Storage
- Don't expose internal error details to the client in production
- Don't bypass RBAC checks, even in API routes called by internal services
- Don't let dealers upload files outside of the registration flow without validation — always scope storage paths to their `supabase_uid`
