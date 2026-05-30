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

export interface DiscountEligibility {
  eligible: boolean;
  campaignId?: string;
  discountPct: number;
  reason?: string;
}

/**
 * @deprecated Broken (queries camelCase columns against snake_case schema; always
 * returns no discount). Scheduled for deletion in Task 11. New code MUST use
 * `getCampaignDiscounts` + `pickWinningRule` + `applyDiscount` instead.
 */
export async function checkCampaignDiscount(
  dealerId: string,
  partNumber: string,
  quantity: number
): Promise<DiscountEligibility> {
  try {
    // Lazy import: only load Supabase client when this legacy function is called
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const now = new Date();

    // Get active campaigns that include this part and this dealer
    const { data: campaignItems, error: campaignError } = await supabaseAdmin
      .from("campaign_items")
      .select(
        `
        id,
        campaignId,
        discountValue,
        discountType,
        minOrderQuantity,
        campaign:campaigns (
          id,
          status,
          targetAudience,
          targetDealerIds,
          startDate,
          endDate
        )
        `
      )
      .eq("partNumber", partNumber);

    if (campaignError) {
      console.error("Campaign lookup error:", campaignError);
      return { eligible: false, discountPct: 0 };
    }

    // Filter for active, eligible campaigns
    for (const item of campaignItems || []) {
      const campaign = (item as any).campaign;

      // Check campaign is active
      if (campaign.status !== "active") continue;
      if (campaign.startDate && new Date(campaign.startDate) > now) continue;
      if (campaign.endDate && new Date(campaign.endDate) < now) continue;

      // Check dealer eligibility
      const targetDealerIds = campaign.targetDealerIds || [];
      const isEligibleDealer =
        campaign.targetAudience === "all" || targetDealerIds.includes(dealerId);

      if (!isEligibleDealer) continue;

      // Check minimum order quantity
      if (quantity < (item as any).minOrderQuantity) continue;

      // Campaign matched! Calculate discount
      const discountValue = Number((item as any).discountValue);
      const discountType = (item as any).discountType; // "percentage" or "fixed"

      // For now, assume percentage-based discounts
      // discountValue is stored as percentage (e.g., 10 for 10%)
      const discountPct =
        discountType === "percentage" ? discountValue : 0;

      return {
        eligible: true,
        campaignId: campaign.id,
        discountPct,
        reason: `Eligible for campaign discount on ${partNumber}`,
      };
    }

    // No matching campaign found
    return { eligible: false, discountPct: 0 };
  } catch (err) {
    console.error("Campaign discount check failed:", err);
    return { eligible: false, discountPct: 0 };
  }
}

/**
 * Calculate discounted price for an order line
 */
export function calculateLineDiscount(
  unitPrice: number,
  quantity: number,
  discountPct: number
) {
  const originalLineTotal = unitPrice * quantity;
  const discountedUnitPrice = unitPrice * (1 - discountPct / 100);
  const discountedLineTotal = discountedUnitPrice * quantity;
  const totalDiscount = originalLineTotal - discountedLineTotal;

  return {
    discountPct,
    discountedUnitPrice: Math.round(discountedUnitPrice * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    originalLineTotal: Math.round(originalLineTotal * 100) / 100,
    lineTotal: Math.round(discountedLineTotal * 100) / 100,
  };
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
  // vars are not present. Mirrors the pattern used by the deprecated
  // checkCampaignDiscount below.
  const { supabaseAdmin } = await import("@/lib/supabase/admin");

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
    .in("part_number", partNumbers);

  if (error) {
    console.error("getCampaignDiscounts query failed:", error.message);
    return result;
  }

  const now = new Date();
  type RawRow = CampaignItemRow & { part_number: string };
  for (const raw of (data ?? []) as unknown as RawRow[]) {
    const [eligible] = filterEligibleCampaignItems([raw], dealerId, now);
    if (!eligible) continue;
    const arr = result.get(raw.part_number);
    if (arr) arr.push(eligible);
    else result.set(raw.part_number, [eligible]);
  }
  return result;
}
