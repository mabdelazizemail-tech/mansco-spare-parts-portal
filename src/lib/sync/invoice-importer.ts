/**
 * SAP → Portal CSV Sync — Invoices
 *
 * Ingests invoices issued in SAP into the portal's invoices/invoice_lines
 * tables, links them to the originating order by order_number, and moves the
 * order to "invoiced".
 *
 * CSV shape (invoices-import.csv) — one row per invoice line, header fields
 * repeated. PENDING MANSCO/SAP sign-off:
 *
 *   invoice_number,order_number,invoice_date,due_date,currency,
 *   subtotal,vat_amount,total_amount,delivery_note,
 *   part_number,part_name,quantity,unit_price,line_total
 *
 * Header-level fields (subtotal/vat_amount/total_amount/due_date/...) are read
 * from the first row of each invoice group; when subtotal/total are blank they
 * are derived from the line totals. Re-importing the same invoice_number
 * replaces its lines (idempotent).
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseCsv, type CsvRow } from "./csv";
import { startSyncLog, completeSyncLog, type RowError } from "./sync-log";

export interface InvoiceSyncResult {
  sync_log_id: string;
  file_type: "invoices";
  records_processed: number; // invoices upserted
  records_failed: number; // invoice groups that failed
  error_details: RowError[];
  duration_ms: number;
}

const VAT_RATE = 0.14;

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export async function importInvoiceCsv(opts: {
  file_name: string;
  csv_content: string;
}): Promise<InvoiceSyncResult> {
  const started = Date.now();
  const sync_log_id = await startSyncLog("import", "invoices", opts.file_name);
  const errors: RowError[] = [];
  let processed = 0;
  let failed = 0;

  try {
    const rows = parseCsv(opts.csv_content);

    // Group line rows by invoice_number, preserving the first row's header fields.
    const groups = new Map<string, { header: CsvRow; lines: CsvRow[] }>();
    rows.forEach((r) => {
      const key = r.invoice_number?.trim();
      if (!key) return;
      if (!groups.has(key)) groups.set(key, { header: r, lines: [] });
      groups.get(key)!.lines.push(r);
    });

    for (const [invoiceNumber, group] of groups) {
      try {
        const h = group.header;
        if (!h.order_number) throw new Error("order_number is required");

        // Resolve the originating order (for order_id + dealer_id + status sync).
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, dealer_id, status, invoice_number")
          .eq("order_number", h.order_number.trim())
          .maybeSingle();
        if (!order) throw new Error(`Order ${h.order_number} not found`);

        // Build line rows.
        const lineRows = group.lines
          .filter((l) => l.part_number)
          .map((l, idx) => {
            const qty = num(l.quantity);
            const unit = num(l.unit_price);
            if (Number.isNaN(qty) || qty <= 0) throw new Error(`line ${idx + 1}: quantity must be a positive number`);
            if (Number.isNaN(unit) || unit < 0) throw new Error(`line ${idx + 1}: unit_price must be a non-negative number`);
            const lineTotal = l.line_total ? num(l.line_total) : Math.round(unit * qty * 100) / 100;
            return {
              part_number: l.part_number.trim(),
              part_name: l.part_name?.trim() || l.part_number.trim(),
              quantity: qty,
              unit_price: unit,
              line_total: Number.isFinite(lineTotal) ? lineTotal : Math.round(unit * qty * 100) / 100,
            };
          });
        if (lineRows.length === 0) throw new Error("invoice has no valid line rows");

        // Header amounts — use provided values, else derive from lines.
        const subtotal = h.subtotal ? num(h.subtotal) : Math.round(lineRows.reduce((s, l) => s + l.line_total, 0) * 100) / 100;
        const vatAmount = h.vat_amount ? num(h.vat_amount) : Math.round(subtotal * VAT_RATE * 100) / 100;
        const totalAmount = h.total_amount ? num(h.total_amount) : Math.round((subtotal + vatAmount) * 100) / 100;
        if ([subtotal, vatAmount, totalAmount].some((n) => Number.isNaN(n))) {
          throw new Error("subtotal/vat_amount/total_amount must be numeric when supplied");
        }

        const invoiceDate = h.invoice_date?.trim() || new Date().toISOString();
        if (Number.isNaN(Date.parse(invoiceDate))) throw new Error("invoice_date is not a valid date");
        const dueDate =
          h.due_date?.trim() ||
          new Date(new Date(invoiceDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        if (Number.isNaN(Date.parse(dueDate))) throw new Error("due_date is not a valid date");

        // Upsert the invoice header (unique on invoice_number).
        const { data: invoice, error: upErr } = await supabaseAdmin
          .from("invoices")
          .upsert(
            {
              invoice_number: invoiceNumber,
              order_id: order.id,
              dealer_id: order.dealer_id,
              invoice_date: invoiceDate,
              due_date: dueDate,
              subtotal,
              vat_amount: vatAmount,
              total_amount: totalAmount,
              currency: (h.currency || "EGP").toUpperCase(),
              delivery_note: h.delivery_note?.trim() || null,
              sap_reference: invoiceNumber,
              synced_at: new Date().toISOString(),
            },
            { onConflict: "invoice_number" }
          )
          .select("id")
          .single();
        if (upErr || !invoice) throw new Error(`upsert invoice failed: ${upErr?.message}`);

        // Replace lines (idempotent re-import).
        await supabaseAdmin.from("invoice_lines").delete().eq("invoice_id", invoice.id);
        const { error: lineErr } = await supabaseAdmin
          .from("invoice_lines")
          .insert(lineRows.map((l) => ({ ...l, invoice_id: invoice.id })));
        if (lineErr) throw new Error(`insert invoice_lines failed: ${lineErr.message}`);

        // Sync order to invoiced (best-effort; don't fail the row if it errors).
        try {
          await supabaseAdmin
            .from("orders")
            .update({
              status: "invoiced",
              invoice_number: order.invoice_number ?? invoiceNumber,
              invoice_date: invoiceDate,
            })
            .eq("id", order.id);
        } catch {
          /* non-fatal */
        }

        processed++;
      } catch (e) {
        failed++;
        errors.push({ reason: `invoice ${invoiceNumber}: ${e instanceof Error ? e.message : "unknown error"}` });
      }
    }

    await completeSyncLog(sync_log_id, "completed", processed, failed, errors);
  } catch (e) {
    await completeSyncLog(sync_log_id, "failed", processed, failed, [
      ...errors,
      { reason: e instanceof Error ? e.message : "Fatal import error" },
    ]);
    throw e;
  }

  return {
    sync_log_id,
    file_type: "invoices",
    records_processed: processed,
    records_failed: failed,
    error_details: errors,
    duration_ms: Date.now() - started,
  };
}
