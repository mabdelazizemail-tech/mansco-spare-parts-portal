import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth-guards";

// GET /api/campaigns/[id]/performance – campaign performance analytics (admin only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  try {
    // Campaign info
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (campErr || !campaign) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    // Items with performance
    const { data: items } = await supabaseAdmin
      .from("campaign_items")
      .select("*")
      .eq("campaign_id", id)
      .order("total_orders", { ascending: false });

    // Orders for this campaign
    const { data: orders } = await supabaseAdmin
      .from("campaign_orders")
      .select("*")
      .eq("campaign_id", id);

    const orderList = orders ?? [];
    const itemList = items ?? [];

    // Compute aggregates
    const totalOrders = orderList.length;
    const totalQuantity = orderList.reduce((s, o) => s + (o.quantity || 0), 0);
    const totalDiscount = orderList.reduce((s, o) => s + (o.discount_applied || 0), 0);
    const uniqueDealers = new Set(orderList.map((o) => o.dealer_id)).size;
    const firstTimeBuyers = orderList.filter((o) => o.is_first_purchase).length;
    const repeatBuyers = totalOrders - firstTimeBuyers;

    // Dealer breakdown
    const dealerMap: Record<string, { dealer_id: string; orders: number; total_discount: number; total_qty: number }> = {};
    for (const o of orderList) {
      if (!dealerMap[o.dealer_id]) {
        dealerMap[o.dealer_id] = { dealer_id: o.dealer_id, orders: 0, total_discount: 0, total_qty: 0 };
      }
      dealerMap[o.dealer_id].orders++;
      dealerMap[o.dealer_id].total_discount += o.discount_applied || 0;
      dealerMap[o.dealer_id].total_qty += o.quantity || 0;
    }

    return NextResponse.json({
      data: {
        campaign,
        summary: {
          total_items: itemList.length,
          total_orders: totalOrders,
          total_quantity: totalQuantity,
          total_discount: totalDiscount,
          unique_dealers: uniqueDealers,
          first_time_buyers: firstTimeBuyers,
          repeat_buyers: repeatBuyers,
        },
        items: itemList,
        dealer_participation: Object.values(dealerMap).sort((a, b) => b.orders - a.orders),
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
