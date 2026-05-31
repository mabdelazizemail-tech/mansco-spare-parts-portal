import { NextRequest, NextResponse } from "next/server";
import { resolveDealerScope } from "@/lib/auth-guards";
import { listBackOrders, type BackOrderStatus } from "@/lib/backorders/service";
import { serverError } from "@/lib/api-errors";

/**
 * GET /api/backorders — list back-orders.
 *   Dealer: own only. Admin: all (optional ?dealer_id is not needed; use scope).
 * Query: ?status=awaiting&at_risk=1&limit=100&offset=0
 */
export async function GET(req: NextRequest) {
  const scoped = await resolveDealerScope();
  if (scoped instanceof NextResponse) return scoped;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const atRisk = sp.get("at_risk");
  const limit = Math.min(Number(sp.get("limit")) || 100, 200);
  const offset = Number(sp.get("offset")) || 0;

  try {
    const result = await listBackOrders({
      dealerScope: scoped.isAdmin ? null : scoped.scope,
      status: (status as BackOrderStatus) || undefined,
      atRiskOnly: atRisk === "1" || atRisk === "true",
      limit,
      offset,
    });
    return NextResponse.json({
      data: result.data,
      meta: { total: result.total, limit: result.limit, offset: result.offset },
    });
  } catch (e) {
    return serverError(e, "backorders");
  }
}
