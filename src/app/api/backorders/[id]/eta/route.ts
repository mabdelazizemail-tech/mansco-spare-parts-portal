import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-guards";
import { updateBackOrderEta } from "@/lib/backorders/service";
import { serverError } from "@/lib/api-errors";

/**
 * PUT /api/backorders/[id]/eta — admin manual ETA override.
 * Body: { current_eta: string | null, reason?: string }
 * Recomputes slippage / at-risk and records an ETA-change history entry.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  try {
    const body = await req.json();
    const newEta: string | null = body?.current_eta ?? null;
    const reason: string | null = body?.reason ?? null;

    if (newEta !== null && Number.isNaN(new Date(newEta).getTime())) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "current_eta must be a valid date or null" } },
        { status: 400 }
      );
    }

    const updated = await updateBackOrderEta(id, newEta, reason, "manual");
    return NextResponse.json({ data: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update ETA";
    if (message.includes("not found")) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message } }, { status: 404 });
    }
    if (message.startsWith("Cannot change ETA")) {
      return NextResponse.json({ error: { code: "INVALID_STATE", message } }, { status: 400 });
    }
    return serverError(e, "backorders/[id]/eta");
  }
}
