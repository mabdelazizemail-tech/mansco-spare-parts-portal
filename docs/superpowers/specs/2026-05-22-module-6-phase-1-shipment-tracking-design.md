# Module 6 — Phase 1: Shipment Tracking Design

**Date:** 2026-05-22  
**Phase:** 1 of 3  
**Status:** Approved for Implementation

---

## Overview

Phase 1 introduces **shipment tracking** as the foundational fulfillment module. It enables users to:
- Create and manage shipments linked to orders
- Support multiple shipments per order with flexible line-by-line quantity selection
- Track shipments by carrier (DHL, FedEx, MANSCO, other) with carrier-specific tracking references (AWB, DHL ref, etc.)
- Record shipment status transitions with full audit trail (who, when, why)
- View shipments globally or within order context

This phase establishes the data model and API for partial fulfillment tracking, which Phases 2 and 3 will build upon.

---

## Requirements Summary

### Functional Requirements

1. **Multiple shipments per order** — orders can have 0..N shipments
2. **Flexible line selection** — each shipment includes selected order lines with explicit shipped quantities
3. **Carrier-specific tracking** — support DHL, FedEx, MANSCO with carrier-appropriate reference fields
4. **Manual status workflow** — pending → packed → shipped → in_transit → delivered (or exception/cancelled)
5. **Audit trail** — every status change records actor (user ID), timestamp, optional notes
6. **Dual access patterns** — global shipment list + shipment panel within order detail
7. **Backward compatibility** — preserve existing order.tracking_number field; don't force migration

### Non-Functional Requirements

1. **Performance:** Shipment list should load in <500ms for typical dealer (10-50 orders)
2. **Scalability:** Support 1000+ shipments per dealer in large accounts
3. **Auditability:** All changes timestamped and attributed to user
4. **Consistency:** Validate shipped quantities server-side before persisting

---

## Data Model

### New Tables

#### `shipments`
Represents a single shipment event linked to an order.

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| id | uuid | ✗ | Primary key |
| order_id | uuid | ✗ | FK to orders.id |
| shipment_number | text | ✗ | Unique, auto-generated (e.g., "SHP-2026-0001") |
| carrier_code | text | ✗ | Enum: "dhl", "fedex", "mansco", "other" |
| carrier_name | text | ✓ | Display name (e.g., "DHL Express") |
| tracking_number | text | ✓ | Generic tracking reference (required if no awb/dhl_ref) |
| awb_number | text | ✓ | Air Waybill number (for DHL/air freight) |
| dhl_reference | text | ✓ | DHL waybill/reference (for DHL shipments) |
| shipment_status | text | ✗ | Enum: "pending", "packed", "shipped", "in_transit", "delivered", "exception", "returned", "cancelled" |
| ship_date | date | ✓ | When shipment was handed to carrier |
| eta_delivery | date | ✓ | Estimated delivery date |
| actual_delivery_date | date | ✓ | Confirmed delivery date |
| shipment_type | text | ✗ | Enum: "manual", "auto_invoice" (manual for Phase 1; auto_invoice prepared for Phase 2) |
| notes | text | ✓ | Operational notes (e.g., "Delayed due to customs") |
| created_by | uuid | ✗ | FK to auth.users, who created shipment |
| created_at | timestamp | ✗ | Auto-set to now() |
| updated_at | timestamp | ✗ | Auto-update on any change |
| updated_by | uuid | ✗ | FK to auth.users, who last updated |

**Indexes:**
- (order_id, created_at DESC) — for order detail shipment list
- (created_at DESC) — for global shipment list
- (shipment_status) — for filtering

---

#### `shipment_lines`
Maps shipments to order lines with explicit quantities.

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| id | uuid | ✗ | Primary key |
| shipment_id | uuid | ✗ | FK to shipments.id |
| order_line_id | uuid | ✗ | FK to order_lines.id |
| shipped_qty | integer | ✗ | Quantity shipped on this line |
| created_at | timestamp | ✗ | Auto-set to now() |

**Indexes:**
- (shipment_id) — for listing lines within a shipment
- (order_line_id) — for tracking total shipped qty per line

**Unique constraint:**
- (shipment_id, order_line_id) — each line appears at most once per shipment

---

### Modified Tables

**orders** (no schema changes for Phase 1)
- Existing `tracking_number` and `carrier` fields remain as legacy
- UI will gradually migrate to shipments table
- For orders pre-dating shipments feature, display as read-only "legacy shipment" reference

---

## API Specification

### Authentication & Authorization

All endpoints require a valid Supabase session. RBAC enforced:
- **Dealer:** Can create/view/update shipments for own orders only
- **Admin:** Can create/view/update shipments for any order
- **Super-admin:** Full access + audit visibility

---

### Endpoints

#### `GET /api/shipments`

**List all shipments (filtered, paginated)**

**Query Parameters:**
- `order_id` (uuid, optional) — filter by order
- `status` (string, optional) — filter by shipment_status
- `carrier_code` (string, optional) — filter by carrier
- `date_from` (ISO date, optional) — shipments created on or after this date
- `date_to` (ISO date, optional) — shipments created on or before this date
- `limit` (integer, optional, default 50, max 200)
- `offset` (integer, optional, default 0)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "shp-uuid",
      "order_id": "ord-uuid",
      "order_number": "ORD-2026-0001",
      "shipment_number": "SHP-2026-0001",
      "carrier_code": "dhl",
      "carrier_name": "DHL Express",
      "tracking_number": "1234567890",
      "awb_number": "123456789",
      "dhl_reference": "ABC123XYZ",
      "shipment_status": "in_transit",
      "ship_date": "2026-05-20",
      "eta_delivery": "2026-05-23",
      "actual_delivery_date": null,
      "created_by": "user-uuid",
      "created_at": "2026-05-20T09:15:00Z",
      "updated_at": "2026-05-21T14:30:00Z",
      "line_count": 3
    }
  ],
  "meta": {
    "total": 127,
    "limit": 50,
    "offset": 0
  }
}
```

**Notes:**
- Dealers see only shipments for their orders; admins see all
- Response includes `line_count` for quick reference; full lines fetched separately

---

#### `GET /api/shipments/[id]`

**Get full shipment detail with lines**

**Response (200 OK):**
```json
{
  "data": {
    "id": "shp-uuid",
    "order_id": "ord-uuid",
    "order_number": "ORD-2026-0001",
    "shipment_number": "SHP-2026-0001",
    "carrier_code": "dhl",
    "carrier_name": "DHL Express",
    "tracking_number": "1234567890",
    "awb_number": "123456789",
    "dhl_reference": "ABC123XYZ",
    "shipment_status": "in_transit",
    "ship_date": "2026-05-20",
    "eta_delivery": "2026-05-23",
    "actual_delivery_date": null,
    "shipment_type": "manual",
    "notes": "Handed to DHL on schedule.",
    "created_by": "user-uuid",
    "created_at": "2026-05-20T09:15:00Z",
    "updated_at": "2026-05-21T14:30:00Z",
    "updated_by": "user-uuid",
    "shipment_lines": [
      {
        "id": "shp-line-uuid",
        "order_line_id": "ord-line-uuid",
        "part_number": "PSA-4254.22",
        "part_name": "Front Brake Pad Set",
        "ordered_qty": 10,
        "shipped_qty": 10,
        "unit_price": 1250,
        "line_total": 12500
      },
      {
        "id": "shp-line-uuid-2",
        "order_line_id": "ord-line-uuid-2",
        "part_number": "PSA-1109.CK",
        "part_name": "Oil Filter",
        "ordered_qty": 25,
        "shipped_qty": 25,
        "unit_price": 280,
        "line_total": 7000
      }
    ],
    "timeline": [
      {
        "event": "Shipment created",
        "status": "pending",
        "actor": "admin-user-id",
        "actor_name": "Admin User",
        "timestamp": "2026-05-20T09:15:00Z",
        "notes": null
      },
      {
        "event": "Status updated",
        "status": "shipped",
        "actor": "admin-user-id",
        "actor_name": "Admin User",
        "timestamp": "2026-05-20T14:00:00Z",
        "notes": "Handed to DHL on schedule."
      },
      {
        "event": "Status updated",
        "status": "in_transit",
        "actor": "system",
        "actor_name": "System",
        "timestamp": "2026-05-21T14:30:00Z",
        "notes": "Auto-updated from carrier tracking (Phase 2+)"
      }
    ]
  }
}
```

**Error (404 Not Found):** Shipment not found or user lacks permission

---

#### `POST /api/shipments`

**Create a new shipment**

**Body:**
```json
{
  "order_id": "ord-uuid",
  "carrier_code": "dhl",
  "carrier_name": "DHL Express",
  "tracking_number": "1234567890",
  "awb_number": "123456789",
  "dhl_reference": "ABC123XYZ",
  "shipment_type": "manual",
  "notes": "Optional notes"
}
```

**Validation:**
- `order_id` must exist and belong to current user (if dealer) or any order (if admin)
- `carrier_code` must be one of: "dhl", "fedex", "mansco", "other"
- `tracking_number` required if no `awb_number` or `dhl_reference`
- Carrier-specific refs are optional but recommended based on carrier_code

**Response (201 Created):**
```json
{
  "data": {
    "id": "shp-uuid",
    "shipment_number": "SHP-2026-0001",
    "order_id": "ord-uuid",
    "carrier_code": "dhl",
    "shipment_status": "pending",
    "created_at": "2026-05-20T09:15:00Z",
    "created_by": "user-uuid"
  }
}
```

**Notes:**
- `shipment_number` auto-generated (SHP-{YYYY}-{SEQUENCE})
- Initial status = "pending"
- Lines added via separate POST to `/api/shipments/[id]/lines`

---

#### `POST /api/shipments/[id]/lines`

**Add a line to a shipment**

**Body:**
```json
{
  "order_line_id": "ord-line-uuid",
  "shipped_qty": 10
}
```

**Validation:**
- Shipment must exist and be in "pending" or "packed" status (not shipped/delivered)
- `order_line_id` must belong to the shipment's order
- `shipped_qty` must be > 0
- `shipped_qty` ≤ `order_line.ordered_qty` - `total_shipped_so_far` (cumulative across all shipments)
- Prevent duplicate: (shipment_id, order_line_id) must be unique

**Response (201 Created):**
```json
{
  "data": {
    "id": "shp-line-uuid",
    "shipment_id": "shp-uuid",
    "order_line_id": "ord-line-uuid",
    "shipped_qty": 10,
    "created_at": "2026-05-20T09:15:00Z"
  }
}
```

**Error (400 Bad Request):** Quantity validation failed; return detailed error:
```json
{
  "error": {
    "code": "INVALID_SHIPPED_QTY",
    "message": "Shipped quantity exceeds available.",
    "details": {
      "ordered_qty": 10,
      "already_shipped": 5,
      "available": 5,
      "requested": 10
    }
  }
}
```

---

#### `PATCH /api/shipments/[id]`

**Update shipment header (status, dates, notes)**

**Body (all fields optional):**
```json
{
  "shipment_status": "shipped",
  "ship_date": "2026-05-20",
  "eta_delivery": "2026-05-23",
  "actual_delivery_date": null,
  "notes": "Updated notes"
}
```

**Validation:**
- `shipment_status` transitions follow allowed flow: pending → packed → shipped → in_transit → delivered
- Can jump to "exception" or "cancelled" from any state
- `ship_date` and `eta_delivery` are optional but encouraged
- Shipment must be "pending" or "packed" to change to "shipped"; etc.

**Response (200 OK):**
```json
{
  "data": {
    "id": "shp-uuid",
    "shipment_status": "shipped",
    "ship_date": "2026-05-20",
    "updated_at": "2026-05-20T14:00:00Z",
    "updated_by": "user-uuid",
    "timeline": [
      {
        "event": "Status updated",
        "status": "shipped",
        "actor": "admin-user-id",
        "actor_name": "Admin User",
        "timestamp": "2026-05-20T14:00:00Z",
        "notes": null
      }
    ]
  }
}
```

**Notes:**
- Every change records `updated_by` and `updated_at`
- Timeline is rebuilt client-side from database events or stored as denormalized JSON (TBD implementation detail)

---

#### `POST /api/shipments/validate-lines`

**Pre-flight validation: check if lines/quantities are available for shipment**

**Body:**
```json
{
  "order_id": "ord-uuid",
  "order_line_ids": ["ord-line-uuid-1", "ord-line-uuid-2"],
  "quantities": [10, 25]
}
```

**Response (200 OK):**
```json
{
  "data": {
    "valid": true,
    "lines": [
      {
        "order_line_id": "ord-line-uuid-1",
        "requested_qty": 10,
        "ordered_qty": 10,
        "already_shipped": 0,
        "available": 10,
        "status": "ok"
      },
      {
        "order_line_id": "ord-line-uuid-2",
        "requested_qty": 25,
        "ordered_qty": 25,
        "already_shipped": 0,
        "available": 25,
        "status": "ok"
      }
    ]
  }
}
```

**If validation fails:**
```json
{
  "data": {
    "valid": false,
    "lines": [
      {
        "order_line_id": "ord-line-uuid-1",
        "requested_qty": 10,
        "ordered_qty": 10,
        "already_shipped": 5,
        "available": 5,
        "status": "error",
        "error": "Requested 10 but only 5 available"
      }
    ]
  }
}
```

---

### Error Responses

**Standard error format:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {
      "field": "value for debugging"
    }
  }
}
```

**Common codes:**
- `UNAUTHORIZED` (401) — user lacks permission
- `NOT_FOUND` (404) — shipment/order not found
- `VALIDATION_ERROR` (400) — field validation failed
- `INVALID_SHIPPED_QTY` (400) — quantity check failed
- `INVALID_STATUS_TRANSITION` (400) — status change not allowed
- `CONFLICT` (409) — duplicate shipment_line
- `SERVER_ERROR` (500) — unexpected error

---

## UI Specification

### Pages

#### `/dashboard/shipments` — Shipment List

**Layout:**
- Header: "Shipments" title + description
- Filter bar (sticky): order_number, carrier_code, status, date range
- "Create Shipment" button
- Table with columns:
  - shipment_number (clickable, links to detail)
  - order_number (clickable, links to order)
  - carrier (icon + name)
  - tracking_number (truncated, copy-to-clipboard icon)
  - status (color-coded badge)
  - ship_date
  - eta_delivery
  - actions (view detail, edit status, delete if pending)
- Pagination controls

**Interactions:**
- Filter by clicking chips or typing in fields
- Row click opens shipment detail (modal or drawer)
- Delete only available if status = "pending"

---

#### `/dashboard/shipments/[id]` — Shipment Detail

**Layout:**
- Back button + breadcrumb
- Shipment header panel:
  - shipment_number, order_number (link to order)
  - carrier + tracking refs displayed in separate rows
  - status badge + current state
  - ship_date, eta_delivery, actual_delivery_date
  - created/updated timestamp + actor names
  - notes section
  - Edit button (opens form)
- Shipment lines table:
  - part_number, part_name
  - ordered_qty, shipped_qty (could show remaining if Phase 2 data available)
  - unit_price, line_total
  - no edit action in Phase 1 (lines are immutable once added)
- Timeline section:
  - Chronological list of all status changes
  - For each: "Status changed from X to Y by Admin on date/time. Notes: ..."

**Interactions:**
- "Edit" button opens modal to update status, dates, notes
- "Cancel Shipment" button (only if pending)
- Back/close returns to list

---

#### Shipment Panel in Order Detail (`/dashboard/orders/[id]`)

**Layout:**
- Tab or collapsible section labeled "Shipments"
- Summary stats: "3 Shipments, 1 Delivered, 1 In Transit, 1 Pending"
- List of all shipments (read-only, no inline edit):
  - shipment_number (clickable → detail modal)
  - status badge
  - carrier + tracking_number (truncated)
  - ship_date + eta_delivery
  - line count (e.g., "4 items")
- "Create Shipment" button at bottom

**Interactions:**
- Click shipment row to expand or open detail modal
- "Create Shipment" opens modal workflow

---

### Reusable Components

**`<ShipmentStatusBadge tone={...} status={...} />`**
- Display shipment status with color: pending (gray), packed (yellow), shipped (blue), in_transit (cyan), delivered (green), exception (red), returned (orange), cancelled (gray)

**`<CarrierIcon carrier="dhl" />`**
- Display carrier logo or fallback icon

**`<ShipmentForm />`** (Modal/Drawer)
- Multi-step form for creating a shipment:
  - **Step 1:** Select carrier (radio or dropdown)
  - **Step 2:** Select order lines + quantities (table with checkboxes + qty spinners)
    - Validation: shipped_qty ≤ available_qty per line (live feedback)
    - Total shipped value displayed at bottom
  - **Step 3:** Fill tracking refs (carrier-dependent)
    - If DHL: show tracking_number, awb_number, dhl_reference (all optional)
    - If FedEx: show tracking_number, awb_number (dhl_reference hidden)
    - If MANSCO: show tracking_number only
  - **Step 4:** Review & submit
    - Confirm carrier, lines, tracking refs
    - Submit button
  - On success: toast notification + redirect to shipment detail or list

**`<ShipmentLineItem />`**
- Table row: order_line info + shipped_qty + unit_price + line_total
- Used in shipment detail + order detail shipment lines

**`<ShipmentTimeline />`**
- Vertical timeline of status changes
- For each event: status change from X to Y, actor name, timestamp, optional notes

---

### Carrier-Specific Logic

| Carrier | Tracking Fields | Visibility |
|---------|-----------------|-----------|
| DHL | tracking_number, awb_number, dhl_reference | All fields shown; all optional but awb_number recommended |
| FedEx | tracking_number, awb_number | Only these; dhl_reference hidden |
| MANSCO | tracking_number | Only this; others hidden |
| Other | tracking_number | Only this; others hidden |

---

## Business Logic & Validation

### Shipment Creation Validation

1. Order must exist and belong to current user (dealer) or be accessible to admin
2. Carrier must be valid enum
3. At least one tracking reference required (tracking_number OR awb_number OR dhl_reference)
4. Shipment type: "manual" for Phase 1; "auto_invoice" prepared for Phase 2 but disabled

### Line Addition Validation

1. Shipment must exist and be in status "pending" or "packed"
2. Order line must exist and belong to shipment's order
3. Shipped qty must be positive integer
4. Shipped qty ≤ (order_line.ordered_qty - total_shipped_across_all_shipments)
5. No duplicate (shipment_id, order_line_id) pairs

### Status Transition Rules

**Allowed transitions:**
- pending → packed
- packed → shipped
- shipped → in_transit
- in_transit → delivered
- Any status → exception (undeliverable, lost, etc.)
- Any status → returned
- pending/packed/shipped → cancelled (not allowed for in_transit+)

**Validation:**
- Backwards transitions disallowed (e.g., delivered → shipped not allowed)
- Status changes trigger audit record (user_id, timestamp, notes optional)

### Audit Trail

Every status change or field update records:
- What changed (field name, old value, new value)
- Who changed it (user_id, resolved to user name/email in response)
- When (timestamp)
- Optional notes (e.g., "Customs delay")

Timeline displayed chronologically in detail view.

---

## Backward Compatibility

**Legacy handling:**
- Existing orders.tracking_number and orders.carrier remain as read-only fields
- UI migration: orders with tracking_number but no shipments show as "1 legacy shipment"
- No automatic migration of old data; optional later migration script
- New orders use shipments table exclusively

---

## Testing Strategy

### Unit Tests (Vitest)

1. **API validation:**
   - POST /api/shipments with valid/invalid carrier codes
   - POST /api/shipments/[id]/lines with qty exceeding available
   - Status transition validation (pending → shipped allowed, delivered → shipped rejected)
   - Carrier-specific field requirements

2. **Business logic:**
   - Shipment_lines unique constraint (shipment_id, order_line_id)
   - Cumulative shipped qty calculation
   - Audit record creation on status change

### Integration Tests

1. **Full shipment creation workflow:**
   - POST /api/shipments → POST /api/shipments/[id]/lines → PATCH status
   - Verify shipment_number auto-generated
   - Verify order_lines updated with shipment reference (Phase 2)

2. **Quantity validation:**
   - POST /api/shipments/validate-lines with various qty scenarios
   - Verify error details returned correctly

3. **Permissions:**
   - Dealer can create/view shipments for own order
   - Dealer cannot access other dealer's shipments
   - Admin can access all shipments

### E2E Tests (Playwright)

1. **Happy path:**
   - Navigate to /dashboard/shipments
   - Create new shipment (DHL, 2 lines, tracking refs)
   - Verify shipment appears in list
   - Click to detail, verify all fields populated
   - Update status to "shipped", verify timeline updates

2. **Order detail integration:**
   - Navigate to order detail
   - Click "Create Shipment" in shipments panel
   - Complete wizard, verify shipment added to panel list

3. **Validation:**
   - Attempt to ship qty > ordered qty, expect error

---

## Implementation Considerations

### Database Migrations

Phase 1 requires:
1. Create shipments table
2. Create shipment_lines table
3. Add indexes on order_id, status, created_at
4. Add unique constraint on (shipment_id, order_line_id)

Migration should be reversible (down: drop tables).

### API Response Format

Follow existing app convention:
- Success: `{ data: {...}, meta?: {...} }`
- Error: `{ error: { code, message, details? } }`

### Component Library

Reuse existing shadcn/ui components:
- Button, Input, Select, Modal, Badge, etc.
- Match existing color scheme and spacing

---

## Success Criteria (Phase 1)

1. ✅ Create shipment with carrier selection and tracking refs
2. ✅ Add multiple order lines to single shipment with qty validation
3. ✅ List all shipments globally with filtering
4. ✅ View shipment detail with full line breakdown and audit timeline
5. ✅ Update shipment status through defined transitions
6. ✅ RBAC: dealers see only own orders' shipments
7. ✅ Backward compatible with existing orders.tracking_number field
8. ✅ All endpoints validated server-side
9. ✅ Full test coverage (unit, integration, E2E)

---

## Phase 2 Readiness

Phase 2 (Partial Fulfillment & Invoice Management) will:
- Extend order_lines with `confirmed_qty`, `invoiced_qty`, `fulfilled_qty` fields
- Link invoices to shipments (invoice can span 1..N shipments)
- Auto-create shipments from invoices (shipment_type = "auto_invoice")
- Recalculate order fulfillment status based on shipments + invoices

**No breaking changes required in Phase 1** to support this.

