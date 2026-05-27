import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canTransition } from "@/lib/rules/order-validation";

/**
 * POST /api/orders/[id]/review — admin actions on an order under review.
 *
 * Supported actions:
 *   - approve         → status: approved (legacy path; skips dealer confirmation)
 *   - reject          → status: rejected (terminal)
 *   - partial_approve → status: partial (line-level confirm/backorder/reject)
 *   - propose_edits   → status: pending_dealer_confirmation
 *                       (admin edits per-line qty, dealer must confirm)
 *   - request_info    → status unchanged, logged for the timeline
 *
 * Body shape:
 *   {
 *     action: <see above>,
 *     reviewer_id: string,
 *     notes?: string,
 *     line_decisions?: [...]    // partial_approve only
 *     line_proposals?: [        // propose_edits only
 *       { line_id: string, quantity_proposed: number }
 *     ]
 *   }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { action, reviewer_id, notes, line_decisions, line_proposals } = body ?? {};

    if (!action || !reviewer_id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "action and reviewer_id are required" } },
        { status: 400 },
      );
    }

    const validActions = ["approve", "reject", "partial_approve", "propose_edits", "request_info"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: `Invalid action. Must be one of: ${validActions.join(", ")}` } },
        { status: 400 },
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
        { status: 404 },
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
      case "propose_edits":
        newStatus = "pending_dealer_confirmation";
        break;
      default: // request_info
        newStatus = order.status;
    }

    if (newStatus !== order.status && !canTransition(order.status, newStatus)) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_TRANSITION",
            message: `Cannot transition from ${order.status} to ${newStatus}`,
          },
        },
        { status: 400 },
      );
    }

    // Validate propose_edits body shape
    if (action === "propose_edits") {
      if (!Array.isArray(line_proposals) || line_proposals.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "propose_edits requires line_proposals: [{ line_id, quantity_proposed }]",
            },
          },
          { status: 400 },
        );
      }
      for (const lp of line_proposals) {
        if (!lp.line_id || typeof lp.quantity_proposed !== "number" || lp.quantity_proposed < 0) {
          return NextResponse.json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message: "Each line_proposal needs a line_id and a non-negative quantity_proposed",
              },
            },
            { status: 400 },
          );
        }
      }
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

    // Apply propose_edits — write each proposed qty into the existing
    // quantity_confirmed column. Once the dealer accepts, that value is
    // already the agreed quantity; if they reject, the order is cancelled
    // and the value doesn't matter.
    if (action === "propose_edits" && Array.isArray(line_proposals)) {
      for (const lp of line_proposals) {
        await supabaseAdmin
          .from("order_lines")
          .update({
            quantity_confirmed: lp.quantity_proposed,
            line_status: "pending_dealer_confirmation",
          })
          .eq("id", lp.line_id);
      }
    }

    // partial_approve line decisions (unchanged behaviour)
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

    // Full approve → confirm all lines at requested qty
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

    // Log the approval action
    await supabaseAdmin.from("order_approvals").insert({
      order_id: id,
      reviewer_id,
      action,
      notes: notes ?? null,
    });

    // Timeline event
    const eventLabel =
      action === "approve" ? "Order approved"
      : action === "reject" ? "Order rejected"
      : action === "partial_approve" ? "Partially approved"
      : action === "propose_edits" ? "Edits proposed — awaiting dealer confirmation"
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
      {
        error: {
          code: "SERVER_ERROR",
          message: e instanceof Error ? e.message : "Unexpected error",
        },
      },
      { status: 500 },
    );
  }
}
