import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/orders/[id] — single order detail with lines, timeline, approvals
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Try by UUID first, then by order_number
    let query = supabaseAdmin
      .from("orders")
      .select("*, order_lines(*), order_timeline(*), order_approvals(*)")
      .order("created_at", { referencedTable: "order_timeline", ascending: true });

    // UUID pattern check
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      query = query.eq("id", id);
    } else {
      query = query.eq("order_number", id);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Order ${id} not found` } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Failed to fetch order" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/[id] — admin only, delete order and all related records
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !["admin", "super_admin"].includes(user.user_metadata?.role)) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if order exists
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let orderQuery = supabaseAdmin.from("orders").select("id");
    if (isUuid) {
      orderQuery = orderQuery.eq("id", id);
    } else {
      orderQuery = orderQuery.eq("order_number", id);
    }

    const { data: orderData, error: fetchError } = await orderQuery.maybeSingle();
    if (fetchError) throw fetchError;
    if (!orderData) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Order ${id} not found` } },
        { status: 404 }
      );
    }

    const orderId = orderData.id;

    // Delete related records first (foreign key constraints)
    await supabaseAdmin.from("order_approvals").delete().eq("order_id", orderId);
    await supabaseAdmin.from("order_timeline").delete().eq("order_id", orderId);
    await supabaseAdmin.from("order_lines").delete().eq("order_id", orderId);

    // Delete the order
    const { error: deleteError } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ data: { message: "Order deleted successfully" } });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Failed to delete order" } },
      { status: 500 }
    );
  }
}
