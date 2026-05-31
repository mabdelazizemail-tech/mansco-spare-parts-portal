// src/lib/fulfillment/split-engine.ts
//
// Pure partial-fulfillment split logic (Module 6 Phase 2). Given the requested
// quantity per order line and the available-to-promise (ATP) quantity, it
// computes how much is confirmed now vs. how much becomes a back-order, plus
// the overall back-order value ratio used to decide auto-apply vs. admin
// review.
//
// This module is deliberately side-effect free so it can be unit-tested in
// isolation. Persistence (writing order_lines / back_orders) lives in the
// service/route layer.

import { BACKORDER_REVIEW_THRESHOLD, ETA_SLIPPAGE_RISK_DAYS } from "./threshold";

export interface SplitLineInput {
  line_id: string;
  part_number: string;
  /** Quantity the dealer requested on this line. */
  quantity_requested: number;
  /** Available-to-promise quantity from current stock data. */
  atp: number;
  /** Discounted unit price (used for value-ratio calculation). */
  unit_price: number;
  /** Replenishment ETA for the back-ordered portion, if known. */
  backorder_eta?: string | null;
}

export interface SplitLineResult {
  line_id: string;
  part_number: string;
  quantity_requested: number;
  quantity_confirmed: number;
  quantity_backordered: number;
  unit_price: number;
  backorder_eta: string | null;
  /** Resulting line_status to persist. */
  line_status: "confirmed" | "backordered" | "rejected";
}

export interface SplitResult {
  lines: SplitLineResult[];
  totalOrderValue: number;
  backorderValue: number;
  /** backorderValue / totalOrderValue, 0 when the order has no value. */
  backorderRatio: number;
  /** True when ratio exceeds the review threshold → needs admin sign-off. */
  needsReview: boolean;
  /** True when at least one line is (fully or partially) back-ordered. */
  hasBackorders: boolean;
  /** True when every confirmable unit is confirmed and nothing back-ordered. */
  fullyConfirmed: boolean;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute the confirmed/back-order split for a set of order lines.
 *
 * Per line:
 *   - atp >= requested        → fully confirmed
 *   - 0 < atp < requested     → split: confirm atp, back-order the remainder
 *   - atp <= 0                → fully back-ordered
 */
export function computeSplit(lines: SplitLineInput[]): SplitResult {
  const resultLines: SplitLineResult[] = lines.map((line) => {
    const requested = Math.max(0, Math.floor(line.quantity_requested));
    const atp = Math.max(0, Math.floor(Number.isFinite(line.atp) ? line.atp : 0));

    const confirmed = Math.min(requested, atp);
    const backordered = requested - confirmed;

    let line_status: SplitLineResult["line_status"];
    if (confirmed > 0 && backordered === 0) line_status = "confirmed";
    else if (confirmed === 0 && backordered > 0) line_status = "backordered";
    else if (confirmed > 0 && backordered > 0) line_status = "confirmed"; // partially confirmed line tracks as confirmed; remainder lives in quantity_backordered
    else line_status = "rejected"; // requested 0 — nothing to do

    return {
      line_id: line.line_id,
      part_number: line.part_number,
      quantity_requested: requested,
      quantity_confirmed: confirmed,
      quantity_backordered: backordered,
      unit_price: line.unit_price,
      backorder_eta: backordered > 0 ? line.backorder_eta ?? null : null,
      line_status,
    };
  });

  let totalOrderValue = 0;
  let backorderValue = 0;
  for (const l of resultLines) {
    totalOrderValue += l.unit_price * l.quantity_requested;
    backorderValue += l.unit_price * l.quantity_backordered;
  }
  totalOrderValue = round2(totalOrderValue);
  backorderValue = round2(backorderValue);

  const backorderRatio = totalOrderValue > 0 ? backorderValue / totalOrderValue : 0;
  const hasBackorders = resultLines.some((l) => l.quantity_backordered > 0);

  return {
    lines: resultLines,
    totalOrderValue,
    backorderValue,
    backorderRatio,
    needsReview: backorderRatio > BACKORDER_REVIEW_THRESHOLD,
    hasBackorders,
    fullyConfirmed: !hasBackorders,
  };
}

/**
 * Derive the order-level status that should follow a split application.
 *   - no back-orders          → "approved"
 *   - some confirmed + some BO → "partial"
 *   - nothing confirmed at all → "back_ordered"
 */
export function deriveOrderStatus(split: SplitResult): "approved" | "partial" | "back_ordered" {
  if (!split.hasBackorders) return "approved";
  const anyConfirmed = split.lines.some((l) => l.quantity_confirmed > 0);
  return anyConfirmed ? "partial" : "back_ordered";
}

/**
 * Compute slippage (in whole days) between an original and current ETA and
 * whether the back-order should be flagged at-risk.
 *
 * Returns slippageDays = 0 when either date is missing or the current ETA is
 * not later than the original.
 */
export function computeSlippage(
  originalEta: string | null | undefined,
  currentEta: string | null | undefined
): { slippageDays: number; isAtRisk: boolean } {
  if (!originalEta || !currentEta) return { slippageDays: 0, isAtRisk: false };

  const orig = new Date(originalEta).getTime();
  const curr = new Date(currentEta).getTime();
  if (Number.isNaN(orig) || Number.isNaN(curr)) {
    return { slippageDays: 0, isAtRisk: false };
  }

  const diffDays = Math.round((curr - orig) / (1000 * 60 * 60 * 24));
  const slippageDays = Math.max(0, diffDays);
  return { slippageDays, isAtRisk: slippageDays > ETA_SLIPPAGE_RISK_DAYS };
}
