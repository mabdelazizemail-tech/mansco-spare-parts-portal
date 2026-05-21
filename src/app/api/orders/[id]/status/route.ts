import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canTransition } from "@/lib/rules/order-validation";

/**
 * PATCH /api/orders/[id]/status — update order status (lifecycle transitions)
 * Body: { status, actor?, notes?, tracking_number?, carrier?, invoice_number? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { status: newStatus, actor, notes, tracking_number, carrier, invoice_number } = body ?? {};

    if (!newStatus) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "status is required" } },
        { status: 400 }
      );
    }

    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!order) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Order not found" } },
        { status: 404 }
      );
    }

    if (!canTransition(order.status, newStatus)) {
      return NextResponse.json(
        { error: { code: "INVALID_TRANSITION", message: `Cannot transition from ${order.status} to ${newStatus}` } },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (tracking_number) updateData.tracking_number = tracking_number;
    if (carrier) updateData.carrier = carrier;
    if (invoice_number) updateData.invoice_number = invoice_number;

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", id);

    if (updateError) throw updateError;

    // Timeline
    await supabaseAdmin.from("order_timeline").insert({
      order_id: id,
      event: `Status changed to ${newStatus}`,
      status: newStatus,
      actor: actor ?? "system",
      notes: notes ?? null,
    });

    return NextResponse.json({
      data: { order_id: id, previous_status: order.status, new_status: newStatus },
    });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Unexpected error" } },
      { status: 500 }
    );
  }
}
