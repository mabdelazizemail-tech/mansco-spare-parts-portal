// src/lib/backorders/service.ts
//
// Back-order domain service (Module 6 Phase 3). Reads/writes through the
// service-role client. Back-orders are created/synced from order_lines that
// carry a quantity_backordered > 0 (set by the split engine or by admin
// partial-approve), and carry ETA-change history + at-risk flagging.

import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeSlippage } from "@/lib/fulfillment/split-engine";

export type BackOrderStatus = "awaiting" | "in_transit" | "fulfilled" | "cancelled";

export interface BackOrderRecord {
  id: string;
  order_line_id: string;
  order_id: string;
  dealer_id: string;
  part_number: string;
  part_name: string;
  quantity: number;
  original_eta: string | null;
  current_eta: string | null;
  status: BackOrderStatus;
  is_at_risk: boolean;
  risk_flagged_at: string | null;
  slippage_days: number;
  resolved_at: string | null;
  resolved_via: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Reconcile back_orders rows against the current state of an order's lines.
 *
 * For every order line with quantity_backordered > 0 we ensure an open
 * back_order exists (insert if missing). For lines whose back-order quantity
 * dropped to 0 (e.g. admin re-confirmed), the open back_order is cancelled.
 *
 * Idempotent — safe to call repeatedly after any line-level change.
 */
export async function syncBackordersForOrder(orderId: string): Promise<{ created: number; cancelled: number }> {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, dealer_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { created: 0, cancelled: 0 };

  const { data: lines } = await supabaseAdmin
    .from("order_lines")
    .select("id, part_number, part_name, quantity_backordered, backorder_eta")
    .eq("order_id", orderId);
  if (!lines) return { created: 0, cancelled: 0 };

  const { data: existing } = await supabaseAdmin
    .from("back_orders")
    .select("id, order_line_id, quantity, status, current_eta")
    .eq("order_id", orderId);
  const byLine = new Map((existing ?? []).map((b) => [b.order_line_id, b]));

  let created = 0;
  let cancelled = 0;

  for (const line of lines) {
    const boQty = line.quantity_backordered ?? 0;
    const current = byLine.get(line.id);

    if (boQty > 0) {
      if (!current) {
        // New back-order for this line.
        const { data: inserted } = await supabaseAdmin
          .from("back_orders")
          .insert({
            order_line_id: line.id,
            order_id: orderId,
            dealer_id: order.dealer_id,
            part_number: line.part_number,
            part_name: line.part_name,
            quantity: boQty,
            original_eta: line.backorder_eta ?? null,
            current_eta: line.backorder_eta ?? null,
            status: "awaiting",
          })
          .select("id")
          .single();
        if (inserted) {
          created++;
          await supabaseAdmin.from("back_order_eta_changes").insert({
            back_order_id: inserted.id,
            previous_eta: null,
            new_eta: line.backorder_eta ?? null,
            reason: "Back-order created from order split",
            source: "split",
          });
        }
      } else if (current.status === "cancelled") {
        // Reopen a previously cancelled back-order if the line is backordered again.
        await supabaseAdmin
          .from("back_orders")
          .update({ status: "awaiting", quantity: boQty, resolved_at: null, resolved_via: null })
          .eq("id", current.id);
      } else if (current.quantity !== boQty) {
        await supabaseAdmin.from("back_orders").update({ quantity: boQty }).eq("id", current.id);
      }
    } else if (current && current.status !== "cancelled" && current.status !== "fulfilled") {
      // Line no longer back-ordered → close the open back-order.
      await supabaseAdmin
        .from("back_orders")
        .update({ status: "cancelled", resolved_at: new Date().toISOString(), resolved_via: "cancelled" })
        .eq("id", current.id);
      cancelled++;
    }
  }

  return { created, cancelled };
}

export interface ListBackOrdersFilters {
  /** Restrict to these dealer identifiers (code and/or uuid). Null = all (admin). */
  dealerScope?: string[] | null;
  status?: BackOrderStatus;
  atRiskOnly?: boolean;
  limit?: number;
  offset?: number;
}

export async function listBackOrders(filters: ListBackOrdersFilters) {
  const limit = Math.min(filters.limit ?? 100, 200);
  const offset = filters.offset ?? 0;

  let query = supabaseAdmin
    .from("back_orders")
    .select("*", { count: "exact" })
    .order("is_at_risk", { ascending: false })
    .order("current_eta", { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (filters.dealerScope && filters.dealerScope.length > 0) {
    query = query.in("dealer_id", filters.dealerScope);
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.atRiskOnly) query = query.eq("is_at_risk", true);

  const { data, count, error } = await query;
  if (error) throw error;

  return { data: (data ?? []) as BackOrderRecord[], total: count ?? 0, limit, offset };
}

export async function getBackOrder(id: string) {
  const { data: backOrder, error } = await supabaseAdmin
    .from("back_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!backOrder) return null;

  const { data: history } = await supabaseAdmin
    .from("back_order_eta_changes")
    .select("*")
    .eq("back_order_id", id)
    .order("changed_at", { ascending: false });

  return { ...(backOrder as BackOrderRecord), eta_history: history ?? [] };
}

/**
 * Admin manual ETA override. Recomputes slippage/at-risk and records the
 * change in history.
 */
export async function updateBackOrderEta(
  id: string,
  newEta: string | null,
  reason: string | null,
  source: "manual" | "sap_sync" = "manual"
): Promise<BackOrderRecord> {
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from("back_orders")
    .select("id, original_eta, current_eta, status")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!current) throw new Error("Back-order not found");
  if (current.status === "cancelled" || current.status === "fulfilled") {
    throw new Error(`Cannot change ETA of a ${current.status} back-order`);
  }

  const baseline = current.original_eta ?? newEta;
  const { slippageDays, isAtRisk } = computeSlippage(baseline, newEta);

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("back_orders")
    .update({
      current_eta: newEta,
      slippage_days: slippageDays,
      is_at_risk: isAtRisk,
      risk_flagged_at: isAtRisk ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (updErr || !updated) throw new Error(`Failed to update ETA: ${updErr?.message}`);

  await supabaseAdmin.from("back_order_eta_changes").insert({
    back_order_id: id,
    previous_eta: current.current_eta,
    new_eta: newEta,
    reason: reason ?? null,
    source,
  });

  return updated as BackOrderRecord;
}

export async function cancelBackOrder(id: string): Promise<BackOrderRecord> {
  const { data: current } = await supabaseAdmin
    .from("back_orders")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (!current) throw new Error("Back-order not found");
  if (current.status === "fulfilled") throw new Error("Cannot cancel a fulfilled back-order");

  const { data: updated, error } = await supabaseAdmin
    .from("back_orders")
    .update({ status: "cancelled", resolved_at: new Date().toISOString(), resolved_via: "cancelled" })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !updated) throw new Error(`Failed to cancel back-order: ${error?.message}`);
  return updated as BackOrderRecord;
}
