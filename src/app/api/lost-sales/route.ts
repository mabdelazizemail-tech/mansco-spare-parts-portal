import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, resolveDealerScope } from "@/lib/auth-guards";
import { serverError } from "@/lib/api-errors";

/**
 * GET /api/lost-sales — list lost-sale records (demand-planning report).
 *   Dealer: own only. Admin: all (optionally narrowed by ?dealer_id).
 * Query: ?reason=out_of_stock&dealer_id=&date_from=&date_to=&limit=200&offset=0
 *
 * Estimated value per row is derived best-effort from the standard price list
 * (lost_sales has no stored value column), so the report can surface lost
 * revenue. Powers the admin Lost Sales Report (Module 8).
 */
export async function GET(req: NextRequest) {
  const scoped = await resolveDealerScope();
  if (scoped instanceof NextResponse) return scoped;

  const sp = req.nextUrl.searchParams;
  const reason = sp.get("reason");
  const dealerId = sp.get("dealer_id");
  const dateFrom = sp.get("date_from");
  const dateTo = sp.get("date_to");
  const limit = Math.min(Number(sp.get("limit")) || 200, 500);
  const offset = Number(sp.get("offset")) || 0;

  try {
    let query = supabaseAdmin
      .from("lost_sales")
      .select("id, inquiry_id, dealer_id, part_number, quantity, reason, eta_if_available, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (scoped.isAdmin) {
      if (dealerId) query = query.eq("dealer_id", dealerId);
    } else {
      query = query.in("dealer_id", scoped.scope ?? []);
    }
    if (reason && reason !== "all") query = query.eq("reason", reason);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo);

    const { data, count, error } = await query;
    if (error) throw error;

    const rows = data ?? [];

    // Best-effort: price the lost quantity from the standard price list.
    const partNumbers = [...new Set(rows.map((r) => r.part_number))];
    const priceMap = new Map<string, number>();
    if (partNumbers.length > 0) {
      const { data: prices } = await supabaseAdmin
        .from("price_list_items")
        .select("part_number, unit_price")
        .in("part_number", partNumbers);
      for (const p of prices ?? []) {
        if (!priceMap.has(p.part_number)) priceMap.set(p.part_number, Number(p.unit_price));
      }
    }

    const enriched = rows.map((r) => {
      const unit = priceMap.get(r.part_number) ?? 0;
      return { ...r, estimated_value: Math.round(unit * r.quantity * 100) / 100 };
    });

    const summary = {
      total: count ?? enriched.length,
      estimated_lost_revenue: Math.round(enriched.reduce((s, r) => s + r.estimated_value, 0) * 100) / 100,
      dealers_reporting: new Set(enriched.map((r) => r.dealer_id)).size,
    };

    return NextResponse.json({ data: enriched, meta: { total: count ?? 0, limit, offset, summary } });
  } catch (e) {
    return serverError(e, "lost-sales");
  }
}

/**
 * POST /api/lost-sales — admin-only endpoint to submit a lost sale directly
 *
 * Body:
 *   {
 *     dealer_id: string,
 *     part_number: string,
 *     quantity: number,
 *     reason: string,
 *     customer_name?: string,
 *     estimated_value?: number
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminOrError = await requireAdmin();
    if (adminOrError) return adminOrError;

    const body = await req.json();
    const { dealer_id, part_number, quantity, reason, customer_name, estimated_value } = body ?? {};

    // Validate required fields
    if (!dealer_id || !part_number || !quantity || !reason) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "dealer_id, part_number, quantity, and reason are required",
          },
        },
        { status: 400 }
      );
    }

    // Verify dealer exists
    const { data: dealer, error: dealerError } = await supabaseAdmin
      .from("dealers")
      .select("id")
      .eq("id", dealer_id)
      .single();

    if (dealerError || !dealer) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Dealer not found" } },
        { status: 400 }
      );
    }

    // Verify part exists
    const { data: part, error: partError } = await supabaseAdmin
      .from("parts_catalog")
      .select("part_number")
      .eq("part_number", part_number)
      .single();

    if (partError || !part) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Part not found" } },
        { status: 400 }
      );
    }

    // Insert lost sale record
    const { data: lostSale, error: lostSaleError } = await supabaseAdmin
      .from("lost_sales")
      .insert({
        dealer_id,
        part_number,
        quantity: Math.max(1, parseInt(quantity) || 1),
        reason,
        customer_name: customer_name || null,
        estimated_value: estimated_value ? parseFloat(estimated_value) : null,
        inquiry_id: null, // Direct submission, not from inquiry
      })
      .select("id, dealer_id, part_number, quantity, reason, customer_name, estimated_value, created_at")
      .single();

    if (lostSaleError) {
      return NextResponse.json(
        {
          error: {
            code: "DB_ERROR",
            message: lostSaleError.message,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: lostSale.id,
          dealer_id: lostSale.dealer_id,
          part_number: lostSale.part_number,
          quantity: lostSale.quantity,
          reason: lostSale.reason,
          customer_name: lostSale.customer_name,
          estimated_value: lostSale.estimated_value,
          created_at: lostSale.created_at,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: e instanceof Error ? e.message : "Unexpected error",
        },
      },
      { status: 500 }
    );
  }
}
