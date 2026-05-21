import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canTransition } from "@/lib/rules/order-validation";

/**
 * POST /api/orders/[id]/review — admin approve/reject/partial approve
 * Body: { action: "approve"|"reject"|"partial_approve", reviewer_id, notes?, line_decisions?: { line_id, action, qty_confirmed? }[] }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { action, reviewer_id, notes, line_decisions } = body ?? {};

    if (!action || !reviewer_id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "action and reviewer_id are required" } },
        { status: 400 }
      );
    }

    if (!["approve", "reject", "partial_approve", "request_info"].includes(action)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid action" } },
        { status: 400 }
      );
    }

    // Fetch order
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

    // Determine new status
    let newStatus: string;
    switch (action) {
      case "approve":
        newStatus = "approved";
        break;
      case "reject":
        newStatus = "rejected";
        break;
      case "partial_approve":
        newStatus = "partial";
        break;
      default:
        newStatus = order.status; // request_info doesn't change status
    }

    if (newStatus !== order.status && !canTransition(order.status, newStatus)) {
      return NextResponse.json(
        { error: { code: "INVALID_TRANSITION", message: `Cannot transition from ${order.status} to ${newStatus}` } },
        { status: 400 }
      );
    }

    // Update order status
    const updateData: Record<string, unknown> = { status: newStatus };
    if (action === "approve" || action === "partial_approve") {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = reviewer_id;
    }
    if (action === "reject") {
      updateData.rejected_at = new Date().toISOString();
      updateData.rejected_by = reviewer_id;
      updateData.rejection_reason = notes ?? null;
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", id);

    if (updateError) throw updateError;

    // Handle line-level decisions for partial approve
    if (action === "partial_approve" && Array.isArray(line_decisions)) {
      for (const ld of line_decisions) {
        const lineUpdate: Record<string, unknown> = {};
        if (ld.action === "confirm") {
          lineUpdate.line_status = "confirmed";
          lineUpdate.quantity_confirmed = ld.qty_confirmed ?? 0;
        } else if (ld.action === "backorder") {
          lineUpdate.line_status = "backordered";
          lineUpdate.quantity_backordered = ld.qty_confirmed ?? 0;
        } else if (ld.action === "reject") {
          lineUpdate.line_status = "rejected";
        }
        if (Object.keys(lineUpdate).length > 0) {
          await supabaseAdmin
            .from("order_lines")
            .update(lineUpdate)
            .eq("id", ld.line_id);
        }
      }
    }

    // If full approve, confirm all lines
    if (action === "approve") {
      const { data: lines } = await supabaseAdmin
        .from("order_lines")
        .select("id, quantity_requested")
        .eq("order_id", id);
      if (lines) {
        for (const line of lines) {
          await supabaseAdmin
            .from("order_lines")
            .update({ line_status: "confirmed", quantity_confirmed: line.quantity_requested })
            .eq("id", line.id);
        }
      }
    }

    // Log approval action
    await supabaseAdmin.from("order_approvals").insert({
      order_id: id,
      reviewer_id,
      action,
      notes: notes ?? null,
    });

    // Timeline event
    const eventLabel = action === "approve" ? "Order approved"
      : action === "reject" ? "Order rejected"
      : action === "partial_approve" ? "Partially approved"
      : "Info requested";

    await supabaseAdmin.from("order_timeline").insert({
      order_id: id,
      event: eventLabel,
      status: newStatus,
      actor: reviewer_id,
      notes: notes ?? null,
    });

    return NextResponse.json({
      data: {
        order_id: id,
        order_number: order.order_number,
        previous_status: order.status,
        new_status: newStatus,
        action,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Unexpected error" } },
      { status: 500 }
    );
  }
}
