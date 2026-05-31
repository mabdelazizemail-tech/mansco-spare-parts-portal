import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-guards";
import { cancelBackOrder } from "@/lib/backorders/service";
import { serverError } from "@/lib/api-errors";

/**
 * POST /api/backorders/[id]/cancel — admin cancels a back-order line.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  try {
    const updated = await cancelBackOrder(id);
    return NextResponse.json({ data: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to cancel back-order";
    if (message.includes("not found")) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message } }, { status: 404 });
    }
    if (message.startsWith("Cannot cancel")) {
      return NextResponse.json({ error: { code: "INVALID_STATE", message } }, { status: 400 });
    }
    return serverError(e, "backorders/[id]/cancel");
  }
}
