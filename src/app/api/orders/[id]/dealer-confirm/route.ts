import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDealerSession } from "@/lib/auth-guards";
import { canTransition } from "@/lib/rules/order-validation";

/**
 * POST /api/orders/[id]/dealer-confirm
 *
 * Dealer endpoint for confirming or rejecting admin's proposed edits.
 * Only callable while the order is in `pending_dealer_confirmation` state.
 *
 * Body: { action: "accept" | "reject", notes?: string }
 *
 *   accept → order status: approved, all lines marked confirmed at their
 *            already-stored proposed quantity (quantity_confirmed).
 *   reject → order status: cancelled (terminal). Dealer must resubmit a
 *            new order if they want to renegotiate.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    // 1. Auth — dealer or sub_dealer only
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 },
      );
    }

    const role = user.user_metadata?.role;
    if (role !== "dealer" && role !== "sub_dealer") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Dealer access required" } },
        { status: 403 },
      );
    }

    const dealerIdOrError = await requireDealerSession();
    if (dealerIdOrError instanceof NextResponse) {
      return dealerIdOrError;
    }
    const dealerId = dealerIdOrError;

    // 2. Parse body
    const body = await req.json();
    const { action, notes } = body ?? {};

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "action must be 'accept' or 'reject'" } },
        { status: 400 },
      );
    }

    // 3. Fetch order — confirm ownership + state
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status, dealer_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!order) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Order not found" } },
        { status: 404 },
      );
    }

    // Dealer must own this order
    if (order.dealer_id !== dealerId) {
      // Try comparing by code as well (dealer_id column may store the code)
      const { data: byCode } = await supabaseAdmin
        .from("dealers")
        .select("code")
        .eq("id", dealerId)
        .maybeSingle();
      if (!byCode || byCode.code !== order.dealer_id) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "You can only confirm your own orders" } },
          { status: 403 },
        );
      }
    }

    if (order.status !== "pending_dealer_confirmation") {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_STATE",
            message: `Order is in ${order.status}, not pending_dealer_confirmation`,
          },
        },
        { status: 400 },
      );
    }

    const newStatus = action === "accept" ? "approved" : "cancelled";

    if (!canTransition(order.status, newStatus)) {
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

    // 4. Update order
    const updateData: Record<string, unknown> = { status: newStatus };
    if (action === "accept") {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = dealerId;
    } else {
      updateData.rejected_at = new Date().toISOString();
      updateData.rejected_by = dealerId;
      updateData.rejection_reason = notes ?? "Dealer rejected admin's proposed edits";
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", id);

    if (updateError) throw updateError;

    // 5. Update line statuses
    if (action === "accept") {
      // Mark all lines as confirmed — quantity_confirmed already holds the
      // admin's proposed quantity (set during propose_edits)
      await supabaseAdmin
        .from("order_lines")
        .update({ line_status: "confirmed" })
        .eq("order_id", id);
    } else {
      // Cancelled — mark all lines as cancelled
      await supabaseAdmin
        .from("order_lines")
        .update({ line_status: "cancelled" })
        .eq("order_id", id);
    }

    // 6. Log in order_approvals
    await supabaseAdmin.from("order_approvals").insert({
      order_id: id,
      reviewer_id: dealerId,
      action: action === "accept" ? "dealer_accept" : "dealer_reject",
      notes: notes ?? null,
    });

    // 7. Timeline
    const eventLabel =
      action === "accept"
        ? "Dealer accepted proposed edits — order approved"
        : "Dealer rejected proposed edits — order cancelled";

    await supabaseAdmin.from("order_timeline").insert({
      order_id: id,
      event: eventLabel,
      status: newStatus,
      actor: dealerId,
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
