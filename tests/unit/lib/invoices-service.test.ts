import { describe, it, expect } from "vitest";
import { computeInvoiceFields, type InvoiceRecord } from "@/lib/invoices/service";

/** Build an InvoiceRecord with sensible defaults; override what each test needs. */
function inv(over: Partial<InvoiceRecord>): InvoiceRecord {
  const now = new Date();
  return {
    id: "inv-1",
    invoice_number: "INV-2026-0001",
    order_id: "ord-1",
    dealer_id: "DLR-001",
    invoice_date: now.toISOString(),
    due_date: now.toISOString(),
    subtotal: 1000,
    vat_amount: 140,
    total_amount: 1140,
    currency: "EGP",
    status: "pending",
    delivery_note: null,
    issued_by: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    ...over,
  };
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe("computeInvoiceFields", () => {
  it("paid invoice: zero outstanding, effective_status paid, no aging", () => {
    const r = computeInvoiceFields(inv({ status: "paid", due_date: daysFromNow(-90) }));
    expect(r.outstanding_balance).toBe(0);
    expect(r.effective_status).toBe("paid");
    expect(r.aging_days).toBe(0);
    expect(r.aging_bucket).toBe("current");
  });

  it("cancelled invoice: zero outstanding, effective_status cancelled", () => {
    const r = computeInvoiceFields(inv({ status: "cancelled", due_date: daysFromNow(-40) }));
    expect(r.outstanding_balance).toBe(0);
    expect(r.effective_status).toBe("cancelled");
  });

  it("pending, not yet due: outstanding = total, status pending, current bucket", () => {
    const r = computeInvoiceFields(inv({ status: "pending", total_amount: 1140, due_date: daysFromNow(10) }));
    expect(r.outstanding_balance).toBe(1140);
    expect(r.effective_status).toBe("pending");
    expect(r.aging_days).toBe(0);
    expect(r.aging_bucket).toBe("current");
  });

  it("pending, past due: reads as overdue with positive aging", () => {
    const r = computeInvoiceFields(inv({ status: "pending", due_date: daysFromNow(-5) }));
    expect(r.effective_status).toBe("overdue");
    expect(r.aging_days).toBeGreaterThanOrEqual(4);
    expect(r.outstanding_balance).toBe(1140);
  });

  it("aging buckets: 30 / 60 / 90+ boundaries", () => {
    expect(computeInvoiceFields(inv({ due_date: daysFromNow(-20) })).aging_bucket).toBe("30_days");
    expect(computeInvoiceFields(inv({ due_date: daysFromNow(-45) })).aging_bucket).toBe("60_days");
    expect(computeInvoiceFields(inv({ due_date: daysFromNow(-75) })).aging_bucket).toBe("90_plus");
  });

  it("outstanding is rounded to 2 decimals", () => {
    const r = computeInvoiceFields(inv({ status: "pending", total_amount: 1140.005, due_date: daysFromNow(5) }));
    expect(r.outstanding_balance).toBe(1140.01);
  });
});
