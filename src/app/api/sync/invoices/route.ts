import { NextRequest, NextResponse } from "next/server";
import { importInvoiceCsv } from "@/lib/sync/invoice-importer";
import { requireAdmin } from "@/lib/auth-guards";

/**
 * POST /api/sync/invoices — admin-only SAP invoice CSV import.
 *
 * Body: { file_name: string, csv_content: string }
 * Returns the SyncLog summary; 207 if some invoice groups failed.
 */
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const { file_name, csv_content } = body ?? {};
    if (!file_name || !csv_content) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "file_name and csv_content are required" } },
        { status: 400 }
      );
    }

    const result = await importInvoiceCsv({ file_name, csv_content });
    return NextResponse.json({ data: result }, { status: result.records_failed > 0 ? 207 : 200 });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Invoice sync failed" } },
      { status: 500 }
    );
  }
}
