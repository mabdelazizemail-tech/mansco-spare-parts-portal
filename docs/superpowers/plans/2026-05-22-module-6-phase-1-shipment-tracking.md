# Phase 1: Shipment Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build shipment tracking module with multi-shipment support, carrier-specific tracking refs, and full audit trail.

**Architecture:** Service layer encapsulates validation and business logic; API routes delegate to service; UI components are stateless and reusable. Database uses Supabase with migrations.

**Tech Stack:** Next.js 16, Supabase PostgreSQL, React, TypeScript, Vitest, Playwright

---

## Task Execution Order

1. Database schema (foundation)
2. Service layer & validation (business logic)
3. API endpoints (backend)
4. UI components & pages (frontend)
5. Tests (quality gates)
6. Integration & E2E (workflows)

---

## Task 1: Database Schema Migration

**Files:**
- Create: `supabase/migrations/20260522000000_create_shipments_tables.sql`

- [ ] **Step 1: Create migration file**

```bash
touch supabase/migrations/20260522000000_create_shipments_tables.sql
```

- [ ] **Step 2: Write shipments table**

```sql
-- supabase/migrations/20260522000000_create_shipments_tables.sql

-- Create shipments table
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  shipment_number TEXT NOT NULL UNIQUE,
  carrier_code TEXT NOT NULL CHECK (carrier_code IN ('dhl', 'fedex', 'mansco', 'other')),
  carrier_name TEXT,
  tracking_number TEXT,
  awb_number TEXT,
  dhl_reference TEXT,
  shipment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    shipment_status IN ('pending', 'packed', 'shipped', 'in_transit', 'delivered', 'exception', 'returned', 'cancelled')
  ),
  ship_date DATE,
  eta_delivery DATE,
  actual_delivery_date DATE,
  shipment_type TEXT NOT NULL DEFAULT 'manual' CHECK (shipment_type IN ('manual', 'auto_invoice')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  
  CONSTRAINT tracking_ref_required CHECK (
    tracking_number IS NOT NULL OR awb_number IS NOT NULL OR dhl_reference IS NOT NULL
  )
);

-- Create shipment_lines table
CREATE TABLE shipment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  order_line_id UUID NOT NULL,
  shipped_qty INTEGER NOT NULL CHECK (shipped_qty > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(shipment_id, order_line_id)
);

-- Create indexes for performance
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_created_at ON shipments(created_at DESC);
CREATE INDEX idx_shipments_status ON shipments(shipment_status);
CREATE INDEX idx_shipments_carrier ON shipments(carrier_code);
CREATE INDEX idx_shipment_lines_shipment_id ON shipment_lines(shipment_id);
CREATE INDEX idx_shipment_lines_order_line_id ON shipment_lines(order_line_id);

-- Enable RLS (Row Level Security)
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Dealers see own orders' shipments; admins see all
CREATE POLICY "dealers_view_own_shipments" ON shipments
  FOR SELECT USING (
    (auth.jwt() ->> 'role' = 'admin') OR
    (auth.jwt() ->> 'role' = 'super_admin') OR
    (order_id IN (SELECT id FROM orders WHERE dealer_id = (
      SELECT dealer_id FROM dealers WHERE supabase_uid = auth.uid()
    )))
  );

CREATE POLICY "admins_view_all_shipments" ON shipments
  FOR SELECT USING (
    (auth.jwt() ->> 'role' = 'admin') OR
    (auth.jwt() ->> 'role' = 'super_admin')
  );

CREATE POLICY "users_create_shipments" ON shipments
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "users_update_shipments" ON shipments
  FOR UPDATE USING (
    (auth.jwt() ->> 'role' = 'admin') OR
    (auth.jwt() ->> 'role' = 'super_admin') OR
    (order_id IN (SELECT id FROM orders WHERE dealer_id = (
      SELECT dealer_id FROM dealers WHERE supabase_uid = auth.uid()
    )))
  );

-- RLS for shipment_lines: inherit from shipments
CREATE POLICY "view_shipment_lines" ON shipment_lines
  FOR SELECT USING (shipment_id IN (SELECT id FROM shipments));

CREATE POLICY "create_shipment_lines" ON shipment_lines
  FOR INSERT WITH CHECK (shipment_id IN (SELECT id FROM shipments));
```

- [ ] **Step 3: Verify syntax**

Run: `head -20 supabase/migrations/20260522000000_create_shipments_tables.sql`

Expected: See CREATE TABLE shipments statement

- [ ] **Step 4: Commit migration**

```bash
git add supabase/migrations/20260522000000_create_shipments_tables.sql
git commit -m "feat(db): create shipments and shipment_lines tables with RLS"
```

---

## Task 2: Shipment Validation Service

**Files:**
- Create: `src/lib/shipments/validation.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/lib/shipments/validation.test.ts

import { describe, it, expect } from "vitest";
import {
  validateCarrierCode,
  validateTrackingRefs,
  validateStatusTransition,
  validateShippedQty,
} from "@/lib/shipments/validation";

describe("shipment validation", () => {
  it("should accept valid carrier codes", () => {
    expect(validateCarrierCode("dhl")).toBe(true);
    expect(validateCarrierCode("fedex")).toBe(true);
    expect(validateCarrierCode("mansco")).toBe(true);
    expect(validateCarrierCode("other")).toBe(true);
  });

  it("should reject invalid carrier codes", () => {
    expect(validateCarrierCode("ups")).toBe(false);
    expect(validateCarrierCode("")).toBe(false);
  });

  it("should require at least one tracking ref", () => {
    expect(validateTrackingRefs("dhl", { tracking_number: "123" })).toBe(true);
    expect(validateTrackingRefs("dhl", { awb_number: "123" })).toBe(true);
    expect(validateTrackingRefs("dhl", {})).toBe(false);
  });

  it("should validate DHL-specific refs", () => {
    const dhlRefs = { tracking_number: "123", awb_number: "456", dhl_reference: "789" };
    expect(validateTrackingRefs("dhl", dhlRefs)).toBe(true);
  });

  it("should reject invalid status transitions", () => {
    expect(validateStatusTransition("pending", "shipped")).toBe(false); // must go packed first
    expect(validateStatusTransition("pending", "packed")).toBe(true);
    expect(validateStatusTransition("delivered", "shipped")).toBe(false); // backwards
    expect(validateStatusTransition("any_status", "exception")).toBe(true); // exception always allowed
  });

  it("should validate shipped qty", () => {
    const lineData = { ordered_qty: 10, already_shipped: 0 };
    expect(validateShippedQty(8, lineData)).toBe(true);
    expect(validateShippedQty(10, lineData)).toBe(true);
    expect(validateShippedQty(11, lineData)).toBe(false); // exceeds available
  });

  it("should track cumulative shipped qty", () => {
    const lineData = { ordered_qty: 10, already_shipped: 5 };
    expect(validateShippedQty(5, lineData)).toBe(true);
    expect(validateShippedQty(6, lineData)).toBe(false); // total would be 11
  });
});
```

- [ ] **Step 2: Create validation module**

```typescript
// src/lib/shipments/validation.ts

export type CarrierCode = "dhl" | "fedex" | "mansco" | "other";
export type ShipmentStatus = 
  | "pending" | "packed" | "shipped" | "in_transit" | "delivered"
  | "exception" | "returned" | "cancelled";

export interface TrackingRefs {
  tracking_number?: string | null;
  awb_number?: string | null;
  dhl_reference?: string | null;
}

export interface LineQtyData {
  ordered_qty: number;
  already_shipped: number;
}

export function validateCarrierCode(code: unknown): code is CarrierCode {
  return ["dhl", "fedex", "mansco", "other"].includes(code as string);
}

export function validateTrackingRefs(carrier: CarrierCode, refs: TrackingRefs): boolean {
  const hasTrackingNumber = !!refs.tracking_number;
  const hasAwb = !!refs.awb_number;
  const hasDhl = !!refs.dhl_reference;

  // At least one ref required
  if (!hasTrackingNumber && !hasAwb && !hasDhl) {
    return false;
  }

  // Carrier-specific validation could go here (Phase 2+)
  // For Phase 1, any combination is acceptable
  return true;
}

export function validateStatusTransition(fromStatus: ShipmentStatus, toStatus: ShipmentStatus): boolean {
  // Exception and returned can be reached from any state
  if (toStatus === "exception" || toStatus === "returned" || toStatus === "cancelled") {
    return true;
  }

  const validTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
    pending: ["packed", "shipped", "exception", "returned", "cancelled"],
    packed: ["shipped", "exception", "returned", "cancelled"],
    shipped: ["in_transit", "exception", "returned"],
    in_transit: ["delivered", "exception", "returned"],
    delivered: [], // terminal state
    exception: ["returned", "shipped"], // can retry from exception
    returned: [], // terminal state
    cancelled: [], // terminal state
  };

  return validTransitions[fromStatus]?.includes(toStatus) ?? false;
}

export function validateShippedQty(shippedQty: number, lineData: LineQtyData): boolean {
  if (shippedQty <= 0) return false;
  
  const available = lineData.ordered_qty - lineData.already_shipped;
  return shippedQty <= available;
}

export function getTrackingRefErrorMessages(carrier: CarrierCode, refs: TrackingRefs): string[] {
  const errors: string[] = [];

  if (!refs.tracking_number && !refs.awb_number && !refs.dhl_reference) {
    errors.push("At least one tracking reference is required");
  }

  return errors;
}

export function getShippedQtyErrorMessage(requested: number, lineData: LineQtyData): string {
  const available = lineData.ordered_qty - lineData.already_shipped;
  return `Requested ${requested} units but only ${available} available (${lineData.ordered_qty} ordered, ${lineData.already_shipped} already shipped)`;
}
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
npm run test -- tests/unit/lib/shipments/validation.test.ts
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add tests/unit/lib/shipments/validation.test.ts src/lib/shipments/validation.ts
git commit -m "feat(lib): add shipment validation with status transitions and qty checks"
```

---

## Task 3: Carrier Configuration

**Files:**
- Create: `src/lib/shipments/carrier-config.ts`

- [ ] **Step 1: Write carrier config module**

```typescript
// src/lib/shipments/carrier-config.ts

import type { CarrierCode } from "./validation";

export interface CarrierConfig {
  code: CarrierCode;
  name: string;
  fields: {
    tracking_number: boolean; // show?
    awb_number: boolean;
    dhl_reference: boolean;
  };
  icon: string; // lucide-react icon name
}

export const CARRIERS: Record<CarrierCode, CarrierConfig> = {
  dhl: {
    code: "dhl",
    name: "DHL Express",
    fields: { tracking_number: true, awb_number: true, dhl_reference: true },
    icon: "Package",
  },
  fedex: {
    code: "fedex",
    name: "FedEx",
    fields: { tracking_number: true, awb_number: true, dhl_reference: false },
    icon: "Truck",
  },
  mansco: {
    code: "mansco",
    name: "MANSCO Logistics",
    fields: { tracking_number: true, awb_number: false, dhl_reference: false },
    icon: "Package",
  },
  other: {
    code: "other",
    name: "Other Carrier",
    fields: { tracking_number: true, awb_number: false, dhl_reference: false },
    icon: "Box",
  },
};

export function getCarrierConfig(code: CarrierCode): CarrierConfig {
  return CARRIERS[code];
}

export function getVisibleFields(code: CarrierCode): string[] {
  const config = getCarrierConfig(code);
  return Object.entries(config.fields)
    .filter(([_, show]) => show)
    .map(([field]) => field);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/shipments/carrier-config.ts
git commit -m "feat(lib): add carrier configuration for field visibility"
```

---

## Task 4: Shipment Service (CRUD & Business Logic)

**Files:**
- Create: `src/lib/shipments/service.ts`

- [ ] **Step 1: Create service module with types**

```typescript
// src/lib/shipments/service.ts

import { supabaseAdmin } from "@/lib/supabase/admin";
import { validateCarrierCode, validateTrackingRefs, validateStatusTransition, validateShippedQty } from "./validation";
import type { CarrierCode, ShipmentStatus, TrackingRefs } from "./validation";

export interface CreateShipmentInput {
  order_id: string;
  carrier_code: CarrierCode;
  carrier_name?: string;
  tracking_number?: string;
  awb_number?: string;
  dhl_reference?: string;
  shipment_type?: "manual" | "auto_invoice";
  notes?: string;
}

export interface ShipmentLineInput {
  order_line_id: string;
  shipped_qty: number;
}

export interface ShipmentRecord {
  id: string;
  order_id: string;
  shipment_number: string;
  carrier_code: CarrierCode;
  carrier_name: string | null;
  tracking_number: string | null;
  awb_number: string | null;
  dhl_reference: string | null;
  shipment_status: ShipmentStatus;
  ship_date: string | null;
  eta_delivery: string | null;
  actual_delivery_date: string | null;
  shipment_type: "manual" | "auto_invoice";
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

// Generate next shipment_number
export async function generateShipmentNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  
  const { data, error } = await supabaseAdmin
    .from("shipments")
    .select("shipment_number", { count: "exact" })
    .gte("created_at", `${year}-01-01`)
    .order("shipment_number", { ascending: false })
    .limit(1);

  if (error) throw error;

  let sequence = 1;
  if (data && data.length > 0) {
    const lastNumber = data[0].shipment_number;
    const match = lastNumber.match(/SHP-\d+-(\d+)/);
    if (match) sequence = parseInt(match[1]) + 1;
  }

  return `SHP-${year}-${String(sequence).padStart(4, "0")}`;
}

// Create shipment header
export async function createShipment(
  input: CreateShipmentInput,
  userId: string
): Promise<ShipmentRecord> {
  // Validate input
  if (!validateCarrierCode(input.carrier_code)) {
    throw new Error("Invalid carrier code");
  }

  const refs: TrackingRefs = {
    tracking_number: input.tracking_number,
    awb_number: input.awb_number,
    dhl_reference: input.dhl_reference,
  };

  if (!validateTrackingRefs(input.carrier_code, refs)) {
    throw new Error("At least one tracking reference is required");
  }

  // Verify order exists
  const { data: orderData, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("id", input.order_id)
    .single();

  if (orderError || !orderData) {
    throw new Error("Order not found");
  }

  // Generate shipment_number
  const shipmentNumber = await generateShipmentNumber();

  // Create shipment
  const { data: shipment, error: createError } = await supabaseAdmin
    .from("shipments")
    .insert({
      order_id: input.order_id,
      shipment_number: shipmentNumber,
      carrier_code: input.carrier_code,
      carrier_name: input.carrier_name || null,
      tracking_number: input.tracking_number || null,
      awb_number: input.awb_number || null,
      dhl_reference: input.dhl_reference || null,
      shipment_status: "pending",
      shipment_type: input.shipment_type || "manual",
      notes: input.notes || null,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (createError || !shipment) {
    throw new Error(`Failed to create shipment: ${createError?.message}`);
  }

  return shipment as ShipmentRecord;
}

// Get shipment by ID
export async function getShipment(shipmentId: string): Promise<ShipmentRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("shipments")
    .select("*")
    .eq("id", shipmentId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }

  return data as ShipmentRecord;
}

// Add line to shipment
export async function addShipmentLine(
  shipmentId: string,
  input: ShipmentLineInput
): Promise<{ id: string; shipment_id: string; order_line_id: string; shipped_qty: number }> {
  // Verify shipment exists and is in correct status
  const shipment = await getShipment(shipmentId);
  if (!shipment) throw new Error("Shipment not found");
  if (!["pending", "packed"].includes(shipment.shipment_status)) {
    throw new Error(`Cannot add lines to shipment in ${shipment.shipment_status} status`);
  }

  // Verify order_line exists and belongs to this shipment's order
  const { data: lineData, error: lineError } = await supabaseAdmin
    .from("order_lines")
    .select("id, quantity_requested, part_number")
    .eq("id", input.order_line_id)
    .eq("order_id", shipment.order_id)
    .single();

  if (lineError || !lineData) {
    throw new Error("Order line not found or does not belong to this order");
  }

  // Check cumulative shipped qty
  const { data: existingLines, error: existingError } = await supabaseAdmin
    .from("shipment_lines")
    .select("shipped_qty")
    .eq("order_line_id", input.order_line_id);

  if (existingError) throw existingError;

  const alreadyShipped = existingLines?.reduce((sum, line) => sum + line.shipped_qty, 0) ?? 0;
  const lineQtyData = {
    ordered_qty: lineData.quantity_requested,
    already_shipped: alreadyShipped,
  };

  if (!validateShippedQty(input.shipped_qty, lineQtyData)) {
    throw new Error(
      `Shipped quantity ${input.shipped_qty} exceeds available (ordered: ${lineData.quantity_requested}, already shipped: ${alreadyShipped})`
    );
  }

  // Check for duplicate
  const { data: existing } = await supabaseAdmin
    .from("shipment_lines")
    .select("id")
    .eq("shipment_id", shipmentId)
    .eq("order_line_id", input.order_line_id);

  if (existing && existing.length > 0) {
    throw new Error("This order line is already in this shipment");
  }

  // Insert line
  const { data: line, error: insertError } = await supabaseAdmin
    .from("shipment_lines")
    .insert({
      shipment_id: shipmentId,
      order_line_id: input.order_line_id,
      shipped_qty: input.shipped_qty,
    })
    .select()
    .single();

  if (insertError || !line) {
    throw new Error(`Failed to add line: ${insertError?.message}`);
  }

  return line;
}

// Update shipment status
export async function updateShipmentStatus(
  shipmentId: string,
  newStatus: ShipmentStatus,
  userId: string,
  updates?: {
    ship_date?: string | null;
    eta_delivery?: string | null;
    actual_delivery_date?: string | null;
    notes?: string | null;
  }
): Promise<ShipmentRecord> {
  const shipment = await getShipment(shipmentId);
  if (!shipment) throw new Error("Shipment not found");

  if (!validateStatusTransition(shipment.shipment_status as ShipmentStatus, newStatus)) {
    throw new Error(`Cannot transition from ${shipment.shipment_status} to ${newStatus}`);
  }

  const updateData: any = {
    shipment_status: newStatus,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if (updates) {
    if (updates.ship_date !== undefined) updateData.ship_date = updates.ship_date;
    if (updates.eta_delivery !== undefined) updateData.eta_delivery = updates.eta_delivery;
    if (updates.actual_delivery_date !== undefined) updateData.actual_delivery_date = updates.actual_delivery_date;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
  }

  const { data, error } = await supabaseAdmin
    .from("shipments")
    .update(updateData)
    .eq("id", shipmentId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update shipment: ${error?.message}`);
  }

  return data as ShipmentRecord;
}

// List shipments with filters
export async function listShipments(filters: {
  order_id?: string;
  status?: ShipmentStatus;
  carrier_code?: CarrierCode;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = filters.offset ?? 0;

  let query = supabaseAdmin
    .from("shipments")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.order_id) query = query.eq("order_id", filters.order_id);
  if (filters.status) query = query.eq("shipment_status", filters.status);
  if (filters.carrier_code) query = query.eq("carrier_code", filters.carrier_code);
  if (filters.date_from) query = query.gte("created_at", filters.date_from);
  if (filters.date_to) query = query.lte("created_at", filters.date_to);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    data: (data ?? []) as ShipmentRecord[],
    total: count ?? 0,
    limit,
    offset,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/shipments/service.ts
git commit -m "feat(lib): add shipment service with CRUD and validation"
```

---

## Task 5: API Endpoint — List & Create Shipments

**Files:**
- Create: `src/app/api/shipments/route.ts`

- [ ] **Step 1: Write API route**

```typescript
// src/app/api/shipments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listShipments, createShipment } from "@/lib/shipments/service";
import type { CreateShipmentInput } from "@/lib/shipments/service";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const orderId = sp.get("order_id");
    const status = sp.get("status");
    const carrierCode = sp.get("carrier_code");
    const dateFrom = sp.get("date_from");
    const dateTo = sp.get("date_to");
    const limit = Math.min(Number(sp.get("limit")) || 50, 200);
    const offset = Number(sp.get("offset")) || 0;

    const result = await listShipments({
      order_id: orderId || undefined,
      status: (status as any) || undefined,
      carrier_code: (carrierCode as any) || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      data: result.data,
      meta: { total: result.total, limit: result.limit, offset: result.offset },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list shipments";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const body = await req.json();
    const input: CreateShipmentInput = {
      order_id: body.order_id,
      carrier_code: body.carrier_code,
      carrier_name: body.carrier_name,
      tracking_number: body.tracking_number,
      awb_number: body.awb_number,
      dhl_reference: body.dhl_reference,
      shipment_type: body.shipment_type || "manual",
      notes: body.notes,
    };

    // Validate required fields
    if (!input.order_id || !input.carrier_code) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "order_id and carrier_code are required" } },
        { status: 400 }
      );
    }

    const shipment = await createShipment(input, user.id);

    return NextResponse.json({ data: shipment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create shipment";
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/shipments/route.ts
git commit -m "feat(api): add GET/POST /api/shipments endpoints"
```

---

## Task 6: API Endpoint — Get & Update Shipment

**Files:**
- Create: `src/app/api/shipments/[id]/route.ts`

- [ ] **Step 1: Write API route**

```typescript
// src/app/api/shipments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getShipment, updateShipmentStatus } from "@/lib/shipments/service";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const shipment = await getShipment(id);
    if (!shipment) {
      return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    }

    // Fetch lines
    const { data: lines } = await supabaseAdmin
      .from("shipment_lines")
      .select(
        "id, shipment_id, order_line_id, shipped_qty, order_lines(part_number, part_name, quantity_requested, unit_price)"
      )
      .eq("shipment_id", id);

    // Fetch timeline (status changes)
    const timeline = [
      {
        event: "Shipment created",
        status: "pending",
        actor: shipment.created_by,
        timestamp: shipment.created_at,
        notes: null,
      },
    ];

    return NextResponse.json({
      data: {
        ...shipment,
        shipment_lines: lines ?? [],
        timeline,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get shipment";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const body = await req.json();
    const { shipment_status, ship_date, eta_delivery, actual_delivery_date, notes } = body;

    if (!shipment_status) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "shipment_status is required" } },
        { status: 400 }
      );
    }

    const updated = await updateShipmentStatus(id, shipment_status, user.id, {
      ship_date,
      eta_delivery,
      actual_delivery_date,
      notes,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update shipment";
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/shipments/[id]/route.ts
git commit -m "feat(api): add GET/PATCH /api/shipments/[id] endpoints"
```

---

## Task 7: API Endpoint — Add Shipment Lines

**Files:**
- Create: `src/app/api/shipments/[id]/lines/route.ts`

- [ ] **Step 1: Write API route**

```typescript
// src/app/api/shipments/[id]/lines/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { addShipmentLine } from "@/lib/shipments/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const body = await req.json();
    const { order_line_id, shipped_qty } = body;

    if (!order_line_id || !shipped_qty) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "order_line_id and shipped_qty are required" } },
        { status: 400 }
      );
    }

    const line = await addShipmentLine(id, { order_line_id, shipped_qty });

    return NextResponse.json({ data: line }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add line";
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/shipments/[id]/lines/route.ts
git commit -m "feat(api): add POST /api/shipments/[id]/lines endpoint"
```

---

## Task 8: API Endpoint — Validate Lines

**Files:**
- Create: `src/app/api/shipments/validate-lines/route.ts`

- [ ] **Step 1: Write API route**

```typescript
// src/app/api/shipments/validate-lines/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validateShippedQty } from "@/lib/shipments/validation";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const { order_id, order_line_ids, quantities } = await req.json();

    if (!order_id || !Array.isArray(order_line_ids) || !Array.isArray(quantities)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "order_id, order_line_ids[], and quantities[] are required" } },
        { status: 400 }
      );
    }

    if (order_line_ids.length !== quantities.length) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "order_line_ids and quantities must have same length" } },
        { status: 400 }
      );
    }

    // Fetch all order lines
    const { data: lines } = await supabaseAdmin
      .from("order_lines")
      .select("id, quantity_requested")
      .eq("order_id", order_id);

    const lineMap = new Map(lines?.map(l => [l.id, l.quantity_requested]) ?? []);

    // For each line, calculate cumulative shipped qty
    const results = [];
    let valid = true;

    for (let i = 0; i < order_line_ids.length; i++) {
      const lineId = order_line_ids[i];
      const requestedQty = quantities[i];
      const orderedQty = lineMap.get(lineId);

      if (!orderedQty) {
        results.push({
          order_line_id: lineId,
          requested_qty: requestedQty,
          ordered_qty: null,
          already_shipped: 0,
          available: 0,
          status: "error",
          error: "Order line not found",
        });
        valid = false;
        continue;
      }

      // Get cumulative shipped
      const { data: shipLines } = await supabaseAdmin
        .from("shipment_lines")
        .select("shipped_qty")
        .eq("order_line_id", lineId);

      const alreadyShipped = shipLines?.reduce((s, l) => s + l.shipped_qty, 0) ?? 0;
      const available = orderedQty - alreadyShipped;

      const isValid = validateShippedQty(requestedQty, { ordered_qty: orderedQty, already_shipped: alreadyShipped });

      results.push({
        order_line_id: lineId,
        requested_qty: requestedQty,
        ordered_qty: orderedQty,
        already_shipped: alreadyShipped,
        available,
        status: isValid ? "ok" : "error",
        error: isValid ? null : `Requested ${requestedQty} but only ${available} available`,
      });

      if (!isValid) valid = false;
    }

    return NextResponse.json({
      data: {
        valid,
        lines: results,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to validate lines";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/shipments/validate-lines/route.ts
git commit -m "feat(api): add POST /api/shipments/validate-lines endpoint"
```

---

## Task 9: UI Components — Status Badge & Carrier Icon

**Files:**
- Create: `src/components/shipments/shipment-status-badge.tsx`
- Create: `src/components/shipments/carrier-icon.tsx`

- [ ] **Step 1: Write status badge component**

```typescript
// src/components/shipments/shipment-status-badge.tsx

import { StatusBadge } from "@/components/portal/status-badge";
import type { ShipmentStatus } from "@/lib/shipments/validation";
import type { ToneColor } from "@/lib/portal-data";

const statusToneMap: Record<ShipmentStatus, ToneColor> = {
  pending: "muted",
  packed: "warning",
  shipped: "info",
  in_transit: "info",
  delivered: "success",
  exception: "destructive",
  returned: "warning",
  cancelled: "muted",
};

const statusLabelMap: Record<ShipmentStatus, string> = {
  pending: "Pending",
  packed: "Packed",
  shipped: "Shipped",
  in_transit: "In Transit",
  delivered: "Delivered",
  exception: "Exception",
  returned: "Returned",
  cancelled: "Cancelled",
};

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <StatusBadge
      tone={statusToneMap[status]}
      label={statusLabelMap[status]}
    />
  );
}
```

- [ ] **Step 2: Write carrier icon component**

```typescript
// src/components/shipments/carrier-icon.tsx

import { getCarrierConfig } from "@/lib/shipments/carrier-config";
import type { CarrierCode } from "@/lib/shipments/validation";
import * as Icons from "lucide-react";

export function CarrierIcon({ carrier, className = "h-5 w-5" }: { carrier: CarrierCode; className?: string }) {
  const config = getCarrierConfig(carrier);
  const Icon = Icons[config.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
  
  if (!Icon) return <Icons.Box className={className} />;
  
  return <Icon className={className} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shipments/shipment-status-badge.tsx src/components/shipments/carrier-icon.tsx
git commit -m "feat(ui): add shipment status badge and carrier icon components"
```

---

## Task 10: UI Component — Shipment Line Item

**Files:**
- Create: `src/components/shipments/shipment-line-item.tsx`

- [ ] **Step 1: Write component**

```typescript
// src/components/shipments/shipment-line-item.tsx

import { formatEGP } from "@/lib/portal-data";

export interface ShipmentLineItemProps {
  partNumber: string;
  partName: string;
  orderedQty: number;
  shippedQty: number;
  unitPrice: number;
}

export function ShipmentLineItem({
  partNumber,
  partName,
  orderedQty,
  shippedQty,
  unitPrice,
}: ShipmentLineItemProps) {
  const lineTotal = shippedQty * unitPrice;

  return (
    <tr className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02]">
      <td className="px-5 py-3 font-mono text-xs font-semibold text-white">{partNumber}</td>
      <td className="px-5 py-3 text-sm text-white">{partName}</td>
      <td className="px-5 py-3 text-center text-sm text-white/60">{orderedQty}</td>
      <td className="px-5 py-3 text-center text-sm text-white font-semibold">{shippedQty}</td>
      <td className="px-5 py-3 text-right text-sm text-white">{formatEGP(unitPrice)}</td>
      <td className="px-5 py-3 text-right text-sm font-semibold text-white">{formatEGP(lineTotal)}</td>
    </tr>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shipments/shipment-line-item.tsx
git commit -m "feat(ui): add shipment line item component"
```

---

## Task 11: UI Page — Shipment List

**Files:**
- Create: `src/app/dashboard/shipments/page.tsx`

- [ ] **Step 1: Write list page**

```typescript
// src/app/dashboard/shipments/page.tsx

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShipmentStatusBadge } from "@/components/shipments/shipment-status-badge";
import { CarrierIcon } from "@/components/shipments/carrier-icon";
import { Plus, ChevronRight } from "lucide-react";
import type { ShipmentRecord } from "@/lib/shipments/service";

export default function ShipmentsListPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const query = status === "all" ? "" : `?status=${status}`;
        const res = await fetch(`/api/shipments${query}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setShipments(json.data ?? []);
      } catch (error) {
        console.error("Error fetching shipments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Shipments</h1>
          <p className="mt-1 text-sm text-white/40">Track and manage all shipments.</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 bg-[#00BFA6] hover:bg-[#00A892]"
          onClick={() => router.push("/dashboard/shipments/new")}
        >
          <Plus className="h-4 w-4" /> Create Shipment
        </Button>
      </div>

      <div className="flex gap-2">
        {["all", "pending", "shipped", "in_transit", "delivered"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              status === s
                ? "bg-[#00BFA6] text-white"
                : "bg-[#1A1A1A] border border-[#2A2A2A] text-white/50 hover:text-white/70"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-12 text-center text-white/40">
          Loading shipments...
        </div>
      ) : shipments.length === 0 ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-12 text-center text-white/40">
          No shipments found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Shipment #</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Order</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Carrier</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Tracking</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Ship Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">ETA</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02] cursor-pointer"
                  onClick={() => router.push(`/dashboard/shipments/${s.id}`)}
                >
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-[#00BFA6]">{s.shipment_number}</td>
                  <td className="px-5 py-3 text-sm text-white/70">{s.order_id}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <CarrierIcon carrier={s.carrier_code} className="h-4 w-4" />
                      <span className="text-sm text-white">{s.carrier_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-white/60 font-mono">{s.tracking_number || "—"}</td>
                  <td className="px-5 py-3">
                    <ShipmentStatusBadge status={s.shipment_status as any} />
                  </td>
                  <td className="px-5 py-3 text-sm text-white/60">{s.ship_date || "—"}</td>
                  <td className="px-5 py-3 text-sm text-white/60">{s.eta_delivery || "—"}</td>
                  <td className="px-5 py-3">
                    <ChevronRight className="h-4 w-4 text-white/20" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/shipments/page.tsx
git commit -m "feat(ui): add shipments list page"
```

---

## Task 12: UI Page — Shipment Detail

**Files:**
- Create: `src/app/dashboard/shipments/[id]/page.tsx`

- [ ] **Step 1: Write detail page**

```typescript
// src/app/dashboard/shipments/[id]/page.tsx

"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShipmentStatusBadge } from "@/components/shipments/shipment-status-badge";
import { CarrierIcon } from "@/components/shipments/carrier-icon";
import { ShipmentLineItem } from "@/components/shipments/shipment-line-item";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { ShipmentRecord } from "@/lib/shipments/service";

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await fetch(`/api/shipments/${id}`);
        if (!res.ok) throw new Error("Failed to fetch shipment");
        const json = await res.json();
        setShipment(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading shipment");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
        <p className="text-red-400">{error || "Shipment not found"}</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-[#00BFA6] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header Panel */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{shipment.shipment_number}</h1>
            <p className="text-sm text-white/40">Order: {shipment.order_id}</p>
          </div>
          <ShipmentStatusBadge status={shipment.shipment_status} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/40">Carrier</p>
            <div className="flex items-center gap-2 mt-1">
              <CarrierIcon carrier={shipment.carrier_code} className="h-4 w-4" />
              <p className="text-white">{shipment.carrier_name}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-white/40">Tracking Number</p>
            <p className="text-white font-mono text-sm mt-1">{shipment.tracking_number || "—"}</p>
          </div>
          {shipment.awb_number && (
            <div>
              <p className="text-xs text-white/40">AWB Number</p>
              <p className="text-white font-mono text-sm mt-1">{shipment.awb_number}</p>
            </div>
          )}
          {shipment.dhl_reference && (
            <div>
              <p className="text-xs text-white/40">DHL Reference</p>
              <p className="text-white font-mono text-sm mt-1">{shipment.dhl_reference}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-white/40">Ship Date</p>
            <p className="text-white mt-1">{shipment.ship_date || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">ETA Delivery</p>
            <p className="text-white mt-1">{shipment.eta_delivery || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Actual Delivery</p>
            <p className="text-white mt-1">{shipment.actual_delivery_date || "—"}</p>
          </div>
        </div>

        {shipment.notes && (
          <div className="pt-2 border-t border-[#2A2A2A]">
            <p className="text-xs text-white/40">Notes</p>
            <p className="text-white text-sm mt-2">{shipment.notes}</p>
          </div>
        )}
      </div>

      {/* Lines Table */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="border-b border-[#2A2A2A] px-6 py-4">
          <h2 className="font-semibold text-white">Shipment Lines</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Part #</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Part Name</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-white/40 uppercase">Ordered</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-white/40 uppercase">Shipped</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-white/40 uppercase">Unit Price</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-white/40 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {shipment.shipment_lines?.map((line: any) => (
              <ShipmentLineItem
                key={line.id}
                partNumber={line.order_lines?.part_number || "—"}
                partName={line.order_lines?.part_name || "—"}
                orderedQty={line.order_lines?.quantity_requested || 0}
                shippedQty={line.shipped_qty}
                unitPrice={line.order_lines?.unit_price || 0}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/shipments/[id]/page.tsx
git commit -m "feat(ui): add shipment detail page"
```

---

## Task 13: Integration Tests — Shipment API

**Files:**
- Create: `tests/integration/api/shipments.test.ts`

- [ ] **Step 1: Write integration tests**

```typescript
// tests/integration/api/shipments.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createShipment, addShipmentLine, getShipment } from "@/lib/shipments/service";

describe("shipment API integration", () => {
  const testOrderId = "test-order-001"; // Assumes this exists in test DB
  const testUserId = "test-user-001";
  let shipmentId: string;

  beforeEach(async () => {
    // Clean up any prior test data
    await supabaseAdmin
      .from("shipments")
      .delete()
      .eq("created_by", testUserId);
  });

  it("should create a shipment with all required fields", async () => {
    const shipment = await createShipment(
      {
        order_id: testOrderId,
        carrier_code: "dhl",
        carrier_name: "DHL Express",
        tracking_number: "1234567890",
        awb_number: "ABC123",
        notes: "Test shipment",
      },
      testUserId
    );

    expect(shipment.id).toBeDefined();
    expect(shipment.shipment_number).toMatch(/^SHP-\d+-\d{4}$/);
    expect(shipment.carrier_code).toBe("dhl");
    expect(shipment.shipment_status).toBe("pending");
    expect(shipment.created_by).toBe(testUserId);

    shipmentId = shipment.id;
  });

  it("should reject shipment with no tracking references", async () => {
    expect(
      createShipment(
        {
          order_id: testOrderId,
          carrier_code: "dhl",
        },
        testUserId
      )
    ).rejects.toThrow("At least one tracking reference is required");
  });

  it("should add a line to a shipment", async () => {
    const shipment = await createShipment(
      {
        order_id: testOrderId,
        carrier_code: "fedex",
        tracking_number: "FX12345",
      },
      testUserId
    );

    const line = await addShipmentLine(shipment.id, {
      order_line_id: "test-line-001",
      shipped_qty: 5,
    });

    expect(line.shipment_id).toBe(shipment.id);
    expect(line.order_line_id).toBe("test-line-001");
    expect(line.shipped_qty).toBe(5);
  });

  it("should prevent duplicate order lines in shipment", async () => {
    const shipment = await createShipment(
      {
        order_id: testOrderId,
        carrier_code: "mansco",
        tracking_number: "MANSCO123",
      },
      testUserId
    );

    await addShipmentLine(shipment.id, {
      order_line_id: "test-line-002",
      shipped_qty: 3,
    });

    expect(
      addShipmentLine(shipment.id, {
        order_line_id: "test-line-002",
        shipped_qty: 2,
      })
    ).rejects.toThrow("already in this shipment");
  });

  it("should prevent adding lines to non-pending shipment", async () => {
    const shipment = await createShipment(
      {
        order_id: testOrderId,
        carrier_code: "other",
        tracking_number: "OTHER999",
      },
      testUserId
    );

    // Change status to shipped
    await supabaseAdmin
      .from("shipments")
      .update({ shipment_status: "shipped" })
      .eq("id", shipment.id);

    expect(
      addShipmentLine(shipment.id, {
        order_line_id: "test-line-003",
        shipped_qty: 1,
      })
    ).rejects.toThrow("Cannot add lines");
  });
});
```

- [ ] **Step 2: Run tests (assume test DB is set up)**

```bash
npm run test -- tests/integration/api/shipments.test.ts
```

Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/integration/api/shipments.test.ts
git commit -m "test(integration): add shipment API integration tests"
```

---

## Task 14: E2E Test — Shipment Workflow

**Files:**
- Create: `tests/e2e/shipment-workflow.spec.ts`

- [ ] **Step 1: Write E2E test**

```typescript
// tests/e2e/shipment-workflow.spec.ts

import { test, expect } from "@playwright/test";

test.describe("shipment workflow", () => {
  test("should create and track a shipment end-to-end", async ({ page }) => {
    // Login as dealer
    await page.goto("/login");
    await page.fill("input[type='email']", "dealer@test.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button:has-text('Login')");
    await page.waitForNavigation();

    // Navigate to shipments list
    await page.goto("/dashboard/shipments");
    await expect(page.locator("h1")).toContainText("Shipments");

    // Create new shipment
    await page.click("button:has-text('Create Shipment')");
    await page.waitForSelector("[role='dialog']");

    // Select carrier
    await page.selectOption("select[name='carrier_code']", "dhl");

    // Fill tracking refs
    await page.fill("input[name='tracking_number']", "DHL1234567890");
    await page.fill("input[name='awb_number']", "ABC123XYZ");

    // Submit form
    await page.click("button:has-text('Create')");
    await expect(page).toHaveURL(/\/dashboard\/shipments\/[a-f0-9-]+$/);

    // Verify detail page
    await expect(page.locator("h1")).toContainText("SHP-");
    await expect(page.locator("text=DHL Express")).toBeVisible();
    await expect(page.locator("text=DHL1234567890")).toBeVisible();

    // Update status
    const statusButton = page.locator("button:has-text('Edit')");
    await statusButton.click();
    await page.selectOption("select[name='shipment_status']", "shipped");
    await page.click("button:has-text('Update')");

    // Verify status changed
    await expect(page.locator("text=Shipped")).toBeVisible();
  });

  test("should list and filter shipments", async ({ page }) => {
    await page.goto("/dashboard/shipments");

    // Filter by status
    await page.click("button:has-text('In Transit')");
    await page.waitForLoadState("networkidle");

    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    // Verify all rows are "In Transit"
    for (let i = 0; i < count; i++) {
      const status = rows.nth(i).locator("[role='status']");
      await expect(status).toContainText("In Transit");
    }
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/shipment-workflow.spec.ts
git commit -m "test(e2e): add shipment workflow end-to-end tests"
```

---

## Task 15: Rollback & Safety

**Files:**
- Create: `supabase/migrations/20260522000001_rollback_shipments.sql` (for safety, not applied by default)

- [ ] **Step 1: Create rollback migration**

```sql
-- supabase/migrations/20260522000001_rollback_shipments.sql (DO NOT APPLY unless rollback needed)

-- Drop policies
DROP POLICY IF EXISTS "dealers_view_own_shipments" ON shipments;
DROP POLICY IF EXISTS "admins_view_all_shipments" ON shipments;
DROP POLICY IF EXISTS "users_create_shipments" ON shipments;
DROP POLICY IF EXISTS "users_update_shipments" ON shipments;
DROP POLICY IF EXISTS "view_shipment_lines" ON shipment_lines;
DROP POLICY IF EXISTS "create_shipment_lines" ON shipment_lines;

-- Disable RLS
ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_lines DISABLE ROW LEVEL SECURITY;

-- Drop indexes
DROP INDEX IF EXISTS idx_shipments_order_id;
DROP INDEX IF EXISTS idx_shipments_created_at;
DROP INDEX IF EXISTS idx_shipments_status;
DROP INDEX IF EXISTS idx_shipments_carrier;
DROP INDEX IF EXISTS idx_shipment_lines_shipment_id;
DROP INDEX IF EXISTS idx_shipment_lines_order_line_id;

-- Drop tables
DROP TABLE IF EXISTS shipment_lines;
DROP TABLE IF EXISTS shipments;
```

- [ ] **Step 2: Document rollback instructions**

```bash
# To rollback (ONLY if needed):
# 1. Backup production data first
# 2. Run migration: psql -d "postgresql://..." -f supabase/migrations/20260522000001_rollback_shipments.sql
# 3. Verify no shipment data remains: SELECT COUNT(*) FROM shipments; -- should be error (table doesn't exist)
```

- [ ] **Step 3: Commit rollback file**

```bash
git add supabase/migrations/20260522000001_rollback_shipments.sql
git commit -m "docs(db): add rollback migration (for emergency only)"
```

---

## Task 16: Final Verification

- [ ] **Step 1: Run all tests**

```bash
npm run test
npm run test:e2e
```

Expected: All shipment tests pass

- [ ] **Step 2: Verify API endpoints manually**

```bash
# Create shipment
curl -X POST http://localhost:3000/api/shipments \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ord-001",
    "carrier_code": "dhl",
    "tracking_number": "DHL123"
  }'

# List shipments
curl http://localhost:3000/api/shipments

# Get detail
curl http://localhost:3000/api/shipments/shp-uuid
```

Expected: All endpoints return correct JSON

- [ ] **Step 3: Verify UI pages load**

```bash
# Start dev server
npm run dev

# Visit in browser:
# - http://localhost:3000/dashboard/shipments
# - http://localhost:3000/dashboard/shipments/[any-id]

# Verify no console errors
```

- [ ] **Step 4: Final commit**

```bash
git log --oneline | head -20
# Verify Phase 1 commits are all present
```

- [ ] **Step 5: Create PR or tag**

```bash
# Option A: Create PR for review
git push origin phase-1-shipment-tracking
# Then create PR via GitHub/GitLab UI

# Option B: Tag for release
git tag -a v0.1.0-phase1-shipment -m "Phase 1: Shipment Tracking complete"
git push origin v0.1.0-phase1-shipment
```

---

## Architecture Notes

**Why this structure?**
- **Service layer** (`service.ts`) encapsulates all business logic and DB queries → easy to test and reuse
- **Validation module** (`validation.ts`) is pure logic → simple, fast unit tests
- **API routes** delegate to service → thin controllers
- **UI components** are mostly presentational → reusable, isolated from API details
- **RLS policies** on tables → data access enforcement at DB level, not just app level

**Phase 2 integration points (prepared, not implemented):**
- `shipment_type: "auto_invoice"` field prepared for Phase 2 auto-creation from invoices
- No breaking changes; Phase 2 will add invoice linking without modifying Phase 1 tables

---

## Success Criteria

- ✅ All 6 API endpoints tested and working
- ✅ Service layer fully encapsulates business logic
- ✅ UI pages and components render and interact correctly
- ✅ RBAC enforced at DB level (RLS policies)
- ✅ Shipment validation catches edge cases
- ✅ Unit, integration, and E2E tests passing
- ✅ No database breaking changes
- ✅ Rollback migration documented

