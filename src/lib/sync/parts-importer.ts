/**
 * SAP → Portal CSV Sync — Parts, Stock, and Pricing
 *
 * Expected CSV shapes:
 *
 *   stock-availability.csv
 *     part_number,quantity_available,quantity_atp,source_location,replenishment_eta
 *
 *   pricing.csv
 *     part_number,unit_price,currency,price_list_id,effective_from,effective_to,discount_pct
 *
 *   parts-catalog.csv
 *     part_number,name_en,name_ar,category_id,model,oem,image_url
 *
 * Each call produces a SyncLog row recording records_processed / records_failed.
 * Per-row failures are collected but don't abort the whole batch — they're
 * reported in error_details so SAP integrators can fix and resend.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

export type SyncResult = {
  sync_log_id: string;
  file_type: "stock" | "pricing" | "parts_catalog";
  records_processed: number;
  records_failed: number;
  error_details: { row: number; reason: string; data?: Record<string, unknown> }[];
  duration_ms: number;
};

type CsvRow = Record<string, string>;

async function startSyncLog(file_type: SyncResult["file_type"], file_name: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("sync_logs")
    .insert({
      sync_type: "import",
      file_type,
      file_name,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Failed to create sync log: ${error?.message}`);
  return data.id as string;
}

async function completeSyncLog(
  id: string,
  status: "completed" | "failed",
  records_processed: number,
  records_failed: number,
  error_details: SyncResult["error_details"]
) {
  await supabaseAdmin
    .from("sync_logs")
    .update({
      status,
      records_processed,
      records_failed,
      error_details: error_details.length > 0 ? error_details : null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
}

/**
 * Minimal RFC-4180-compatible CSV parser.
 * Handles quoted fields, escaped quotes (""), and embedded commas/newlines.
 * Adequate for the structured SAP exports we control; switch to papaparse
 * if dealing with messier upstream sources.
 */
function parseCsv(content: string): CsvRow[] {
  const text = content.replace(/^﻿/, ""); // strip BOM
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        // skip the second char of \r\n
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const out: CsvRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length === 1 && r[0] === "") continue; // skip empty lines
    const obj: CsvRow = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = (r[c] ?? "").trim();
    }
    out.push(obj);
  }
  return out;
}

// ── Stock import ─────────────────────────────────────────────────────────
export async function importStockCsv(opts: {
  file_name: string;
  csv_content: string;
}): Promise<SyncResult> {
  const started = Date.now();
  const sync_log_id = await startSyncLog("stock", opts.file_name);
  const errors: SyncResult["error_details"] = [];
  let processed = 0;
  let failed = 0;

  try {
    const rows = parseCsv(opts.csv_content);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.part_number) throw new Error("part_number is required");
        const qty = Number(r.quantity_available ?? 0);
        const atp = r.quantity_atp ? Number(r.quantity_atp) : qty;
        const eta = r.replenishment_eta?.trim() || null;

        if (Number.isNaN(qty)) throw new Error("quantity_available is not numeric");
        if (eta && Number.isNaN(Date.parse(eta))) throw new Error("replenishment_eta is not a valid date");

        const { error } = await supabaseAdmin.from("stock_availability").upsert(
          {
            part_number: r.part_number.trim(),
            quantity_available: qty,
            quantity_atp: atp,
            source_location: r.source_location?.trim() || null,
            replenishment_eta: eta,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "part_number" }
        );
        if (error) throw new Error(error.message);
        processed++;
      } catch (e) {
        failed++;
        errors.push({
          row: i + 2, // +2 = header row + 1-based row index
          reason: e instanceof Error ? e.message : "Unknown error",
          data: r,
        });
      }
    }
    await completeSyncLog(sync_log_id, "completed", processed, failed, errors);
  } catch (e) {
    await completeSyncLog(sync_log_id, "failed", processed, failed, [
      ...errors,
      { row: 0, reason: e instanceof Error ? e.message : "Fatal import error" },
    ]);
    throw e;
  }

  return {
    sync_log_id,
    file_type: "stock",
    records_processed: processed,
    records_failed: failed,
    error_details: errors,
    duration_ms: Date.now() - started,
  };
}

// ── Pricing import ───────────────────────────────────────────────────────
export async function importPricingCsv(opts: {
  file_name: string;
  csv_content: string;
}): Promise<SyncResult> {
  const started = Date.now();
  const sync_log_id = await startSyncLog("pricing", opts.file_name);
  const errors: SyncResult["error_details"] = [];
  let processed = 0;
  let failed = 0;

  try {
    const rows = parseCsv(opts.csv_content);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.part_number) throw new Error("part_number is required");
        const price = Number(r.unit_price);
        if (Number.isNaN(price) || price < 0) throw new Error("unit_price must be a non-negative number");

        const { error } = await supabaseAdmin.from("price_list_items").upsert(
          {
            part_number: r.part_number.trim(),
            unit_price: price,
            currency: (r.currency || "EGP").toUpperCase(),
            price_list_id: r.price_list_id?.trim() || null,
            effective_from: r.effective_from?.trim() || null,
            effective_to: r.effective_to?.trim() || null,
            discount_pct: r.discount_pct ? Number(r.discount_pct) : 0,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "part_number,price_list_id" }
        );
        if (error) throw new Error(error.message);
        processed++;
      } catch (e) {
        failed++;
        errors.push({
          row: i + 2,
          reason: e instanceof Error ? e.message : "Unknown error",
          data: r,
        });
      }
    }
    await completeSyncLog(sync_log_id, "completed", processed, failed, errors);
  } catch (e) {
    await completeSyncLog(sync_log_id, "failed", processed, failed, [
      ...errors,
      { row: 0, reason: e instanceof Error ? e.message : "Fatal import error" },
    ]);
    throw e;
  }

  return {
    sync_log_id,
    file_type: "pricing",
    records_processed: processed,
    records_failed: failed,
    error_details: errors,
    duration_ms: Date.now() - started,
  };
}

// ── Catalog import ───────────────────────────────────────────────────────
export async function importPartsCatalogCsv(opts: {
  file_name: string;
  csv_content: string;
}): Promise<SyncResult> {
  const started = Date.now();
  const sync_log_id = await startSyncLog("parts_catalog", opts.file_name);
  const errors: SyncResult["error_details"] = [];
  let processed = 0;
  let failed = 0;

  try {
    const rows = parseCsv(opts.csv_content);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.part_number) throw new Error("part_number is required");
        if (!r.name_en) throw new Error("name_en is required");

        const { error } = await supabaseAdmin.from("parts_catalog").upsert(
          {
            part_number: r.part_number.trim(),
            name_en: r.name_en.trim(),
            name_ar: r.name_ar?.trim() || null,
            category_id: r.category_id?.trim() || null,
            model: r.model?.trim() || null,
            oem: r.oem?.trim() || null,
            image_url: r.image_url?.trim() || null,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "part_number" }
        );
        if (error) throw new Error(error.message);
        processed++;
      } catch (e) {
        failed++;
        errors.push({
          row: i + 2,
          reason: e instanceof Error ? e.message : "Unknown error",
          data: r,
        });
      }
    }
    await completeSyncLog(sync_log_id, "completed", processed, failed, errors);
  } catch (e) {
    await completeSyncLog(sync_log_id, "failed", processed, failed, [
      ...errors,
      { row: 0, reason: e instanceof Error ? e.message : "Fatal import error" },
    ]);
    throw e;
  }

  return {
    sync_log_id,
    file_type: "parts_catalog",
    records_processed: processed,
    records_failed: failed,
    error_details: errors,
    duration_ms: Date.now() - started,
  };
}
