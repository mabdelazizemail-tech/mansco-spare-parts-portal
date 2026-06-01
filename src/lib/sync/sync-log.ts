// src/lib/sync/sync-log.ts
//
// Shared SyncLog helpers for the SAP sync engine. Every import/export writes a
// sync_logs row (running → completed/failed) so partial progress is observable.

import { supabaseAdmin } from "@/lib/supabase/admin";

export type SyncFileType = "stock" | "pricing" | "parts_catalog" | "orders" | "invoices";
export type RowError = { row?: number; reason: string; data?: Record<string, unknown> };

export async function startSyncLog(
  sync_type: "import" | "export",
  file_type: SyncFileType,
  file_name: string
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("sync_logs")
    .insert({ sync_type, file_type, file_name, status: "running", started_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Failed to create sync log: ${error?.message}`);
  return data.id as string;
}

export async function completeSyncLog(
  id: string,
  status: "completed" | "failed",
  records_processed: number,
  records_failed: number,
  error_details: RowError[]
): Promise<void> {
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
