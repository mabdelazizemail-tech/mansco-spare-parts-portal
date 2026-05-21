import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  validateOrderSubmission,
  calculateEta,
} from "@/lib/rules/order-validation";

/**
 * GET /api/orders — list orders (dealer sees own, admin sees all)
 * Query: ?status=submitted&type=daily&q=ORD-&limit=50&offset=0&dealer_id=dlr-001
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const type = sp.get("type");
  const q = sp.get("q");
  const dealerId = sp.get("dealer_id");
  const limit = Math.min(Number(sp.get("limit")) || 50, 200);
  const offset = Number(sp.get("offset")) || 0;
  // admin_view flag: when true, return all orders (for admin pages)
  const adminView = sp.get("admin_view") === "true";

  try {
    let query = supabaseAdmin
      .from("orders")
      .select("*, order_lines(*)", { count: "exact" })
      .order("submitted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dealerId && !adminView) query = query.eq("dealer_id", dealerId);
    if (status && status !== "all") query = query.eq("status", status);
    if (type && type !== "all") query = query.eq("order_type", type);
    if (q) query = query.ilike("order_number", `%${q}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      data: data ?? [],
      meta: { total: count ?? 0, limit, offset },
    });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Failed to fetch orders" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders — submit a new order
 * Body: { dealer_id, order_type, items: [{ part_number, part_name, part_name_ar?, quantity, unit_price, currency?, availability_state? }], notes? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dealer_id, order_type, items, notes } = body ?? {};

    if (!dealer_id || !order_type || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "dealer_id, order_type, and items[] are required" } },
        { status: 400 }
      );
    }

    if (!["daily", "air_dhl", "stock"].includes(order_type)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "order_type must be daily, air_dhl, or stock" } },
        { status: 400 }
      );
    }

    // Calculate totals
    const subtotal = items.reduce(
      (s: number, i: { quantity: number; unit_price: number }) => s + i.quantity * i.unit_price,
      0
    );
    const vatAmount = Math.round(subtotal * 0.14);
    const totalAmount = subtotal + vatAmount;

    // Financial block check — get dealer financial data
    let creditLimit = 0;
    let overdueBalance = 0;
    let financialStatus = "active";

    try {
      const { data: dealer } = await supabaseAdmin
        .from("dealers")
        .select("credit_limit, overdue_balance, financial_status")
        .eq("id", dealer_id)
        .maybeSingle();
      if (dealer) {
        creditLimit = dealer.credit_limit ?? 0;
        overdueBalance = dealer.overdue_balance ?? 0;
        financialStatus = dealer.financial_status ?? "active";
      }
    } catch {
      // Non-fatal: proceed without financial data (demo mode)
    }

    const validation = validateOrderSubmission({
      orderTotal: totalAmount,
      financial: {
        creditLimit,
        overdueBalance,
        financialStatus,
        orderTotal: totalAmount,
      },
    });

    // Generate order number
    const orderNum = `ORD-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

    // Calculate ETA
    const etaDate = calculateEta(order_type);

    // Insert order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNum,
        dealer_id,
        order_type,
        status: validation.initialStatus,
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        notes: notes ?? null,
        credit_limit_at_order: creditLimit,
        overdue_balance_at_order: overdueBalance,
        financial_block: validation.financialBlock,
        financial_block_reason: validation.reasons.length > 0 ? validation.reasons.join("; ") : null,
        eta_calculated: etaDate,
      })
      .select("id, order_number, status")
      .single();

    if (orderError) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: orderError.message } },
        { status: 500 }
      );
    }

    // Insert order lines
    const lines = items.map((item: {
      part_number: string;
      part_name: string;
      part_name_ar?: string;
      quantity: number;
      unit_price: number;
      currency?: string;
      availability_state?: string;
    }) => ({
      order_id: order.id,
      part_number: item.part_number,
      part_name: item.part_name,
      part_name_ar: item.part_name_ar ?? null,
      quantity_requested: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price,
      currency: item.currency ?? "EGP",
      availability_at_order: item.availability_state ?? null,
    }));

    const { error: linesError } = await supabaseAdmin
      .from("order_lines")
      .insert(lines);

    if (linesError) {
      // Rollback order on line insertion failure
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: linesError.message } },
        { status: 500 }
      );
    }

    // Insert timeline event
    try {
      await supabaseAdmin.from("order_timeline").insert({
        order_id: order.id,
        event: "Order submitted",
        status: validation.initialStatus,
        actor: dealer_id,
        notes: validation.reasons.length > 0
          ? `Routed to review: ${validation.reasons.join("; ")}`
          : null,
      });
    } catch {} // non-fatal

    return NextResponse.json(
      {
        data: {
          order_id: order.id,
          order_number: order.order_number,
          status: order.status,
          needs_review: validation.needsReview,
          financial_block: validation.financialBlock,
          review_reasons: validation.reasons,
          eta: etaDate,
          total_amount: totalAmount,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Unexpected error" } },
      { status: 500 }
    );
  }
}
