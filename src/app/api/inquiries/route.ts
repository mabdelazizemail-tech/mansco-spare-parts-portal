import { NextRequest, NextResponse } from "next/server";
import { resolveDealerScope } from "@/lib/auth-guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { serverError } from "@/lib/api-errors";

/**
 * GET /api/inquiries — list inquiries (search / order-attempt log).
 *   Dealer: own only. Admin: all (optionally narrowed by ?dealer_id).
 * Query: ?type=search&dealer_id=&date_from=&date_to=&q=PART&limit=200&offset=0
 *
 * Powers the dealer Inquiry Log and the admin Inquiry Report (Module 8).
 */
export async function GET(req: NextRequest) {
  const scoped = await resolveDealerScope();
  if (scoped instanceof NextResponse) return scoped;

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  const dealerId = sp.get("dealer_id");
  const dateFrom = sp.get("date_from");
  const dateTo = sp.get("date_to");
  const q = sp.get("q");
  const limit = Math.min(Number(sp.get("limit")) || 200, 500);
  const offset = Number(sp.get("offset")) || 0;

  try {
    let query = supabaseAdmin
      .from("inquiries")
      .select("id, dealer_id, part_number, quantity, inquiry_type, availability_at_inquiry, converted_to_order_id, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (scoped.isAdmin) {
      if (dealerId) query = query.eq("dealer_id", dealerId);
    } else {
      query = query.in("dealer_id", scoped.scope ?? []);
    }
    if (type && type !== "all") query = query.eq("inquiry_type", type);
    if (q) query = query.ilike("part_number", `%${q}%`);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo);

    const { data, count, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const summary = {
      total: count ?? rows.length,
      search: rows.filter((r) => r.inquiry_type === "search").length,
      order_attempt: rows.filter((r) => r.inquiry_type === "order_attempt").length,
      converted: rows.filter((r) => !!r.converted_to_order_id).length,
    };

    return NextResponse.json({ data: rows, meta: { total: count ?? 0, limit, offset, summary } });
  } catch (e) {
    return serverError(e, "inquiries");
  }
}
