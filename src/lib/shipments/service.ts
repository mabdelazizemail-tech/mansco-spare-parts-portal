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
