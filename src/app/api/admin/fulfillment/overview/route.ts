import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { listBackOrders } from "@/lib/backorders/service";
import { listInvoices } from "@/lib/invoices/service";
import { serverError } from "@/lib/api-errors";

/**
 * GET /api/admin/fulfillment/overview — aggregated fulfillment KPIs and the
 * three admin action queues (at-risk back-orders, overdue invoices, pending
 * shipments). Admin only.
 */
export async function GET() {
  const admin = await getAdminUser();
  if (admin instanceof NextResponse) return admin;

  try {
    const nowIso = new Date().toISOString();

    // Queue lists (display) — capped, sorted most-urgent first.
    const backorders = await listBackOrders({ dealerScope: null, limit: 500 });
    const atRisk = backorders.data.filter((b) => b.is_at_risk && b.status !== "cancelled" && b.status !== "fulfilled");

    const invoices = await listInvoices({ dealerScope: null, limit: 500 });
    const overdue = invoices.data.filter((i) => i.effective_status === "overdue");

    // Headline KPI counts — exact, via count queries (independent of the
    // capped queue lists above so they stay correct at scale).
    const [atRiskCountRes, overdueCountRes, inTransitRes, unpaidRes] = await Promise.all([
      supabaseAdmin
        .from("back_orders")
        .select("id", { count: "exact", head: true })
        .eq("is_at_risk", true)
        .in("status", ["awaiting", "in_transit"]),
      supabaseAdmin
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .not("status", "in", "(paid,cancelled)")
        .lt("due_date", nowIso),
      supabaseAdmin
        .from("shipments")
        .select("id", { count: "exact", head: true })
        .in("shipment_status", ["shipped", "in_transit"]),
      // Outstanding balance: total_amount over all not-yet-settled invoices.
      supabaseAdmin
        .from("invoices")
        .select("total_amount")
        .not("status", "in", "(paid,cancelled)")
        .limit(2000),
    ]);

    const outstandingTotal = (unpaidRes.data ?? []).reduce((s, i) => s + Number(i.total_amount), 0);

    const { data: pendingShipments } = await supabaseAdmin
      .from("shipments")
      .select("id, shipment_number, order_id, carrier_code, shipment_status, eta_delivery, created_at")
      .eq("shipment_status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    return NextResponse.json({
      data: {
        kpis: {
          shipments_in_transit: inTransitRes.count ?? 0,
          invoices_overdue: overdueCountRes.count ?? 0,
          backorders_at_risk: atRiskCountRes.count ?? 0,
          outstanding_balance: Math.round(outstandingTotal * 100) / 100,
        },
        queues: {
          at_risk_backorders: [...atRisk].sort((a, b) => b.slippage_days - a.slippage_days),
          overdue_invoices: [...overdue].sort((a, b) => b.aging_days - a.aging_days),
          pending_shipments: pendingShipments ?? [],
        },
      },
    });
  } catch (e) {
    return serverError(e, "admin/fulfillment/overview");
  }
}
