/**
 * Portal → SAP CSV Export — Orders
 *
 * Produces an orders-export.csv batch of approved/partial orders that have not
 * yet been sent to SAP, one row per order line. SAP ingests this to create the
 * fulfilment/delivery documents on its side.
 *
 * CSV shape (orders-export.csv) — PENDING MANSCO/SAP sign-off:
 *   order_number,dealer_code,order_type,submitted_at,part_number,
 *   quantity_confirmed,unit_price,line_total,currency,eta
 *
 * Each run writes a SyncLog row (sync_type=export, file_type=orders) and, unless
 * previewing, stamps orders.exported_to_sap_at so the same order isn't exported
 * twice.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { toCsv } from "./csv";

export interface OrdersExportResult {
  sync_log_id: string | null;
  file_name: string;
  orders_exported: number;
  lines_exported: number;
  csv: string;
  duration_ms: number;
}

interface ExportLineRow {
  order_number: string;
  dealer_code: string;
  order_type: string;
  submitted_at: string;
  part_number: string;
  quantity_confirmed: number;
  unit_price: number;
  line_total: number;
  currency: string;
  eta: string;
}

const EXPORT_COLUMNS: { header: string; key: keyof ExportLineRow }[] = [
  { header: "order_number", key: "order_number" },
  { header: "dealer_code", key: "dealer_code" },
  { header: "order_type", key: "order_type" },
  { header: "submitted_at", key: "submitted_at" },
  { header: "part_number", key: "part_number" },
  { header: "quantity_confirmed", key: "quantity_confirmed" },
  { header: "unit_price", key: "unit_price" },
  { header: "line_total", key: "line_total" },
  { header: "currency", key: "currency" },
  { header: "eta", key: "eta" },
];

/**
 * Build (and optionally commit) an orders export batch.
 *
 * @param opts.preview  When true, generate the CSV without marking orders
 *                      exported or writing a SyncLog row. Default false.
 */
export async function exportOrdersToSapCsv(
  opts: { preview?: boolean } = {}
): Promise<OrdersExportResult> {
  const started = Date.now();
  const preview = opts.preview ?? false;
  const fileName = `orders-export-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;

  // Export queue: approved/partial orders not yet sent to SAP.
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from("orders")
    .select(
      "id, order_number, dealer_id, order_type, submitted_at, currency, eta_calculated, status, order_lines(part_number, quantity_requested, quantity_confirmed, unit_price, discounted_unit_price, line_total, line_status)"
    )
    .is("exported_to_sap_at", null)
    .in("status", ["approved", "partial"])
    .order("submitted_at", { ascending: true });

  if (ordersError) throw new Error(`Failed to load export queue: ${ordersError.message}`);

  const rows: ExportLineRow[] = [];
  for (const o of orders ?? []) {
    const lines = (o.order_lines ?? []) as Array<{
      part_number: string;
      quantity_requested: number;
      quantity_confirmed: number;
      unit_price: number;
      discounted_unit_price: number | null;
      line_total: number;
      line_status: string;
    }>;
    for (const l of lines) {
      // Only export confirmed quantities — back-ordered/rejected lines aren't
      // dispatched. Fall back to requested when nothing was explicitly confirmed.
      const qty = l.quantity_confirmed > 0 ? l.quantity_confirmed : l.line_status === "confirmed" ? l.quantity_requested : 0;
      if (qty <= 0) continue;
      const unit = Number(l.discounted_unit_price ?? l.unit_price);
      rows.push({
        order_number: o.order_number,
        dealer_code: o.dealer_id,
        order_type: o.order_type,
        submitted_at: o.submitted_at,
        part_number: l.part_number,
        quantity_confirmed: qty,
        unit_price: unit,
        line_total: Math.round(unit * qty * 100) / 100,
        currency: o.currency ?? "EGP",
        eta: o.eta_calculated ?? "",
      });
    }
  }

  const csv = toCsv(rows, EXPORT_COLUMNS);
  const exportedOrderIds = (orders ?? [])
    .filter((o) => rows.some((r) => r.order_number === o.order_number))
    .map((o) => o.id);

  if (preview) {
    return {
      sync_log_id: null,
      file_name: fileName,
      orders_exported: exportedOrderIds.length,
      lines_exported: rows.length,
      csv,
      duration_ms: Date.now() - started,
    };
  }

  // Record the export in sync_logs.
  const { data: log, error: logError } = await supabaseAdmin
    .from("sync_logs")
    .insert({
      sync_type: "export",
      file_type: "orders",
      file_name: fileName,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (logError || !log) throw new Error(`Failed to create sync log: ${logError?.message}`);

  try {
    // Mark the orders exported so the next batch skips them.
    if (exportedOrderIds.length > 0) {
      const nowIso = new Date().toISOString();
      const { error: updError } = await supabaseAdmin
        .from("orders")
        .update({ exported_to_sap_at: nowIso })
        .in("id", exportedOrderIds);
      if (updError) throw new Error(updError.message);
    }

    await supabaseAdmin
      .from("sync_logs")
      .update({
        status: "completed",
        records_processed: exportedOrderIds.length,
        records_failed: 0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", log.id);
  } catch (e) {
    await supabaseAdmin
      .from("sync_logs")
      .update({
        status: "failed",
        records_processed: 0,
        error_details: [{ reason: e instanceof Error ? e.message : "Export commit failed" }],
        completed_at: new Date().toISOString(),
      })
      .eq("id", log.id);
    throw e;
  }

  return {
    sync_log_id: log.id as string,
    file_name: fileName,
    orders_exported: exportedOrderIds.length,
    lines_exported: rows.length,
    csv,
    duration_ms: Date.now() - started,
  };
}
