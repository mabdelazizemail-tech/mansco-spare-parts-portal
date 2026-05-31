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

  // Apply the same scope + filters to any query builder so the page query and
  // the summary count queries stay in sync.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyScope = (query: any): any => {
    let q2 = query;
    if (scoped.isAdmin) {
      if (dealerId) q2 = q2.eq("dealer_id", dealerId);
    } else {
      q2 = q2.in("dealer_id", scoped.scope ?? []);
    }
    if (type && type !== "all") q2 = q2.eq("inquiry_type", type);
    if (q) q2 = q2.ilike("part_number", `%${q}%`);
    if (dateFrom) q2 = q2.gte("created_at", dateFrom);
    if (dateTo) q2 = q2.lte("created_at", dateTo);
    return q2;
  };

  try {
    const listQuery = applyScope(
      supabaseAdmin
        .from("inquiries")
        .select(
          "id, dealer_id, part_number, quantity, inquiry_type, availability_at_inquiry, converted_to_order_id, created_at",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)
    );

    // Exact summary counts over the whole filtered set (not just this page).
    const searchQuery = applyScope(
      supabaseAdmin.from("inquiries").select("id", { count: "exact", head: true }).eq("inquiry_type", "search")
    );
    const orderAttemptQuery = applyScope(
      supabaseAdmin.from("inquiries").select("id", { count: "exact", head: true }).eq("inquiry_type", "order_attempt")
    );
    const convertedQuery = applyScope(
      supabaseAdmin.from("inquiries").select("id", { count: "exact", head: true }).not("converted_to_order_id", "is", null)
    );

    const [listRes, searchRes, orderAttemptRes, convertedRes] = await Promise.all([
      listQuery,
      searchQuery,
      orderAttemptQuery,
      convertedQuery,
    ]);

    if (listRes.error) throw listRes.error;

    const summary = {
      total: listRes.count ?? 0,
      search: searchRes.count ?? 0,
      order_attempt: orderAttemptRes.count ?? 0,
      converted: convertedRes.count ?? 0,
    };

    return NextResponse.json({
      data: listRes.data ?? [],
      meta: { total: listRes.count ?? 0, limit, offset, summary },
    });
  } catch (e) {
    return serverError(e, "inquiries");
  }
}
