import { describe, it, expect } from "vitest";
import {
  applyDiscount,
  filterEligibleCampaignItems,
  pickWinningRule,
  type CampaignRule,
  type CampaignItemRow,
} from "@/lib/rules/campaign-discount";

describe("applyDiscount", () => {
  it("returns null for null/undefined rule", () => {
    expect(applyDiscount(100, null)).toBeNull();
    expect(applyDiscount(100, undefined)).toBeNull();
  });

  it("returns null when unit price is zero or negative", () => {
    const rule: CampaignRule = { campaignId: "c1", discountType: "percentage", discountValue: 10 };
    expect(applyDiscount(0, rule)).toBeNull();
    expect(applyDiscount(-5, rule)).toBeNull();
  });

  it("applies a percentage discount and rounds to 2 dp", () => {
    const rule: CampaignRule = { campaignId: "c1", discountType: "percentage", discountValue: 10 };
    const r = applyDiscount(1250, rule)!;
    expect(r.discountedUnitPrice).toBe(1125);
    expect(r.lineDiscountPerUnit).toBe(125);
    expect(r.discountPct).toBe(10);
  });

  it("applies a fixed discount", () => {
    const rule: CampaignRule = { campaignId: "c1", discountType: "fixed", discountValue: 50 };
    const r = applyDiscount(200, rule)!;
    expect(r.discountedUnitPrice).toBe(150);
    expect(r.lineDiscountPerUnit).toBe(50);
    expect(r.discountPct).toBe(25);
  });

  it("clamps fixed discount at zero (never negative)", () => {
    const rule: CampaignRule = { campaignId: "c1", discountType: "fixed", discountValue: 999 };
    const r = applyDiscount(100, rule)!;
    expect(r.discountedUnitPrice).toBe(0);
    expect(r.lineDiscountPerUnit).toBe(100);
    expect(r.discountPct).toBe(100);
  });

  it("returns null when rule yields no actual discount", () => {
    const zero: CampaignRule = { campaignId: "c1", discountType: "percentage", discountValue: 0 };
    expect(applyDiscount(100, zero)).toBeNull();
    const negative: CampaignRule = { campaignId: "c1", discountType: "fixed", discountValue: -10 };
    expect(applyDiscount(100, negative)).toBeNull();
  });

  it("percentage on a non-round price — rounds to 2 dp (known non-summing tolerance)", () => {
    const rule: CampaignRule = { campaignId: "c1", discountType: "percentage", discountValue: 10 };
    const r = applyDiscount(1234.567, rule)!;
    expect(r.discountedUnitPrice).toBe(1111.11); // round2(1111.1103)
    expect(r.discountPct).toBe(10);
    // Note: discountedUnitPrice + lineDiscountPerUnit may differ from unitPrice
    // by sub-cent rounding (1111.11 + 123.46 = 1234.57 ≠ 1234.567). Acceptable.
  });
});

const camp = (over: Partial<CampaignItemRow["campaign"]> = {}): CampaignItemRow["campaign"] => ({
  status: "active",
  start_date: null,
  end_date: null,
  target_audience: "all",
  target_dealer_ids: null,
  ...over,
});

const row = (over: Partial<CampaignItemRow> = {}): CampaignItemRow => ({
  campaign_id: "c1",
  discount_type: "percentage",
  discount_value: 10,
  campaign: camp(),
  ...over,
});

describe("filterEligibleCampaignItems", () => {
  const NOW = new Date("2026-06-01T00:00:00Z");

  it("keeps active campaigns targeting 'all'", () => {
    expect(filterEligibleCampaignItems([row()], "dealer-A", NOW)).toHaveLength(1);
  });

  it("drops campaigns whose status is not 'active'", () => {
    expect(
      filterEligibleCampaignItems([row({ campaign: camp({ status: "completed" }) })], "dealer-A", NOW),
    ).toHaveLength(0);
  });

  it("drops campaigns before their start_date", () => {
    expect(
      filterEligibleCampaignItems([row({ campaign: camp({ start_date: "2026-07-01" }) })], "dealer-A", NOW),
    ).toHaveLength(0);
  });

  it("drops campaigns after their end_date", () => {
    expect(
      filterEligibleCampaignItems([row({ campaign: camp({ end_date: "2026-05-15" }) })], "dealer-A", NOW),
    ).toHaveLength(0);
  });

  it("targets specific dealers only when target_audience != 'all'", () => {
    const r = row({ campaign: camp({ target_audience: "selected", target_dealer_ids: ["dealer-B"] }) });
    expect(filterEligibleCampaignItems([r], "dealer-A", NOW)).toHaveLength(0);
    expect(filterEligibleCampaignItems([r], "dealer-B", NOW)).toHaveLength(1);
  });

  it("drops rows without a joined campaign object", () => {
    const r = { ...row() };
    r.campaign = null;
    expect(filterEligibleCampaignItems([r], "dealer-A", NOW)).toHaveLength(0);
  });
});

describe("pickWinningRule", () => {
  it("returns null for empty / nullish input", () => {
    expect(pickWinningRule([], 100)).toBeNull();
    expect(pickWinningRule(null, 100)).toBeNull();
    expect(pickWinningRule(undefined, 100)).toBeNull();
  });

  it("returns null when unit price is zero or negative", () => {
    expect(pickWinningRule([row()], 0)).toBeNull();
  });

  it("returns a rule when one candidate matches", () => {
    const r = pickWinningRule([row({ discount_value: 10 })], 100);
    expect(r).toEqual({ campaignId: "c1", discountType: "percentage", discountValue: 10 });
  });

  it("picks the rule yielding the lowest discounted unit price", () => {
    const low = row({ campaign_id: "low", discount_value: 5 }); // -5% => 95
    const high = row({ campaign_id: "high", discount_value: 20 }); // -20% => 80
    expect(pickWinningRule([low, high], 100)?.campaignId).toBe("high");
    expect(pickWinningRule([high, low], 100)?.campaignId).toBe("high");
  });

  it("compares percentage vs fixed by absolute discounted price", () => {
    // unit 200: 10% off => 180; fixed 50 off => 150 (fixed wins)
    const pct = row({ campaign_id: "pct", discount_type: "percentage", discount_value: 10 });
    const fxd = row({ campaign_id: "fxd", discount_type: "fixed", discount_value: 50 });
    expect(pickWinningRule([pct, fxd], 200)?.campaignId).toBe("fxd");
  });

  it("ignores candidates that yield no actual discount", () => {
    const zero = row({ campaign_id: "zero", discount_value: 0 });
    expect(pickWinningRule([zero], 100)).toBeNull();
  });

  it("tie: first candidate wins when both yield identical discounted price", () => {
    const a = row({ campaign_id: "a", discount_type: "fixed", discount_value: 10 });
    const b = row({ campaign_id: "b", discount_type: "fixed", discount_value: 10 });
    expect(pickWinningRule([a, b], 100)?.campaignId).toBe("a");
    expect(pickWinningRule([b, a], 100)?.campaignId).toBe("b");
  });
});
