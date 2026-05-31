// src/lib/invoices/service.ts
//
// Invoice domain service (Module 6 Phase 2). Real invoices table replacing the
// orders.invoice_number stopgap. An invoice is generated from an order's
// confirmed lines when an admin issues it. Payments/credit-notes/disputes are
// intentionally out of scope for the pragmatic build — status is pending /
// paid / overdue / cancelled, and aging is computed from due_date.

import { supabaseAdmin } from "@/lib/supabase/admin";

export type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";
export type AgingBucket = "current" | "30_days" | "60_days" | "90_plus";

const VAT_RATE = 0.14;
const PAYMENT_TERMS_DAYS = 30;

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  order_id: string;
  dealer_id: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  delivery_note: string | null;
  issued_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceComputed {
  outstanding_balance: number;
  aging_days: number;
  aging_bucket: AgingBucket;
  /** Effective status: an unpaid invoice past its due date reads as overdue. */
  effective_status: InvoiceStatus;
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

function bucketFor(agingDays: number): AgingBucket {
  if (agingDays <= 0) return "current";
  if (agingDays <= 30) return "30_days";
  if (agingDays <= 60) return "60_days";
  return "90_plus";
}

/** Derive computed financial fields for an invoice row. */
export function computeInvoiceFields(inv: InvoiceRecord): InvoiceComputed {
  const paid = inv.status === "paid";
  const cancelled = inv.status === "cancelled";
  const outstanding = paid || cancelled ? 0 : Number(inv.total_amount);

  const overdueDays = !paid && !cancelled ? Math.max(0, daysSince(inv.due_date)) : 0;
  const effective_status: InvoiceStatus =
    cancelled ? "cancelled" : paid ? "paid" : overdueDays > 0 ? "overdue" : "pending";

  return {
    outstanding_balance: Math.round(outstanding * 100) / 100,
    aging_days: overdueDays,
    aging_bucket: bucketFor(overdueDays),
    effective_status,
  };
}

/**
 * Generate the next INV-{year}-{seq} number from the invoices table.
 */
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabaseAdmin
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .gte("invoice_date", `${year}-01-01`)
    .lt("invoice_date", `${year + 1}-01-01`);
  const seq = (count ?? 0) + 1;
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Create an invoice (header + lines) from an order's confirmed lines.
 *
 * Lines with a confirmed quantity are billed at their (discounted) unit price.
 * Falls back to requested quantity when nothing has been explicitly confirmed
 * (e.g. legacy "approved" orders that never went through the split engine).
 */
export async function issueInvoiceForOrder(params: {
  orderId: string;
  userId: string;
  invoiceNumber?: string;
  deliveryNote?: string | null;
}): Promise<InvoiceRecord> {
  const { orderId, userId } = params;

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("id, dealer_id, currency")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr) throw orderErr;
  if (!order) throw new Error("Order not found");

  const { data: lines, error: linesErr } = await supabaseAdmin
    .from("order_lines")
    .select("id, part_number, part_name, quantity_requested, quantity_confirmed, unit_price, discounted_unit_price")
    .eq("order_id", orderId);
  if (linesErr) throw linesErr;
  if (!lines || lines.length === 0) throw new Error("Order has no lines to invoice");

  // Bill confirmed quantity; fall back to requested if no confirmations exist.
  const anyConfirmed = lines.some((l) => (l.quantity_confirmed ?? 0) > 0);
  const billable = lines
    .map((l) => {
      const qty = anyConfirmed ? l.quantity_confirmed ?? 0 : l.quantity_requested;
      const unitPrice = Number(l.discounted_unit_price ?? l.unit_price);
      return {
        order_line_id: l.id,
        part_number: l.part_number,
        part_name: l.part_name,
        quantity: qty,
        unit_price: unitPrice,
        line_total: Math.round(unitPrice * qty * 100) / 100,
      };
    })
    .filter((l) => l.quantity > 0);

  if (billable.length === 0) throw new Error("No confirmed quantities to invoice on this order");

  const subtotal = Math.round(billable.reduce((s, l) => s + l.line_total, 0) * 100) / 100;
  const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100;
  const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;

  const invoiceNumber = params.invoiceNumber?.trim() || (await generateInvoiceNumber());

  // Guard against a duplicate number.
  const { data: dup } = await supabaseAdmin
    .from("invoices")
    .select("id")
    .eq("invoice_number", invoiceNumber)
    .maybeSingle();
  if (dup) throw new Error(`Invoice number ${invoiceNumber} is already in use`);

  const now = new Date();
  const due = new Date(now.getTime() + PAYMENT_TERMS_DAYS * 24 * 60 * 60 * 1000);

  const { data: invoice, error: invErr } = await supabaseAdmin
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      order_id: orderId,
      dealer_id: order.dealer_id,
      invoice_date: now.toISOString(),
      due_date: due.toISOString(),
      subtotal,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      currency: order.currency ?? "EGP",
      status: "pending",
      delivery_note: params.deliveryNote ?? null,
      issued_by: userId,
    })
    .select("*")
    .single();
  if (invErr || !invoice) throw new Error(`Failed to create invoice: ${invErr?.message}`);

  const lineRows = billable.map((l) => ({ ...l, invoice_id: invoice.id }));
  const { error: ilErr } = await supabaseAdmin.from("invoice_lines").insert(lineRows);
  if (ilErr) {
    // Roll back the header so we never leave an invoice with no lines.
    await supabaseAdmin.from("invoices").delete().eq("id", invoice.id);
    throw new Error(`Failed to create invoice lines: ${ilErr.message}`);
  }

  return invoice as InvoiceRecord;
}

export interface ListInvoicesFilters {
  dealerScope?: string[] | null;
  status?: InvoiceStatus;
  limit?: number;
  offset?: number;
}

export async function listInvoices(filters: ListInvoicesFilters) {
  const limit = Math.min(filters.limit ?? 100, 200);
  const offset = filters.offset ?? 0;

  let query = supabaseAdmin
    .from("invoices")
    .select("*", { count: "exact" })
    .order("invoice_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.dealerScope && filters.dealerScope.length > 0) {
    query = query.in("dealer_id", filters.dealerScope);
  }
  if (filters.status) query = query.eq("status", filters.status);

  const { data, count, error } = await query;
  if (error) throw error;

  const rows = (data ?? []).map((inv) => ({
    ...(inv as InvoiceRecord),
    ...computeInvoiceFields(inv as InvoiceRecord),
  }));

  return { data: rows, total: count ?? 0, limit, offset };
}

export async function getInvoice(id: string) {
  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!invoice) return null;

  const { data: lines } = await supabaseAdmin
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", id)
    .order("created_at", { ascending: true });

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("order_number")
    .eq("id", (invoice as InvoiceRecord).order_id)
    .maybeSingle();

  return {
    ...(invoice as InvoiceRecord),
    ...computeInvoiceFields(invoice as InvoiceRecord),
    order_number: order?.order_number ?? null,
    lines: lines ?? [],
  };
}
