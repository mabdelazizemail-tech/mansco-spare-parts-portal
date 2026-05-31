import { NextRequest, NextResponse } from "next/server";
import { exportOrdersToSapCsv } from "@/lib/sync/orders-exporter";
import { requireAdmin } from "@/lib/auth-guards";

/**
 * POST /api/sync/orders-export — admin-only Portal→SAP orders export.
 *
 * Body: { preview?: boolean }
 *   preview=true  → generate the CSV without marking orders exported or
 *                   writing a SyncLog row (for a dry-run preview).
 *
 * Returns { data: { csv, file_name, orders_exported, lines_exported, ... } }.
 * The admin UI triggers a client-side download from the returned csv string.
 */
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  let preview = false;
  try {
    const body = await req.json();
    preview = body?.preview === true;
  } catch {
    // empty body → commit (non-preview) export
  }

  try {
    const result = await exportOrdersToSapCsv({ preview });
    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Orders export failed" } },
      { status: 500 }
    );
  }
}
