import { NextRequest, NextResponse } from "next/server";
import {
  importStockCsv,
  importPricingCsv,
  importPartsCatalogCsv,
} from "@/lib/sync/parts-importer";
import { requireAdmin } from "@/lib/auth-guards";

/**
 * POST /api/sync/parts
 *
 * Multipart or JSON body:
 *   { file_type: "stock" | "pricing" | "parts_catalog", file_name: string, csv_content: string }
 *
 * Admin-only. Triggers a CSV import and returns the SyncLog summary.
 * The importer creates a `sync_logs` row before processing so partial
 * progress is always observable.
 */
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const { file_type, file_name, csv_content } = body ?? {};

    if (!file_type || !file_name || !csv_content) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "file_type, file_name, and csv_content are required",
          },
        },
        { status: 400 }
      );
    }

    let result;
    switch (file_type) {
      case "stock":
        result = await importStockCsv({ file_name, csv_content });
        break;
      case "pricing":
        result = await importPricingCsv({ file_name, csv_content });
        break;
      case "parts_catalog":
        result = await importPartsCatalogCsv({ file_name, csv_content });
        break;
      default:
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: `Unknown file_type '${file_type}'. Expected: stock | pricing | parts_catalog`,
            },
          },
          { status: 400 }
        );
    }

    const failed = result.records_failed > 0;
    return NextResponse.json(
      { data: result },
      { status: failed ? 207 : 200 } // 207 Multi-Status if some rows failed
    );
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Sync failed" } },
      { status: 500 }
    );
  }
}
