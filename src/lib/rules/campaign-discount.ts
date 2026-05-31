// ─────────────────────────────────────────────────────────────────────────────
// New shared resolver — see docs/superpowers/specs/2026-05-29-campaign-discount-display-design.md
//
// `applyDiscount`, `filterEligibleCampaignItems`, `pickWinningRule` are pure
// helpers, shared by the display path (parts lookups + cart) and the charge
// path (POST /api/orders) so what the dealer sees == what submission charges.
// `getCampaignDiscounts` is the batched DB query (correct snake_case schema).
// ─────────────────────────────────────────────────────────────────────────────

export type DiscountType = "percentage" | "fixed";

export interface CampaignRule {
  campaignId: string;
  discountType: DiscountType;
  discountValue: number;
}

export interface CampaignItemRow {
  campaign_id: string;
  discount_type: DiscountType;
  /** PostgREST returns NUMERIC as string at runtime — always read via pickWinningRule, which Number()-coerces. */
  discount_value: number;
  campaign: {
    status: string;
    start_date: string | null;
    end_date: string | null;
    target_audience: string;
    target_dealer_ids: string[] | null;
  } | null;
}

export interface AppliedDiscount {
  discountedUnitPrice: number;
  discountPct: number;
  lineDiscountPerUnit: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Apply a campaign rule to a unit price. Returns null when the rule yields
 * no actual discount (zero/negative value, discounted price >= original).
 */
export function applyDiscount(
  unitPrice: number,
  rule: CampaignRule | null | undefined,
): AppliedDiscount | null {
  if (!rule || unitPrice <= 0) return null;
  if (rule.discountValue <= 0) return null;
  let discounted: number;
  if (rule.discountType === "percentage") {
    discounted = unitPrice * (1 - rule.discountValue / 100);
  } else {
    discounted = Math.max(0, unitPrice - rule.discountValue);
  }
  discounted = round2(discounted);
  if (discounted >= unitPrice) return null;
  const lineDiscountPerUnit = round2(unitPrice - discounted);
  const discountPct = round2((lineDiscountPerUnit / unitPrice) * 100);
  return { discountedUnitPrice: discounted, discountPct, lineDiscountPerUnit };
}

/**
 * Keep only campaign_item rows whose joined campaign is currently active and
 * targets this dealer. Quantity is intentionally NOT checked
 * (min_order_quantity is ignored per design decision D2).
 */
export function filterEligibleCampaignItems(
  rows: CampaignItemRow[],
  dealerId: string,
  now: Date = new Date(),
): CampaignItemRow[] {
  return rows.filter((r) => {
    const c = r.campaign;
    if (!c) return false;
    if (c.status !== "active") return false;
    if (c.start_date && new Date(c.start_date) > now) return false;
    if (c.end_date && new Date(c.end_date) < now) return false;
    const ids = c.target_dealer_ids ?? [];
    return c.target_audience === "all" || ids.includes(dealerId);
  });
}

/**
 * From a list of candidate rules for ONE part, pick the rule yielding the
 * lowest discounted unit price. Returns null if no candidate discounts.
 *
 * Tie-breaking: first-seen-wins. Stability depends on the caller preserving
 * the array order (PostgREST returns rows in insertion order unless sorted).
 */
export function pickWinningRule(
  candidates: CampaignItemRow[] | null | undefined,
  unitPrice: number,
): CampaignRule | null {
  if (!candidates || candidates.length === 0 || unitPrice <= 0) return null;
  let best: CampaignRule | null = null;
  let bestDiscounted = unitPrice;
  for (const row of candidates) {
    const rule: CampaignRule = {
      campaignId: row.campaign_id,
      discountType: row.discount_type,
      discountValue: Number(row.discount_value),
    };
    const applied = applyDiscount(unitPrice, rule);
    if (applied && applied.discountedUnitPrice < bestDiscounted) {
      bestDiscounted = applied.discountedUnitPrice;
      best = rule;
    }
  }
  return best;
}

/**
 * Batched campaign-discount lookup. ONE query for all part numbers.
 *
 * Returns `Map<part_number, eligible CampaignItemRow[]>`. The caller picks
 * the winning rule via `pickWinningRule(candidates, unitPrice)` once the
 * part's actual unit price is known.
 *
 * Schema is snake_case per the live `campaign_items` / `campaigns` tables.
 * Without a dealer (admin or unauthenticated context) the map is empty.
 * A query failure logs and returns empty — never throws into the price path.
 */
export async function getCampaignDiscounts(
  dealerId: string | null,
  partNumbers: string[],
): Promise<Map<string, CampaignItemRow[]>> {
  const result = new Map<string, CampaignItemRow[]>();
  if (!dealerId || partNumbers.length === 0) return result;

  // Lazy import to avoid module-load failure in tests where Supabase env
  // vars are not present.
  const { supabaseAdmin } = await import("@/lib/supabase/admin");

  // Cap each `.in()` query to keep URL length and planner cost bounded.
  const CHUNK_SIZE = 500;
  const now = new Date();
  type RawRow = CampaignItemRow & { part_number: string };

  for (let i = 0; i < partNumbers.length; i += CHUNK_SIZE) {
    const chunk = partNumbers.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabaseAdmin
      .from("campaign_items")
      .select(
        `
      part_number,
      campaign_id,
      discount_type,
      discount_value,
      campaign:campaigns!inner (
        status,
        start_date,
        end_date,
        target_audience,
        target_dealer_ids
      )
      `,
      )
      .in("part_number", chunk);

    if (error) {
      console.error("getCampaignDiscounts query failed:", error.message);
      // Skip this chunk; return whatever we've accumulated so the price path
      // never breaks. Subsequent chunks may still succeed.
      continue;
    }

    for (const raw of (data ?? []) as unknown as RawRow[]) {
      const [eligible] = filterEligibleCampaignItems([raw], dealerId, now);
      if (!eligible) continue;
      const arr = result.get(raw.part_number);
      if (arr) arr.push(eligible);
      else result.set(raw.part_number, [eligible]);
    }
  }

  return result;
}
