import { NextRequest, NextResponse } from "next/server";
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
