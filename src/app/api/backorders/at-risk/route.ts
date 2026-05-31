import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-guards";
import { listBackOrders } from "@/lib/backorders/service";
import { serverError } from "@/lib/api-errors";

/**
 * GET /api/backorders/at-risk — admin: back-orders past the slippage
 * threshold, sorted with the most-delayed first.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (admin instanceof NextResponse) return admin;

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get("limit")) || 100, 200);

  try {
    const result = await listBackOrders({ dealerScope: null, atRiskOnly: true, limit });
    // Most-delayed first for the admin action queue.
    const data = [...result.data].sort((a, b) => b.slippage_days - a.slippage_days);
    return NextResponse.json({ data, meta: { total: result.total } });
  } catch (e) {
    return serverError(e, "backorders/at-risk");
  }
}
