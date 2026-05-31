import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDealerSession } from "@/lib/auth-guards";
import {
  validateOrderSubmission,
  calculateEta,
} from "@/lib/rules/order-validation";
import {
  getCampaignDiscounts,
  pickWinningRule,
  applyDiscount,
} from "@/lib/rules/campaign-discount";

/**
 * GET /api/orders — list orders (dealer sees own, admin sees all)
 * Query: ?status=submitted&type=daily&q=ORD-&limit=50&offset=0&dealer_id=dlr-001
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const type = sp.get("type");
  const q = sp.get("q");
  const queryDealerId = sp.get("dealer_id");
  const limit = Math.min(Number(sp.get("limit")) || 50, 200);
  const offset = Number(sp.get("offset")) || 0;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    const userRole = user.user_metadata?.role;
    let dealerId: string | null = null;

    // Admin can view any dealer's orders (optional parameter)
    // Dealer can only view their own orders
    if (userRole === "admin" || userRole === "super_admin") {
      dealerId = queryDealerId; // May be null to view all
    } else if (userRole === "dealer" || userRole === "sub_dealer") {
      const dealerIdOrError = await requireDealerSession();
      if (dealerIdOrError instanceof NextResponse) {
        return dealerIdOrError;
      }
      dealerId = dealerIdOrError;
    } else {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    let query = supabaseAdmin
      .from("orders")
      .select("*, order_lines(*)", { count: "exact" })
      .order("submitted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dealerId) query = query.eq("dealer_id", dealerId);
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
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    const userRole = user.user_metadata?.role;
    let authenticatedDealerId: string | null = null;

    // Get authenticated dealer ID (dealers can only create for themselves)
    if (userRole === "dealer" || userRole === "sub_dealer") {
      const dealerIdOrError = await requireDealerSession();
      if (dealerIdOrError instanceof NextResponse) {
        return dealerIdOrError;
      }
      authenticatedDealerId = dealerIdOrError;
    }

    const body = await req.json();
    let { dealer_id, order_type, items, notes } = body ?? {};

    if (!dealer_id || !order_type || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "dealer_id, order_type, and items[] are required" } },
        { status: 400 }
      );
    }

    // Replace "self" with authenticated dealer ID
    if (dealer_id === "self") {
      if (!authenticatedDealerId) {
        return NextResponse.json(
          { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
          { status: 401 }
        );
      }
      dealer_id = authenticatedDealerId;
    }

    // Dealers can only create orders for themselves; admins can create for any dealer
    if (userRole !== "admin" && userRole !== "super_admin") {
      if (authenticatedDealerId !== dealer_id) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Cannot create order for another dealer" } },
          { status: 403 }
        );
      }
    } else {
      // Admin: validate dealer exists
      const { data: dealerExists } = await supabaseAdmin
        .from("dealers")
        .select("id")
        .eq("id", dealer_id)
        .single();

      if (!dealerExists) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid dealer_id" } },
          { status: 400 }
        );
      }
    }

    if (!["daily", "air_dhl", "stock"].includes(order_type)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "order_type must be daily, air_dhl, or stock" } },
        { status: 400 }
      );
    }

    // Calculate totals with campaign discounts (batched: one DB query for all items)
    let subtotal = 0;
    let totalDiscount = 0;

    const partNumbers = items.map((it: { part_number: string }) => it.part_number);
    const discountMap = await getCampaignDiscounts(dealer_id, partNumbers);

    const itemsWithDiscounts: Array<{
      quantity: number;
      unit_price: number;
      campaignId?: string;
      discountPct: number;
      discountedUnitPrice: number;
      totalDiscount: number;
      originalLineTotal: number;
      lineTotal: number;
    }> = [];

    for (const item of items) {
      const unitPrice = Number(item.unit_price);
      const candidates = discountMap.get(item.part_number) ?? null;
      const rule = pickWinningRule(candidates, unitPrice);
      const applied = applyDiscount(unitPrice, rule);

      const discountedUnitPrice = applied?.discountedUnitPrice ?? unitPrice;
      const discountPct = applied?.discountPct ?? 0;
      const originalLineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
      const lineTotal = Math.round(discountedUnitPrice * item.quantity * 100) / 100;
      const lineDiscount = Math.round((originalLineTotal - lineTotal) * 100) / 100;

      itemsWithDiscounts.push({
        quantity: item.quantity,
        unit_price: unitPrice,
        campaignId: rule?.campaignId,
        discountPct,
        discountedUnitPrice,
        totalDiscount: lineDiscount,
        originalLineTotal,
        lineTotal,
      });

      subtotal += lineTotal;
      totalDiscount += lineDiscount;
    }

    const vatAmount = Math.round(subtotal * 0.14);
    const totalAmount = subtotal + vatAmount;

    // Financial block check — get dealer financial data
    let creditLimit = 0;
    let overdueBalance = 0;
    let financialStatus = "active";
    let dealerCode: string = dealer_id; // Default to dealer_id (never null at this point)

    try {
      // Try to look up dealer by ID (UUID) first
      const { data: dealer } = await supabaseAdmin
        .from("dealers")
        .select("code, credit_limit, overdue_balance, financial_status")
        .eq("id", dealer_id)
        .maybeSingle();

      if (dealer) {
        // Only override dealerCode if dealer.code is a valid non-null string
        if (dealer.code) dealerCode = dealer.code;
        creditLimit = dealer.credit_limit ?? 0;
        overdueBalance = dealer.overdue_balance ?? 0;
        financialStatus = dealer.financial_status ?? "active";
      } else {
        // Try by code if not found by ID
        const { data: dealerByCode } = await supabaseAdmin
          .from("dealers")
          .select("code, credit_limit, overdue_balance, financial_status")
          .eq("code", dealer_id)
          .maybeSingle();

        if (dealerByCode) {
          if (dealerByCode.code) dealerCode = dealerByCode.code;
          creditLimit = dealerByCode.credit_limit ?? 0;
          overdueBalance = dealerByCode.overdue_balance ?? 0;
          financialStatus = dealerByCode.financial_status ?? "active";
        }
      }
    } catch {
      // Non-fatal: proceed with dealer_id as fallback
    }

    // Final safety check — dealerCode must be a non-empty string
    if (!dealerCode || typeof dealerCode !== "string") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: `Unable to resolve dealer identifier from "${dealer_id}"` } },
        { status: 400 }
      );
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
        dealer_id: dealerCode,
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

    // Insert order lines with discount info
    const lines = itemsWithDiscounts.map((itemDiscount, idx) => {
      const item = items[idx];
      return {
        order_id: order.id,
        part_number: item.part_number,
        part_name: item.part_name,
        part_name_ar: item.part_name_ar ?? null,
        quantity_requested: item.quantity,
        unit_price: item.unit_price,
        campaign_id: itemDiscount.campaignId ?? null,
        discount_pct: itemDiscount.discountPct,
        discounted_unit_price: itemDiscount.discountedUnitPrice,
        total_discount: itemDiscount.totalDiscount,
        original_line_total: itemDiscount.originalLineTotal,
        line_total: itemDiscount.lineTotal,
        currency: item.currency ?? "EGP",
        availability_at_order: item.availability_state ?? null,
      };
    });

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
          subtotal: subtotal + totalDiscount, // Original subtotal before discount
          total_discount: Math.round(totalDiscount * 100) / 100,
          subtotal_after_discount: subtotal,
          vat_amount: vatAmount,
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
