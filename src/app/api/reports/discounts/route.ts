import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/reports/discounts — admin-only aggregated discount analytics
 *
 * Query params:
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD     date range filter (defaults to last 90 days)
 *   ?campaign_id=<uuid>                filter by single campaign
 *
 * Returns:
 *   summary:
 *     total_discount_given         total EGP discounted across the range
 *     total_orders_with_discount   distinct orders that received at least one discounted line
 *     total_lines_with_discount    discounted order lines count
 *     total_qty_discounted         sum of line quantities on discounted lines
 *     avg_discount_per_order       avg discount EGP / discounted order
 *     adoption_rate                discounted orders / total orders in range (0..1)
 *
 *   by_campaign[]: per-campaign aggregates (campaign name, status, totals, top parts)
 *   by_part[]: per-part aggregates (top discounted parts)
 *   by_dealer[]: per-dealer participation (top dealers using campaigns)
 *   trend[]: daily series (date, discount_given, orders, lines)
 */
export async function GET(req: NextRequest) {
  try {
    // ── Auth: admin only ─────────────────────────────────────────────
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role;
    if (!user || (role !== "admin" && role !== "super_admin")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
      );
    }

    // ── Parse params ─────────────────────────────────────────────────
    const sp = req.nextUrl.searchParams;
    const campaignId = sp.get("campaign_id");

    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 90);

    const fromStr = sp.get("from") ?? defaultFrom.toISOString().slice(0, 10);
    const toStr = sp.get("to") ?? now.toISOString().slice(0, 10);

    // Inclusive 'to' — push end of day
    const fromIso = new Date(`${fromStr}T00:00:00Z`).toISOString();
    const toIso = new Date(`${toStr}T23:59:59Z`).toISOString();

    // ── Pull orders + lines in range ─────────────────────────────────
    // We join through orders to filter by submitted_at and exclude rejected orders.
    let ordersQuery = supabaseAdmin
      .from("orders")
      .select(
        `id, dealer_id, order_number, submitted_at, status, total_amount,
         order_lines (
           id, part_number, part_name, quantity_requested, unit_price,
           campaign_id, discount_pct, discounted_unit_price, total_discount, original_line_total, line_total
         )`
      )
      .gte("submitted_at", fromIso)
      .lte("submitted_at", toIso)
      .neq("status", "rejected")
      .neq("status", "cancelled");

    const { data: orders, error: ordersError } = await ordersQuery;
    if (ordersError) throw ordersError;

    const orderList = orders ?? [];

    // ── Pull campaigns for name/status enrichment ────────────────────
    const { data: campaigns } = await supabaseAdmin
      .from("campaigns")
      .select("id, name, status, campaign_type, start_date, end_date");

    const campaignById = new Map<string, {
      id: string;
      name: string;
      status: string;
      campaign_type: string;
      start_date: string | null;
      end_date: string | null;
    }>();
    for (const c of campaigns ?? []) {
      campaignById.set(c.id, c);
    }

    // ── Pull dealers for name resolution ─────────────────────────────
    const { data: dealers } = await supabaseAdmin
      .from("dealers")
      .select("id, code, company_name");

    const dealerNameById = new Map<string, string>();
    for (const d of dealers ?? []) {
      if (d.id) dealerNameById.set(d.id, d.company_name);
      if (d.code) dealerNameById.set(d.code, d.company_name);
    }

    // ── Aggregate ────────────────────────────────────────────────────
    let totalDiscountGiven = 0;
    let totalQtyDiscounted = 0;
    let totalLinesWithDiscount = 0;
    const ordersWithDiscount = new Set<string>();

    const byCampaign = new Map<
      string,
      {
        campaign_id: string;
        campaign_name: string;
        campaign_status: string;
        total_discount: number;
        total_orders: number;
        total_lines: number;
        total_qty: number;
        unique_dealers: Set<string>;
      }
    >();

    const byPart = new Map<
      string,
      {
        part_number: string;
        part_name: string;
        total_discount: number;
        total_qty: number;
        total_lines: number;
        unique_orders: Set<string>;
      }
    >();

    const byDealer = new Map<
      string,
      {
        dealer_id: string;
        dealer_name: string;
        total_discount: number;
        total_orders: Set<string>;
        total_lines: number;
        total_qty: number;
      }
    >();

    const trendMap = new Map<
      string,
      { date: string; discount_given: number; orders: Set<string>; lines: number }
    >();

    for (const order of orderList) {
      const lines = order.order_lines ?? [];
      const dateKey = (order.submitted_at as string).slice(0, 10);

      let orderHadDiscount = false;

      for (const line of lines) {
        const lineDiscount = Number(line.total_discount ?? 0);
        if (!line.campaign_id || lineDiscount <= 0) continue;

        // Optional campaign filter
        if (campaignId && line.campaign_id !== campaignId) continue;

        orderHadDiscount = true;
        totalDiscountGiven += lineDiscount;
        totalQtyDiscounted += Number(line.quantity_requested ?? 0);
        totalLinesWithDiscount += 1;

        // ── By campaign ──────────────────────────────────────────────
        const c = campaignById.get(line.campaign_id);
        const campKey = line.campaign_id;
        if (!byCampaign.has(campKey)) {
          byCampaign.set(campKey, {
            campaign_id: campKey,
            campaign_name: c?.name ?? "Unknown campaign",
            campaign_status: c?.status ?? "unknown",
            total_discount: 0,
            total_orders: 0,
            total_lines: 0,
            total_qty: 0,
            unique_dealers: new Set(),
          });
        }
        const campAgg = byCampaign.get(campKey)!;
        campAgg.total_discount += lineDiscount;
        campAgg.total_lines += 1;
        campAgg.total_qty += Number(line.quantity_requested ?? 0);
        campAgg.unique_dealers.add(order.dealer_id);

        // ── By part ──────────────────────────────────────────────────
        const partKey = line.part_number;
        if (!byPart.has(partKey)) {
          byPart.set(partKey, {
            part_number: partKey,
            part_name: line.part_name ?? partKey,
            total_discount: 0,
            total_qty: 0,
            total_lines: 0,
            unique_orders: new Set(),
          });
        }
        const partAgg = byPart.get(partKey)!;
        partAgg.total_discount += lineDiscount;
        partAgg.total_qty += Number(line.quantity_requested ?? 0);
        partAgg.total_lines += 1;
        partAgg.unique_orders.add(order.id);

        // ── By dealer ────────────────────────────────────────────────
        const dealerKey = order.dealer_id;
        if (!byDealer.has(dealerKey)) {
          byDealer.set(dealerKey, {
            dealer_id: dealerKey,
            dealer_name: dealerNameById.get(dealerKey) ?? dealerKey,
            total_discount: 0,
            total_orders: new Set(),
            total_lines: 0,
            total_qty: 0,
          });
        }
        const dealerAgg = byDealer.get(dealerKey)!;
        dealerAgg.total_discount += lineDiscount;
        dealerAgg.total_orders.add(order.id);
        dealerAgg.total_lines += 1;
        dealerAgg.total_qty += Number(line.quantity_requested ?? 0);

        // ── Trend ────────────────────────────────────────────────────
        if (!trendMap.has(dateKey)) {
          trendMap.set(dateKey, {
            date: dateKey,
            discount_given: 0,
            orders: new Set(),
            lines: 0,
          });
        }
        const trend = trendMap.get(dateKey)!;
        trend.discount_given += lineDiscount;
        trend.orders.add(order.id);
        trend.lines += 1;
      }

      if (orderHadDiscount) {
        ordersWithDiscount.add(order.id);
        // Bump order count on each contributing campaign
        const uniqueCampaigns = new Set(
          lines
            .filter((l) => l.campaign_id && Number(l.total_discount ?? 0) > 0)
            .map((l) => l.campaign_id as string)
        );
        for (const cid of uniqueCampaigns) {
          const agg = byCampaign.get(cid);
          if (agg) agg.total_orders += 1;
        }
      }
    }

    const totalOrdersInRange = orderList.length;
    const totalOrdersWithDiscount = ordersWithDiscount.size;
    const adoptionRate =
      totalOrdersInRange > 0 ? totalOrdersWithDiscount / totalOrdersInRange : 0;
    const avgDiscountPerOrder =
      totalOrdersWithDiscount > 0 ? totalDiscountGiven / totalOrdersWithDiscount : 0;

    const summary = {
      from: fromStr,
      to: toStr,
      total_discount_given: Math.round(totalDiscountGiven * 100) / 100,
      total_orders_in_range: totalOrdersInRange,
      total_orders_with_discount: totalOrdersWithDiscount,
      total_lines_with_discount: totalLinesWithDiscount,
      total_qty_discounted: totalQtyDiscounted,
      avg_discount_per_order: Math.round(avgDiscountPerOrder * 100) / 100,
      adoption_rate: Math.round(adoptionRate * 10000) / 10000,
      active_campaigns: Array.from(byCampaign.values()).filter(
        (c) => c.campaign_status === "active"
      ).length,
      total_campaigns_used: byCampaign.size,
    };

    const by_campaign = Array.from(byCampaign.values())
      .map((c) => ({
        campaign_id: c.campaign_id,
        campaign_name: c.campaign_name,
        campaign_status: c.campaign_status,
        total_discount: Math.round(c.total_discount * 100) / 100,
        total_orders: c.total_orders,
        total_lines: c.total_lines,
        total_qty: c.total_qty,
        unique_dealers: c.unique_dealers.size,
      }))
      .sort((a, b) => b.total_discount - a.total_discount);

    const by_part = Array.from(byPart.values())
      .map((p) => ({
        part_number: p.part_number,
        part_name: p.part_name,
        total_discount: Math.round(p.total_discount * 100) / 100,
        total_qty: p.total_qty,
        total_lines: p.total_lines,
        unique_orders: p.unique_orders.size,
      }))
      .sort((a, b) => b.total_discount - a.total_discount)
      .slice(0, 25);

    const by_dealer = Array.from(byDealer.values())
      .map((d) => ({
        dealer_id: d.dealer_id,
        dealer_name: d.dealer_name,
        total_discount: Math.round(d.total_discount * 100) / 100,
        total_orders: d.total_orders.size,
        total_lines: d.total_lines,
        total_qty: d.total_qty,
      }))
      .sort((a, b) => b.total_discount - a.total_discount)
      .slice(0, 25);

    const trend = Array.from(trendMap.values())
      .map((t) => ({
        date: t.date,
        discount_given: Math.round(t.discount_given * 100) / 100,
        orders: t.orders.size,
        lines: t.lines,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      data: {
        summary,
        by_campaign,
        by_part,
        by_dealer,
        trend,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: e instanceof Error ? e.message : "Failed to load discount report",
        },
      },
      { status: 500 }
    );
  }
}
