import { NextRequest, NextResponse } from "next/server";
import { resolveDealerScope } from "@/lib/auth-guards";
import { getBackOrder } from "@/lib/backorders/service";
import { serverError } from "@/lib/api-errors";

/**
 * GET /api/backorders/[id] — back-order detail with ETA-change history.
 * Dealers may only read their own back-orders.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scoped = await resolveDealerScope();
  if (scoped instanceof NextResponse) return scoped;

  const { id } = await params;

  try {
    const backOrder = await getBackOrder(id);
    if (!backOrder) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Back-order not found" } },
        { status: 404 }
      );
    }

    if (!scoped.isAdmin && !(scoped.scope ?? []).includes(backOrder.dealer_id)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: backOrder });
  } catch (e) {
    return serverError(e, "backorders/[id]");
  }
}
