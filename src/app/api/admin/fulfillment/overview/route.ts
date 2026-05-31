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
    // Back-orders (all dealers).
    const backorders = await listBackOrders({ dealerScope: null, limit: 200 });
    const atRisk = backorders.data.filter((b) => b.is_at_risk && b.status !== "cancelled" && b.status !== "fulfilled");

    // Invoices (all dealers) with computed aging.
    const invoices = await listInvoices({ dealerScope: null, limit: 200 });
    const overdue = invoices.data.filter((i) => i.effective_status === "overdue");
    const outstandingTotal = invoices.data.reduce((s, i) => s + i.outstanding_balance, 0);

    // Shipments in transit + pending (raw table — Phase 1).
    const { count: inTransitCount } = await supabaseAdmin
      .from("shipments")
      .select("id", { count: "exact", head: true })
      .in("shipment_status", ["shipped", "in_transit"]);

    const { data: pendingShipments } = await supabaseAdmin
      .from("shipments")
      .select("id, shipment_number, order_id, carrier_code, shipment_status, eta_delivery, created_at")
      .eq("shipment_status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    return NextResponse.json({
      data: {
        kpis: {
          shipments_in_transit: inTransitCount ?? 0,
          invoices_overdue: overdue.length,
          backorders_at_risk: atRisk.length,
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
