import { NextRequest, NextResponse } from "next/server";
import { resolveDealerScope } from "@/lib/auth-guards";
import { listInvoices, type InvoiceStatus } from "@/lib/invoices/service";
import { serverError } from "@/lib/api-errors";

/**
 * GET /api/invoices — list invoices.
 *   Dealer: own only. Admin: all.
 * Query: ?status=pending&limit=100&offset=0
 */
export async function GET(req: NextRequest) {
  const scoped = await resolveDealerScope();
  if (scoped instanceof NextResponse) return scoped;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const limit = Math.min(Number(sp.get("limit")) || 100, 200);
  const offset = Number(sp.get("offset")) || 0;

  try {
    const result = await listInvoices({
      dealerScope: scoped.isAdmin ? null : scoped.scope,
      status: (status as InvoiceStatus) || undefined,
      limit,
      offset,
    });
    return NextResponse.json({
      data: result.data,
      meta: { total: result.total, limit: result.limit, offset: result.offset },
    });
  } catch (e) {
    return serverError(e, "invoices");
  }
}
