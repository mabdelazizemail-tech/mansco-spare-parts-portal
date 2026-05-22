# Module 6 — Fulfillment Tracking Design Spec

**Date:** 2026-05-22
**Status:** Approved
**Module:** Invoices, Shipments, Back-Orders

## Overview

Module 6 adds full-stack fulfillment tracking to the MANSCO Spare Parts Portal. Dealers can view invoices with full financial detail (payments, credit notes, aging), track shipments with embedded live carrier data, and monitor backorders with ETA change history and risk alerts. Admins get a fulfillment dashboard with action queues, dealer impersonation, and escalation for at-risk items.

Built on Prisma + real API routes (not mock data). Three independent domains (Invoices, Shipments, BackOrders), each with their own API routes and page components, referenced via foreign keys to Orders. No shared context — each page fetches directly from its domain API.

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data layer | Full-stack Prisma + API routes | Production-grade, supports admin cross-dealer queries |
| Carrier tracking | Embedded live (DHL API) with deep-link fallback | Rich UX; pluggable adapter for future carriers |
| Partial fulfillment | Hybrid auto-split + threshold escalation | Auto for routine (<30% backorder), admin review for large splits |
| ETA changes | Notify + escalation (>7 day slippage → at-risk) | Prevents silent slippage; admin visibility |
| Invoice detail | Full financial view (payments, credit notes, dispute) | Complete self-service for dealers |
| Admin view | Dashboard + action queues + dealer impersonation | Operational control and support capability |
| Architecture | Domain-separated (Invoice, Shipment, BackOrder) | Clean separation, independent scaling, matches CLAUDE.md model |
| Carrier support | Pluggable adapter; ship with DHL only | Extensible without code changes; MANSCO fleet = manual status |

## Database Schema

### Invoice Domain

```prisma
model Invoice {
  id              String        @id @default(cuid())
  invoiceNumber   String        @unique @map("invoice_number")
  orderId         String        @map("order_id")
  order           Order         @relation(fields: [orderId], references: [id])
  dealerId        String        @map("dealer_id")
  dealer          Dealer        @relation(fields: [dealerId], references: [id])
  invoiceDate     DateTime      @map("invoice_date")
  dueDate         DateTime      @map("due_date")
  subtotal        Decimal       @db.Decimal(12, 2)
  vatAmount       Decimal       @map("vat_amount") @db.Decimal(12, 2)
  totalAmount     Decimal       @map("total_amount") @db.Decimal(12, 2)
  currency        String        @default("EGP")
  status          InvoiceStatus @default(PENDING)
  deliveryNote    String?       @map("delivery_note")
  pdfPath         String?       @map("pdf_path")
  amountPaid      Decimal       @default(0) @map("amount_paid") @db.Decimal(12, 2)
  lastPaymentDate DateTime?     @map("last_payment_date")
  sapReference    String?       @map("sap_reference")
  syncedAt        DateTime?     @map("synced_at")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  lines       InvoiceLine[]
  payments    Payment[]
  shipments   Shipment[]
  creditNotes CreditNote[]

  @@map("invoices")
}

model InvoiceLine {
  id          String   @id @default(cuid())
  invoiceId   String   @map("invoice_id")
  invoice     Invoice  @relation(fields: [invoiceId], references: [id])
  orderLineId String?  @map("order_line_id")
  orderLine   OrderLine? @relation(fields: [orderLineId], references: [id])
  partNumber  String   @map("part_number")
  partName    String   @map("part_name")
  quantity    Int
  unitPrice   Decimal  @map("unit_price") @db.Decimal(12, 2)
  lineTotal   Decimal  @map("line_total") @db.Decimal(12, 2)

  @@map("invoice_lines")
}

model Payment {
  id           String   @id @default(cuid())
  invoiceId    String   @map("invoice_id")
  invoice      Invoice  @relation(fields: [invoiceId], references: [id])
  amount       Decimal  @db.Decimal(12, 2)
  paymentDate  DateTime @map("payment_date")
  method       String?
  reference    String?
  sapReference String?  @map("sap_reference")
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("payments")
}

model CreditNote {
  id         String   @id @default(cuid())
  invoiceId  String   @map("invoice_id")
  invoice    Invoice  @relation(fields: [invoiceId], references: [id])
  noteNumber String   @unique @map("note_number")
  amount     Decimal  @db.Decimal(12, 2)
  reason     String
  issuedAt   DateTime @map("issued_at")
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("credit_notes")
}

enum InvoiceStatus {
  PENDING
  PARTIALLY_PAID
  PAID
  OVERDUE
  DISPUTED
  CANCELLED
}
```

### Shipment Domain

```prisma
model Shipment {
  id                String         @id @default(cuid())
  orderId           String         @map("order_id")
  order             Order          @relation(fields: [orderId], references: [id])
  invoiceId         String?        @map("invoice_id")
  invoice           Invoice?       @relation(fields: [invoiceId], references: [id])
  dealerId          String         @map("dealer_id")
  dealer            Dealer         @relation(fields: [dealerId], references: [id])
  carrier           String
  trackingNumber    String         @map("tracking_number")
  awbNumber         String?        @map("awb_number")
  status            ShipmentStatus @default(PENDING)
  shipmentDate      DateTime?      @map("shipment_date")
  estimatedDelivery DateTime?      @map("estimated_delivery")
  actualDelivery    DateTime?      @map("actual_delivery")
  lastCarrierSync   DateTime?      @map("last_carrier_sync")
  carrierRawStatus  String?        @map("carrier_raw_status")
  createdAt         DateTime       @default(now()) @map("created_at")
  updatedAt         DateTime       @updatedAt @map("updated_at")

  trackingEvents ShipmentTrackingEvent[]
  lines          ShipmentLine[]

  @@map("shipments")
}

model ShipmentLine {
  id          String    @id @default(cuid())
  shipmentId  String    @map("shipment_id")
  shipment    Shipment  @relation(fields: [shipmentId], references: [id])
  orderLineId String    @map("order_line_id")
  orderLine   OrderLine @relation(fields: [orderLineId], references: [id])
  quantity    Int

  @@map("shipment_lines")
}

model ShipmentTrackingEvent {
  id          String   @id @default(cuid())
  shipmentId  String   @map("shipment_id")
  shipment    Shipment @relation(fields: [shipmentId], references: [id])
  status      String
  description String
  location    String?
  occurredAt  DateTime @map("occurred_at")
  source      String   @default("carrier_api")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("shipment_tracking_events")
}

enum ShipmentStatus {
  PENDING
  PICKED_UP
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERED
  FAILED_DELIVERY
  RETURNED
}
```

### BackOrder Domain

```prisma
model BackOrder {
  id            String          @id @default(cuid())
  orderLineId   String          @map("order_line_id")
  orderLine     OrderLine       @relation(fields: [orderLineId], references: [id])
  orderId       String          @map("order_id")
  order         Order           @relation(fields: [orderId], references: [id])
  dealerId      String          @map("dealer_id")
  dealer        Dealer          @relation(fields: [dealerId], references: [id])
  partNumber    String          @map("part_number")
  quantity      Int
  originalEta   DateTime?       @map("original_eta")
  currentEta    DateTime?       @map("current_eta")
  status        BackOrderStatus @default(AWAITING)
  isAtRisk      Boolean         @default(false) @map("is_at_risk")
  riskFlaggedAt DateTime?       @map("risk_flagged_at")
  slippageDays  Int             @default(0) @map("slippage_days")
  resolvedAt    DateTime?       @map("resolved_at")
  resolvedVia   String?         @map("resolved_via")  // fulfilled | cancelled | substituted (substituted is future-use)
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")

  etaHistory BackOrderEtaChange[]

  @@map("back_orders")
}

model BackOrderEtaChange {
  id          String    @id @default(cuid())
  backOrderId String    @map("back_order_id")
  backOrder   BackOrder @relation(fields: [backOrderId], references: [id])
  previousEta DateTime? @map("previous_eta")
  newEta      DateTime? @map("new_eta")
  reason      String?
  source      String    @default("sap_sync")
  changedAt   DateTime  @default(now()) @map("changed_at")

  @@map("back_order_eta_changes")
}

enum BackOrderStatus {
  AWAITING
  IN_TRANSIT
  FULFILLED
  CANCELLED
}
```

### In-App Notifications

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  type      String
  title     String
  message   String
  link      String?
  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([userId, isRead])
  @@map("notifications")
}
```

## API Routes

### Invoice APIs

```
GET    /api/invoices                — List (dealer: own, admin: all; ?status, ?page, ?limit, ?sort, ?dealer_id)
GET    /api/invoices/:id            — Detail with lines, payments, credit notes
GET    /api/invoices/:id/pdf        — Stream PDF from Supabase Storage
POST   /api/invoices/:id/dispute    — Dealer opens dispute (requires reason text)
```

**Dispute flow:** When a dealer submits a dispute, the invoice status changes to `DISPUTED`, the reason is stored, and an admin notification is created. Admin resolves by either issuing a `CreditNote` (adjusts the balance) or rejecting the dispute (status reverts to previous). Disputed invoices do not accrue aging while in dispute.

Computed fields per invoice:
- `outstanding_balance` = totalAmount - amountPaid - sum(creditNotes.amount)
- `aging_days` = max(0, daysSince(dueDate)) when unpaid
- `aging_bucket` = "current" | "30_days" | "60_days" | "90_plus"

### Shipment APIs

```
GET    /api/shipments               — List (dealer: own, admin: all)
GET    /api/shipments/:id           — Detail with tracking events
POST   /api/shipments/:id/refresh   — Force carrier API refresh (rate-limited: 1 per 30 min)
PUT    /api/shipments/:id/status    — Admin manual status update (MANSCO fleet)
```

### BackOrder APIs

```
GET    /api/backorders              — List (dealer: own, admin: all; ?status, ?at_risk)
GET    /api/backorders/:id          — Detail with ETA history
PUT    /api/backorders/:id/eta      — Admin manual ETA override
POST   /api/backorders/:id/cancel   — Admin cancels a backorder line
GET    /api/backorders/at-risk      — Admin: backorders past slippage threshold
```

### Admin Fulfillment APIs

```
GET    /api/admin/fulfillment/overview    — Aggregated KPIs across all dealers
GET    /api/admin/fulfillment/aging       — Invoice aging breakdown
GET    /api/admin/dealers/:id/fulfillment — Impersonation: specific dealer's full fulfillment view
```

### Response Format

All endpoints follow the existing convention:
```json
{ "data": { ... }, "meta": { "total": 100, "page": 1, "limit": 20, "pages": 5 } }
```

Errors:
```json
{ "error": { "code": "INVOICE_NOT_FOUND", "message": "..." } }
```

## Carrier Adapter Pattern

### File Structure

```
src/lib/carriers/
├── types.ts            — CarrierAdapter interface + TrackingEvent type
├── registry.ts         — Maps carrier name → adapter instance
├── dhl.ts              — DHL Tracking API implementation
├── mansco-fleet.ts     — Manual status only (no external API)
└── fallback.ts         — Deep-link only (generates carrier website URL)
```

### Interface

```typescript
interface TrackingEvent {
  status: string;
  description: string;
  location?: string;
  occurredAt: Date;
}

interface CarrierAdapter {
  name: string;
  supportsLiveTracking: boolean;
  fetchTrackingEvents(trackingNumber: string): Promise<TrackingEvent[]>;
  getTrackingUrl(trackingNumber: string): string;
}
```

### DHL API

The DHL adapter uses the DHL Shipment Tracking API (Unified Tracking endpoint). Requires a DHL developer API key configured via `DHL_API_KEY` environment variable. The adapter maps DHL status codes to our `ShipmentStatus` enum.

### Carrier Sync Job

- Schedule: Every 30 minutes, 8am–8pm Egypt time
- Scope: Shipments where status NOT IN (DELIVERED, RETURNED)
- Rate limit: Max 100 DHL API calls per batch, exponential backoff on 429s
- For each shipment:
  1. Get adapter from registry by carrier name
  2. If `supportsLiveTracking`: fetch events, diff, insert new, update status
  3. If shipment now DELIVERED: set `actualDelivery`, cascade to order status
  4. Update `lastCarrierSync` timestamp

## Partial Fulfillment Workflow

### Split Engine (runs at order approval)

```
For each OrderLine:
  ├─ atp >= requested → confirmed (quantity_confirmed = requested)
  ├─ 0 < atp < requested → SPLIT:
  │    • Confirmed: quantity_confirmed = atp
  │    • BackOrder: quantity = requested - atp, original_eta from StockAvailability
  └─ atp == 0 → BackOrder: full quantity, original_eta or null

Calculate: backorder_value / total_order_value

IF ratio > 30% (configurable):
  → Order stays under_review, admin sees split preview
  → Admin can: accept split, adjust quantities, cancel backorder lines
  
IF ratio <= 30%:
  → Auto-apply split
  → Order.status = "partial" (if backorders) or "approved" (if all confirmed)
  → Create BackOrder records
  → Notify dealer
```

### Admin Split Review UI

Embedded in the existing order detail page (`/dashboard/orders/[id]`):
- Table: part, requested qty, available qty, proposed confirmed qty, proposed backorder qty, ETA
- Per-line override controls
- Summary bar: "X of Y lines confirmed, Z backordered, value = EGP N (P%)"
- "Apply Split" button to finalize

### Configurable Thresholds

```typescript
// src/lib/fulfillment/threshold.ts
export const BACKORDER_REVIEW_THRESHOLD = 0.30;  // 30% of order value
export const ETA_SLIPPAGE_RISK_DAYS = 7;          // flag as at-risk after 7 days
```

## SAP CSV Sync Extensions

### New Import: Invoice CSV

Fields: `invoice_number, order_number, invoice_date, due_date, subtotal, vat_amount, total_amount, delivery_note, line_items[], payment_status, amount_paid, sap_reference`

On import:
- Upsert Invoice + InvoiceLine records
- Link to Order via order_number, InvoiceLine to OrderLine via part_number
- Update Order.status → "invoiced" if all confirmed lines invoiced
- Compute aging bucket

### New Import: Shipment CSV

Fields: `order_number, carrier, tracking_number, awb_number, shipment_date, estimated_delivery, items[]`

On import:
- Create Shipment + ShipmentLine records
- Link to Order and Invoice
- Update Order.status → "shipped" if all confirmed lines have shipments
- Trigger initial carrier API fetch for DHL shipments

### Extended: Stock Availability CSV

Existing import now also triggers:
- BackOrder ETA recalculation when `replenishment_eta` changes
- Create BackOrderEtaChange record
- Risk flagging: if slippage > 7 days, set `isAtRisk = true`, set `riskFlaggedAt`

## Notification System

### Triggers

| Event | Dealer | Admin |
|-------|--------|-------|
| Order auto-split | In-app + email: line breakdown | — |
| Order needs split review | — | In-app: "ORD-XXX needs split review (N% backorder)" |
| Invoice issued | In-app: "New invoice INV-XXX" | — |
| Invoice overdue | In-app + email: "INV-XXX is N days overdue" | In-app: Overdue queue |
| Shipment created | In-app: "Dispatched via [carrier], tracking: XXX" | — |
| Shipment delivered | In-app: "Delivered" | — |
| Shipment failed | In-app + email: "Delivery failed" | In-app: alert |
| BackOrder ETA changed | In-app: "ETA updated — new: [date]" | — |
| BackOrder at risk | In-app: "Delayed by X days" | In-app: At-Risk queue |
| BackOrder fulfilled | In-app: "Now available" | — |

### Implementation

- `notifications` table (see schema above) for in-app
- Polled by frontend (or SSE/WebSocket later)
- Email via pluggable service (SendGrid/Resend — configured but optional at launch)

## UI Design

### Dealer Pages

**Invoice List** (`/dashboard/invoices`):
- Layout: Aging donut chart (left panel) + filterable table (right panel)
- Donut: paid / current / 30-day / 60-day / 90+ breakdown
- Table columns: Invoice #, Order, Date, Due, Status, Aging, Amount
- Filters: All | Pending | Paid | Overdue | Disputed
- Search bar for invoice number

**Invoice Detail** (`/dashboard/invoices/[id]`):
- Layout: Stacked cards + tabs
- Header bar: invoice number, status badge, PDF download button
- 4 financial summary cards: Total, Paid, Outstanding, Due In X Days
- Tabbed section: Line Items | Payments | Credit Notes
- Dispute button (opens modal with required reason text)

**Back-Orders** (`/dashboard/backorders`):
- Layout: Summary cards + risk-highlighted table + expandable rows
- 4 summary cards: Total Items, Awaiting, In Transit, At Risk (red border)
- Table columns: Order, Part #, Part Name, Qty, Original ETA, Current ETA, Slippage, Status
- At-risk rows: red left border, highlighted background
- Click row to expand: ETA change history timeline with source (SAP sync / manual)

**Shipment Tracking** (embedded in `/dashboard/orders/[id]`):
- Layout: Stepper + event log
- Header: carrier name, tracking number, AWB, status badge, ETA
- Horizontal progress stepper: Picked Up → In Transit → Hub → Out for Delivery → Delivered
- Vertical event log: reverse chronological, carrier events with location + timestamp
- "Last synced X min ago" + manual refresh button (rate-limited)
- Fallback: if carrier doesn't support live tracking, show deep-link to carrier website

### Admin Pages

**Fulfillment Dashboard** (`/dashboard/admin/fulfillment`):
- Top row: 4 KPI cards (Shipments In Transit, Invoices Overdue, Backorders At Risk, Avg Fulfillment Time)
- Below: 3 tabbed action queues:
  - **At-Risk Backorders**: sorted by slippage days desc, admin can update ETA or cancel
  - **Overdue Invoices**: sorted by aging days desc, admin can send payment reminder
  - **Pending Shipments**: ready to dispatch, admin can update status
- "View as Dealer" search bar for impersonation (opens dealer's fulfillment view)

**Dealer Impersonation** (`/dashboard/admin/dealers/[id]/fulfillment`):
- Shows the specific dealer's invoices, shipments, backorders in a read-only view
- Same layout as dealer pages but with admin context banner: "Viewing as [Dealer Name]"

### Navigation Changes

**Dealer sidebar**: No new links. Existing "Invoices" and "Back Orders" enhanced in-place.

**Admin sidebar**: Add one link under OVERVIEW section:
```
Fulfillment Dashboard → /dashboard/admin/fulfillment
```

## File Structure (New Files)

```
src/
├── app/
│   ├── api/
│   │   ├── invoices/
│   │   │   ├── route.ts                    — GET list
│   │   │   └── [id]/
│   │   │       ├── route.ts                — GET detail
│   │   │       ├── pdf/route.ts            — GET PDF stream
│   │   │       └── dispute/route.ts        — POST dispute
│   │   ├── shipments/
│   │   │   ├── route.ts                    — GET list
│   │   │   └── [id]/
│   │   │       ├── route.ts                — GET detail
│   │   │       ├── refresh/route.ts        — POST carrier refresh
│   │   │       └── status/route.ts         — PUT admin status update
│   │   ├── backorders/
│   │   │   ├── route.ts                    — GET list
│   │   │   ├── at-risk/route.ts            — GET at-risk list
│   │   │   └── [id]/
│   │   │       ├── route.ts                — GET detail
│   │   │       ├── eta/route.ts            — PUT admin ETA override
│   │   │       └── cancel/route.ts         — POST admin cancel
│   │   └── admin/
│   │       └── fulfillment/
│   │           ├── overview/route.ts       — GET aggregated stats
│   │           └── aging/route.ts          — GET invoice aging
│   ├── dashboard/
│   │   ├── invoices/
│   │   │   ├── page.tsx                    — Enhanced list (replace existing)
│   │   │   └── [id]/
│   │   │       └── page.tsx                — Invoice detail (new)
│   │   ├── backorders/
│   │   │   └── page.tsx                    — Enhanced list (replace existing)
│   │   └── admin/
│   │       ├── fulfillment/
│   │       │   └── page.tsx                — Admin dashboard (new)
│   │       └── dealers/
│   │           └── [id]/
│   │               └── fulfillment/
│   │                   └── page.tsx        — Dealer impersonation (new)
├── lib/
│   ├── carriers/
│   │   ├── types.ts
│   │   ├── registry.ts
│   │   ├── dhl.ts
│   │   ├── mansco-fleet.ts
│   │   └── fallback.ts
│   ├── fulfillment/
│   │   ├── split-engine.ts
│   │   ├── threshold.ts
│   │   └── notifications.ts
│   ├── sync/
│   │   ├── schemas/
│   │   │   ├── invoice-csv.ts              — Invoice CSV column defs (new)
│   │   │   └── shipment-csv.ts             — Shipment CSV column defs (new)
│   │   └── importer.ts                     — Extended for invoices + shipments
│   └── validators/
│       ├── invoice.ts                      — Zod schemas
│       ├── shipment.ts
│       └── backorder.ts
├── components/
│   ├── fulfillment/
│   │   ├── invoice-aging-donut.tsx
│   │   ├── invoice-detail-tabs.tsx
│   │   ├── shipment-stepper.tsx
│   │   ├── shipment-event-log.tsx
│   │   ├── backorder-table.tsx
│   │   ├── backorder-eta-history.tsx
│   │   ├── split-review-panel.tsx
│   │   └── admin-fulfillment-kpis.tsx
│   └── notifications/
│       └── notification-bell.tsx
└── types/
    └── fulfillment.ts                      — Shared TypeScript types
```

## Testing Requirements

### Unit Tests (Vitest)

- **Split engine**: all branch paths (full confirm, partial split, full backorder, threshold exceeded)
- **Carrier adapters**: DHL response parsing, error handling, rate limiting
- **ETA recalculation**: slippage calculation, risk flagging, history creation
- **Aging computation**: bucket assignment, overdue detection
- **Validators**: all Zod schemas with valid/invalid inputs

### Integration Tests

- Invoice API: CRUD, pagination, aging computation, dispute flow
- Shipment API: CRUD, carrier refresh rate-limiting, status cascade
- BackOrder API: CRUD, ETA override, at-risk filtering, cancel flow
- Split engine + order approval: end-to-end with stock availability mock
- CSV import: invoice and shipment CSV processing with sample files

### E2E Tests (Playwright)

- Dealer: view invoice list → click invoice → see detail with tabs → download PDF
- Dealer: view backorders → see risk highlighted rows → expand ETA history
- Dealer: view order with shipment → see stepper + event log → click refresh
- Admin: open fulfillment dashboard → see KPIs → switch between queues → act on items
- Admin: search dealer → impersonate → see dealer's fulfillment data
- Admin: approve order with partial stock → see split preview → apply split
