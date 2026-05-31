# MANSCO Spare Parts Portal
## Milestone Delivery Plan & Project Schedule
### Version 1.0 — Prepared for Customer Sign-Off

---

**Document Reference:** MANSCO-SPP-MDP-001  
**Prepared by:** SmartForce Technology Solutions  
**Prepared for:** MANSCO Egypt — Peugeot Spare Parts Division  
**Document Date:** May 20, 2026  
**Document Status:** Awaiting Customer Approval

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Tech Stack Summary](#2-architecture--tech-stack-summary)
3. [System Modules](#3-system-modules)
4. [Current Delivery Status](#4-current-delivery-status)
5. [Milestone Delivery Plan](#5-milestone-delivery-plan)
6. [Detailed Phase Breakdown](#6-detailed-phase-breakdown)
7. [Assumptions & Scope Limits](#7-assumptions--scope-limits)
8. [Risk Register](#8-risk-register)
9. [Customer Sign-Off](#9-customer-sign-off)

---

## 1. Project Overview

### Executive Summary

The **MANSCO Spare Parts Portal** is an enterprise-grade, web-based self-service platform developed for MANSCO Egypt — the authorized distributor of Peugeot spare parts in the Egyptian market. The system replaces a fully manual, representative-mediated spare parts ordering process with a governed, digital self-service platform accessible to an authorized network of dealers and sub-dealers.

The portal covers the full spare parts lifecycle: dealer onboarding and approval, part search with availability-aware pricing, multi-type order placement (Daily, Air/DHL, Stock), order tracking, invoice management, back-order handling, financial account management, campaign/promotion management, and operational reporting.

The system integrates offline with **SAP** (MANSCO's ERP system) via a structured, batch-based CSV data exchange protocol, meaning SAP remains the single source of truth for inventory, pricing, and business rules, while the portal acts as the dealer-facing interaction layer.

### Business Objectives Addressed

| Objective | System Response |
|---|---|
| Eliminate manual phone/email order processing | Self-service order placement with real-time availability checks |
| Enforce financial controls before order submission | Credit limit, overdue balance, and financial status checks at order-time |
| Enforce pricing rules (no price for unavailable items) | Availability-aware pricing engine: prices hidden for out-of-stock items |
| Streamline dealer onboarding | Digital registration → email verification → admin approval workflow |
| Enable marketing campaigns with automated discounts | Campaign Manager module with eligibility rules and automatic discount application |
| Provide management visibility into dealer activity | Admin operational dashboard, inquiry reports, lost-sales reports |
| Support bilingual Arabic/English interface | Full RTL/LTR i18n framework with EN/AR translation coverage |

---

## 2. Architecture & Tech Stack Summary

### Technology Identification (from Codebase Analysis)

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | Next.js (App Router) | 16.2.6 | Full-stack React SSR/SSG framework |
| **UI Runtime** | React | 19.2.4 | Component rendering engine |
| **Language** | TypeScript | ^5 | Type-safe development across all layers |
| **Styling** | Tailwind CSS | ^4 | Utility-first CSS with dark-theme design system |
| **Component Library** | shadcn/ui + Base UI | ^4.7.0 / ^1.4.1 | Accessible, composable UI primitives |
| **Data Visualization** | Recharts | ^3.8.1 | Dashboard KPI charts and analytics |
| **Database** | Supabase PostgreSQL | Cloud-hosted | Primary relational database |
| **Authentication** | Supabase Auth | ^2.106.0 | Email/password auth, session management, JWTs |
| **Storage** | Supabase Storage | — | Dealer document uploads (Tax Card, Trade License, CR) |
| **API Layer** | Next.js Route Handlers | — | RESTful API endpoints (server-side) |
| **Auth Middleware** | Next.js Middleware | — | Route-level RBAC enforcement |
| **Input Validation** | Zod | ^4.4.3 | Schema validation on all API inputs |
| **Internationalization** | next-intl + custom i18n | ^4.12.0 | EN/AR bilingual support with RTL layout |
| **Command UI** | cmdk | ^1.1.1 | Command palette / search interface |

### Infrastructure Architecture

```
                    ┌─────────────────────────────────────────┐
                    │           Dealer / Admin Browser          │
                    └──────────────────┬──────────────────────┘
                                       │ HTTPS
                    ┌──────────────────▼──────────────────────┐
                    │         Next.js Application Server        │
                    │  ┌──────────────────────────────────┐   │
                    │  │  App Router (SSR / RSC / Client)  │   │
                    │  │  ┌────────────┐ ┌─────────────┐  │   │
                    │  │  │ Middleware │ │ API Routes  │  │   │
                    │  │  │  (RBAC)   │ │ (REST Layer)│  │   │
                    │  │  └────────────┘ └─────────────┘  │   │
                    │  └──────────────────────────────────┘   │
                    └──────────────────┬──────────────────────┘
                                       │
               ┌───────────────────────┼───────────────────────┐
               │                       │                       │
  ┌────────────▼──────┐   ┌────────────▼──────┐   ┌───────────▼────────┐
  │  Supabase Auth    │   │  Supabase Database │   │  Supabase Storage  │
  │  (JWT Sessions)   │   │  (PostgreSQL + RLS)│   │  (dealer-documents)│
  └───────────────────┘   └────────────────────┘   └────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────┐
                    │         SAP ERP (Offline Integration)     │
                    │   CSV Import/Export via Batch Scheduler   │
                    └─────────────────────────────────────────┘
```

### Database Schema Summary (Identified Tables)

| Table | Status | Purpose |
|---|---|---|
| `dealer_registrations` | ✅ Deployed | Dealer onboarding applications and document tracking |
| `dealers` | ✅ Deployed | Approved dealer master records with financial data |
| `campaigns` | ✅ Deployed | Campaign definitions (type, dates, audience, status) |
| `campaign_items` | ✅ Deployed | Parts assigned to campaigns with discount configuration |
| `campaign_orders` | ✅ Deployed | Campaign participation tracking per order |
| `campaign_audit_log` | ✅ Deployed | Full audit trail of campaign lifecycle changes |
| `orders` | 🔲 Pending | Order headers (type, status, dealer, totals) |
| `order_lines` | 🔲 Pending | Individual part lines per order |
| `order_approvals` | 🔲 Pending | Admin review actions on orders |
| `invoices` | 🔲 Pending | Invoice records linked to fulfilled orders |
| `shipments` | 🔲 Pending | Carrier/tracking data per shipment |
| `back_orders` | 🔲 Pending | Back-order lines with ETA tracking |
| `inquiries` | 🔲 Pending | Part search and order attempt logging |
| `lost_sales` | 🔲 Pending | Lost sale candidates for demand planning |
| `stock_availability` | 🔲 Pending | SAP-synced stock data per part/location |
| `price_lists` | 🔲 Pending | SAP-synced price list headers |
| `price_list_items` | 🔲 Pending | Part-level pricing with discounts |
| `sync_logs` | 🔲 Pending | SAP CSV import/export audit log |
| `dealer_targets` | 🔲 Pending | KPI targets vs. achievement per dealer |

---

## 3. System Modules

Based on the full codebase analysis, the system is composed of **9 major modules** spanning the frontend, backend API layer, database, and integration tiers:

### Module 1 — Authentication & Dealer Onboarding
**Status: ✅ Delivered**
- Supabase-backed email/password authentication
- Dealer self-registration form with Zod validation (company info, Tax ID, Commercial Register, address, dealer type)
- Document upload to Supabase Storage (Tax Card, Trade License, CR Document)
- Email verification flow with post-verification redirect
- Pending approval holding screen
- Admin-only: registration review queue, document preview, approve/reject with admin notes
- Auth middleware (route-level access control by role and registration_status)
- Demo admin bypass for development/testing

### Module 2 — Dealer Management (Admin)
**Status: ✅ Delivered**
- Full dealer listing with real-time Supabase data
- Search and filter by company, code, email, address
- Dealer preview side panel (all profile and financial details)
- Dealer edit modal (code, financials, status, type, contact details)
- `PUT /api/dealers/[id]` API with field whitelisting
- Financial status management (Active / Warning / Blocked)
- Credit limit and overdue balance management

### Module 3 — Campaign Manager (Admin)
**Status: ✅ Delivered**
- Campaign lifecycle: Draft → Active → Paused → Completed → Archived
- Campaign creation wizard (name, type, dates, audience targeting, eligibility rules)
- Campaign item management (parts, discount type %, EGP, min order quantity)
- Eligibility rules engine (min credit limit, min target %, financial status filter, order type restriction)
- Campaign performance analytics (orders, dealers, quantities, discounts)
- Dealer participation table per campaign
- Full audit trail per campaign
- Duplicate campaign (clone as new draft)
- 6 REST API endpoints covering all CRUD + status transitions + performance

### Module 4 — Parts Catalog & Search
**Status: 🟡 UI Delivered / Backend Integration Pending**
- Part search with category and model filters
- Availability-aware display (4 states: Available, Partially Available, Out with ETA, Out no ETA)
- **Critical business rule enforced**: prices are hidden for out-of-stock items
- Multi-language part names and categories (EN/AR)
- Supports Peugeot model range: 301, 208, 508, 2008, 3008, 5008, Partner, Expert, Boxer
- 10 spare part categories (Brakes, Engine, Electrical, Body, Filters, Cooling, Transmission, Steering, Exhaust, Accessories)
- Currently using mock data; requires SAP CSV sync integration to go live

### Module 5 — Order Management
**Status: 🟡 UI Delivered / Backend Persistence Pending**
- New order flow: part search → cart → type selection → submission
- Three order types: Daily, Air/DHL, Stock (each with distinct ETA logic)
- Cart management: add/remove/quantity adjustment
- Financial block check before order submission (credit limit, overdue balance)
- Order history list with status filtering
- Order detail view with line-level status and tracking
- Admin order review queue (approve, partial approve, reject)
- Status lifecycle: Submitted → Under Review → Approved/Rejected → Done/Partial/Backordered → Invoiced → Shipped → Delivered

### Module 6 — Fulfillment Tracking (Invoices, Shipments, Back-Orders)
**Status: 🔲 Pending**
- Invoice listing and detail view (linked to fulfilled orders)
- Shipment tracking with carrier/AWB/DHL reference
- Back-order management with ETA tracking and recalculation
- Partial fulfillment workflow (confirmed lines vs. back-order lines)

### Module 7 — Financial Dashboard & KPIs (Dealer-Facing)
**Status: 🟡 UI Delivered / Backend Integration Pending**
- KPI cards: Credit Limit Utilization, Overdue Balance, Target Achievement
- Target vs. achievement progress visualization
- Recent orders widget
- Campaign banners and discounted items
- Financial summary with credit/overdue status indicators
- Currently using mock data; requires live Supabase data binding

### Module 8 — Admin Operational Dashboard & Reporting
**Status: 🟡 UI Delivered / Backend Integration Pending**
- Admin overview: pending approvals, today's orders, revenue, active campaigns
- Inquiry report (all part search activity by dealer)
- Lost-sales report (unfulfilled inquiries logged for demand planning)
- Currently using mock data; requires database and sync integration

### Module 9 — SAP CSV Integration Engine
**Status: 🔲 Not Started**
- Scheduled CSV import: stock availability, pricing, invoices from SAP
- Scheduled CSV export: new orders to SAP
- Papaparse-based CSV parser with schema validation
- SyncLog table tracking per-run record counts and errors
- Stale-data detection and UI warning badges
- Archive/staging workflow for processed files in Supabase Storage

---

## 4. Current Delivery Status

| Module | Phase | Status | % Complete |
|---|---|---|---|
| Auth & Dealer Onboarding | Phase 1 | ✅ Complete | 100% |
| Dealer Management (Admin) | Phase 1 | ✅ Complete | 100% |
| Campaign Manager | Phase 2 | ✅ Complete | 100% |
| Core UI Component Library | Phase 1 | ✅ Complete | 100% |
| Bilingual EN/AR Framework | Phase 1 | ✅ Complete | 100% |
| Parts Catalog & Search (UI) | Phase 2 | 🟡 In Progress | 70% |
| Order Management (UI) | Phase 2 | 🟡 In Progress | 65% |
| Financial Dashboard (UI) | Phase 2 | 🟡 In Progress | 60% |
| Admin Dashboard & Reports (UI) | Phase 2 | 🟡 In Progress | 55% |
| Database — Full Schema | Phase 2–3 | 🔲 Partial | 30% |
| Order Backend APIs | Phase 3 | 🔲 Pending | 0% |
| Fulfillment (Invoices/Shipments) | Phase 3 | 🔲 Pending | 0% |
| SAP CSV Sync Engine | Phase 3 | 🔲 Pending | 0% |
| Rule Engine (Order Validation) | Phase 3 | 🔲 Pending | 0% |
| UAT & Production Deployment | Phase 4 | 🔲 Pending | 0% |

**Overall Project Completion: ~38%**

---

## 5. Milestone Delivery Plan

> **Note on Duration Estimates:** All estimates assume a single experienced full-stack development team (2 developers + 1 QA). Durations are based on the complexity observed in the existing codebase. Estimates include development, integration testing, and code review, but exclude client UAT time (tracked separately).

| # | Milestone Phase | Key Deliverables | Duration | Start | Dependencies |
|---|---|---|---|---|---|
| **M1** | Foundation & Core Architecture *(Delivered)* | Auth system, dealer registration, middleware RBAC, UI component library, bilingual framework, Supabase infrastructure | **4 weeks** | ✅ Complete | Supabase project provisioning, domain setup |
| **M2** | Dealer & Campaign Management *(Delivered)* | Dealer management with edit/preview, campaign full lifecycle (CRUD, status, performance, audit), campaign DB schema deployed | **3 weeks** | ✅ Complete | M1 complete, Supabase migrations |
| **M3** | Parts Catalog & Live Data Binding | Connect parts search to live Supabase/SAP data, stock availability API, pricing API, availability state engine, remove all mock data dependencies | **2 weeks** | Week 1 | M1 complete, SAP stock CSV format confirmed |
| **M4** | Order Management Backend | Full order DB schema, order CRUD APIs, cart-to-order submission flow, order validation rule engine (eligibility, credit, stock, quota), admin approval queue APIs, partial fulfillment logic | **4 weeks** | Week 3 | M3 complete, DB schema finalized |
| **M5** | Fulfillment & Financial Tracking | Invoice model + API, shipment tracking (carrier/AWB), back-order lifecycle management, ETA recalculation, dealer financial dashboard wired to live data | **3 weeks** | Week 7 | M4 complete |
| **M6** | SAP CSV Integration Engine | CSV import engine (stock, pricing, invoices), CSV export engine (orders), cron scheduler, SyncLog tracking, stale-data warnings, Supabase Storage staging/archive workflow | **3 weeks** | Week 10 | M4 complete, SAP CSV schemas confirmed by MANSCO team |
| **M7** | Reporting, Analytics & Admin Dashboard | Inquiry logging, lost-sales logging, admin dashboard wired to live data, inquiry report, lost-sales report, export to CSV/Excel | **2 weeks** | Week 13 | M5, M6 complete |
| **M8** | Hardening, Security & Performance | Security audit (RBAC edge cases, RLS policy review, input sanitization), performance optimization (query tuning, pagination), load testing, error monitoring setup | **2 weeks** | Week 15 | M7 complete |
| **M9** | UAT & Customer Acceptance | User acceptance testing with MANSCO team, bug triage and resolution, dealer pilot onboarding (live test accounts), sign-off on all business rules | **2 weeks** | Week 17 | M8 complete, UAT test plan agreed |
| **M10** | Production Deployment & Go-Live | Production environment setup (Vercel/Docker), environment variables, CI/CD pipeline, DNS/domain cutover, monitoring & alerting, go-live support | **1 week** | Week 19 | M9 sign-off, production infrastructure ready |

### Schedule Summary

```
Week:    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17   18   19   20
         ├────────────────────────────────────────────────────────────────────────────────────────────────┤
M1–M2:  [████████████████] DELIVERED
M3:                         [████████]
M4:                                   [████████████████]
M5:                                                     [████████████]
M6:                                                     [████████████]
M7:                                                                   [████████]
M8:                                                                             [████████]
M9:                                                                                       [████████]
M10:                                                                                               [████]
```

**Total Remaining Duration: ~19 weeks from project resumption date**  
**Total Project Duration (including delivered phases): ~24 weeks**

---

## 6. Detailed Phase Breakdown

### M3 — Parts Catalog & Live Data Binding (2 weeks)

| Task | Effort | Owner |
|---|---|---|
| Deploy stock_availability, price_lists, price_list_items DB tables | 0.5d | Backend |
| Build `GET /api/parts/search` with pagination and filters | 1d | Backend |
| Build `GET /api/parts/[partNumber]/availability` | 0.5d | Backend |
| Implement 4-state availability logic (available/partial/eta/none) | 1d | Backend |
| Enforce no-price rule for out-of-stock states | 0.5d | Backend |
| Wire Parts Catalog UI to live API (remove mock data) | 1d | Frontend |
| Wire Dashboard KPI cards to Supabase (remove mock data) | 1d | Frontend |
| Integration tests for pricing rules | 1d | QA |

### M4 — Order Management Backend (4 weeks)

| Task | Effort | Owner |
|---|---|---|
| Deploy orders, order_lines, order_approvals DB schema | 1d | Backend |
| Build order validation rule engine (5-step chain) | 4d | Backend |
| Build `POST /api/orders` (create order) | 2d | Backend |
| Build `GET /api/orders` and `GET /api/orders/[id]` | 1d | Backend |
| Build `POST /api/orders/[id]/review` (admin approve/reject) | 1d | Backend |
| Wire cart-to-order submission flow in frontend | 2d | Frontend |
| Wire order history and order detail pages to live API | 2d | Frontend |
| Wire admin approval queue to live API | 1d | Frontend |
| Unit tests: rule engine (eligibility, credit, quota, pricing, financial) | 3d | QA |
| Integration tests: full order lifecycle | 2d | QA |

### M5 — Fulfillment & Financial Tracking (3 weeks)

| Task | Effort | Owner |
|---|---|---|
| Deploy invoices, shipments, back_orders DB schema | 1d | Backend |
| Build invoice APIs (list, detail) | 1d | Backend |
| Build shipment tracking API | 1d | Backend |
| Build back-order lifecycle API (create, update ETA, resolve) | 2d | Backend |
| Partial fulfillment split logic | 2d | Backend |
| Wire Invoices page to live API | 1d | Frontend |
| Wire Back-Orders page to live API | 1d | Frontend |
| Dealer financial dashboard — live data binding | 1.5d | Frontend |
| Integration tests | 2d | QA |

### M6 — SAP CSV Integration Engine (3 weeks)

| Task | Effort | Owner |
|---|---|---|
| Define and validate CSV schemas with MANSCO/SAP team | 2d | Analyst |
| Build CSV import engine (stock availability) | 2d | Backend |
| Build CSV import engine (pricing data) | 1.5d | Backend |
| Build CSV import engine (invoices from SAP) | 1d | Backend |
| Build CSV export engine (orders to SAP) | 1.5d | Backend |
| Build cron scheduler (node-cron, configurable interval) | 1d | Backend |
| SyncLog tracking and error reporting | 1d | Backend |
| Supabase Storage staging/archive workflow | 1d | Backend |
| Stale-data UI warnings (configurable threshold) | 0.5d | Frontend |
| End-to-end sync testing with sample SAP files | 3d | QA |

---

## 7. Assumptions & Scope Limits

### 7.1 Technical Assumptions

| # | Assumption |
|---|---|
| A1 | The Supabase project (Cloud plan) remains provisioned and accessible for the duration of development and production. Any capacity upgrades required for production load are the customer's responsibility. |
| A2 | SAP CSV file formats (column definitions, delimiters, encoding, file naming conventions) will be provided and signed off by the MANSCO/SAP team before M6 begins. Any SAP-side changes to CSV schemas after development begins constitute a change request. |
| A3 | MANSCO will provide test SAP CSV files (realistic sample data) for development and testing of the sync engine no later than 2 weeks before M6 start. |
| A4 | The SAP integration is batch-based (file-based, not real-time API). Real-time SAP API integration is explicitly out of scope for this delivery. |
| A5 | Email delivery (Supabase Auth verification emails, dealer notification emails) relies on Supabase's built-in SMTP or a configured SMTP relay. Production SMTP configuration is the customer's responsibility. |
| A6 | Production hosting infrastructure (Vercel, AWS, or equivalent) and domain/SSL configuration will be provisioned by the customer. The development team will deploy the application artifacts. |
| A7 | The UI component library (shadcn/ui + Base UI) and all open-source dependencies are used under their respective licenses. No proprietary UI components are included in scope. |
| A8 | Arabic translation content for all UI strings has been included in the bilingual framework. Any additional business-specific Arabic terminology changes after delivery constitute a change request. |

### 7.2 Scope Exclusions (Explicitly Out of Scope)

| # | Exclusion |
|---|---|
| E1 | **Real-time SAP integration** — All SAP data exchange is batch CSV-based. Webhook, API, or event-driven SAP integration is not in scope. |
| E2 | **Mobile native applications** — The portal is a responsive web application. Native iOS/Android apps are not in scope. |
| E3 | **Payment processing** — No payment gateway integration (online payments, bank transfers) is included. Financial account management is informational only. |
| E4 | **ERP master data management** — Creation or modification of dealers, parts, or price lists in SAP is not in scope. The portal consumes SAP data; it does not write back. |
| E5 | **Third-party logistics integrations** — Direct API integrations with DHL, FedEx, or any carrier tracking API are not in scope. Tracking information is entered manually or imported via CSV. |
| E6 | **Custom BI / data warehouse** — Advanced analytics beyond the defined inquiry and lost-sales reports are not in scope. |
| E7 | **Load balancing and auto-scaling infrastructure** — Infrastructure architecture beyond standard Vercel/Next.js deployment is not in scope. |
| E8 | **User training and change management** — User training materials and dealer onboarding training sessions are not included in the technical delivery. |

### 7.3 Change Request Policy

Any work outside the scope defined in this document will be handled via a formal **Change Request (CR)** process. A CR will include:
- Description of the change and business justification
- Estimated additional effort and cost
- Impact on the delivery schedule
- Mutual sign-off before implementation begins

---

## 8. Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R1 | SAP CSV schemas not available before M6 start, causing delay | Medium | High | Confirm CSV formats as a milestone gate. Start M6 only after sample files received. |
| R2 | MANSCO dealer network volume exceeds Supabase free tier limits during UAT | Low | Medium | Monitor row counts and storage. Plan Supabase Pro upgrade before UAT. |
| R3 | Order rule engine edge cases discovered during UAT | Medium | Medium | Comprehensive unit tests in M4. Allocate buffer days in UAT phase for rule fixes. |
| R4 | Arabic RTL layout issues with complex table/form layouts | Low | Low | RTL testing included in each phase. Bilingual framework already implemented. |
| R5 | Supabase service outage affecting development or production | Low | High | Development continues with local Supabase CLI fallback. Production SLA monitored via Supabase status page. |
| R6 | Customer feedback during UAT requires significant rework | Medium | High | Demo/review checkpoints at end of each milestone to surface issues early. |

---

## 9. Customer Sign-Off

### Document Review & Acceptance

By signing below, the authorized representatives of MANSCO Egypt and SmartForce Technology Solutions confirm that:

1. The scope of work described in this Milestone Delivery Plan is agreed upon and understood by both parties.
2. The milestone schedule and duration estimates are accepted as the project baseline.
3. Any work outside the defined scope will be processed through the formal Change Request procedure.
4. Both parties commit to the responsibilities and assumptions outlined in Section 7.

---

### MANSCO Egypt — Customer Authorization

| Field | Details |
|---|---|
| **Company Name** | MANSCO Egypt |
| **Authorized Representative** | ________________________________ |
| **Title / Position** | ________________________________ |
| **Signature** | ________________________________ |
| **Date** | ________________________________ |

---

### SmartForce Technology Solutions — Vendor Authorization

| Field | Details |
|---|---|
| **Company Name** | SmartForce Technology Solutions |
| **Authorized Representative** | ________________________________ |
| **Title / Position** | ________________________________ |
| **Signature** | ________________________________ |
| **Date** | ________________________________ |

---

### Document Control

| Version | Date | Author | Change Summary |
|---|---|---|---|
| 1.0 | 2026-05-20 | SmartForce Technical PMO | Initial release for customer review |

---

*This document is confidential and intended solely for the use of MANSCO Egypt and SmartForce Technology Solutions. Unauthorized distribution or reproduction is strictly prohibited.*

---

**End of Document — MANSCO-SPP-MDP-001 v1.0**
