import { describe, it, expect } from "vitest";
import {
  ADMIN_MANUAL_PRICE_LIST_ID,
  PRICE_LIST_PRECEDENCE,
  pickPrice,
  buildPriceMap,
  buildPartSearchResult,
  type PriceSnapshot,
} from "@/lib/rules/parts-availability";
import type { CampaignItemRow } from "@/lib/rules/campaign-discount";

const row = (
  part_number: string,
  unit_price: number,
  price_list_id: string | null,
): PriceSnapshot => ({ part_number, unit_price, currency: "EGP", price_list_id });

describe("ADMIN_MANUAL constant", () => {
  it("is the literal 'ADMIN_MANUAL' (must match the bulk-upload writer)", () => {
    expect(ADMIN_MANUAL_PRICE_LIST_ID).toBe("ADMIN_MANUAL");
  });

  it("ranks ADMIN_MANUAL above STANDARD in the precedence list", () => {
    expect(PRICE_LIST_PRECEDENCE.indexOf("ADMIN_MANUAL")).toBeLessThan(
      PRICE_LIST_PRECEDENCE.indexOf("STANDARD"),
    );
  });
});

describe("pickPrice", () => {
  it("returns null for empty/nullish input", () => {
    expect(pickPrice([])).toBeNull();
    expect(pickPrice(null)).toBeNull();
    expect(pickPrice(undefined)).toBeNull();
  });

  it("returns the only row when there is just one", () => {
    const r = row("P1", 100, "STANDARD");
    expect(pickPrice([r])).toEqual(r);
  });

  it("prefers ADMIN_MANUAL over STANDARD regardless of array order", () => {
    const std = row("P1", 100, "STANDARD");
    const admin = row("P1", 250, "ADMIN_MANUAL");
    expect(pickPrice([std, admin])?.unit_price).toBe(250);
    expect(pickPrice([admin, std])?.unit_price).toBe(250);
  });

  it("falls back to STANDARD when no ADMIN_MANUAL row exists", () => {
    const std = row("P1", 100, "STANDARD");
    const other = row("P1", 999, "PROMO");
    expect(pickPrice([other, std])?.price_list_id).toBe("STANDARD");
  });

  it("treats unknown / null tags as lowest priority", () => {
    const unknown = row("P1", 999, "WHOLESALE");
    const nullTag = row("P1", 888, null);
    const std = row("P1", 100, "STANDARD");
    expect(pickPrice([unknown, nullTag, std])?.price_list_id).toBe("STANDARD");
    // With only unknown/null, the first-seen wins (stable)
    expect(pickPrice([unknown, nullTag])?.unit_price).toBe(999);
  });
});

describe("buildPriceMap", () => {
  it("groups by part_number and applies precedence per part", () => {
    const rows: PriceSnapshot[] = [
      row("P1", 100, "STANDARD"),
      row("P1", 250, "ADMIN_MANUAL"),
      row("P2", 50, "STANDARD"),
    ];
    const map = buildPriceMap(rows);
    expect(map.get("P1")?.unit_price).toBe(250); // admin override wins
    expect(map.get("P2")?.unit_price).toBe(50); // only STANDARD
    expect(map.size).toBe(2);
  });

  it("returns an empty map for nullish input", () => {
    expect(buildPriceMap(null).size).toBe(0);
    expect(buildPriceMap(undefined).size).toBe(0);
  });
});

const catalog = {
  partNumber: "P1",
  name: "Brake Pad",
  nameAr: "تيل فرامل",
  category: "brakes",
  categoryAr: "الفرامل",
  model: "Peugeot 3008",
  oem: null,
  image: null,
};

const stockAvailable = {
  part_number: "P1",
  quantity_available: 10,
  quantity_atp: 10,
  replenishment_eta: null,
  last_synced_at: "2026-05-30T00:00:00Z",
};

const priceRow = {
  part_number: "P1",
  unit_price: 1000,
  currency: "EGP",
  price_list_id: "STANDARD",
};

const eligibleCandidate = (over: Partial<CampaignItemRow> = {}): CampaignItemRow => ({
  campaign_id: "c1",
  discount_type: "percentage",
  discount_value: 10,
  campaign: {
    status: "active",
    start_date: null,
    end_date: null,
    target_audience: "all",
    target_dealer_ids: null,
  },
  ...over,
});

describe("buildPartSearchResult — discount fields", () => {
  it("returns null discount fields when no candidates given", () => {
    const r = buildPartSearchResult({ catalog, stock: stockAvailable, price: priceRow });
    expect(r.unit_price).toBe(1000);
    expect(r.campaign_id).toBeNull();
    expect(r.discount_pct).toBe(0);
    expect(r.original_unit_price).toBeNull();
    expect(r.discounted_unit_price).toBeNull();
  });

  it("applies a percentage discount when a candidate matches", () => {
    const r = buildPartSearchResult({
      catalog,
      stock: stockAvailable,
      price: priceRow,
      discountCandidates: [eligibleCandidate()],
    });
    expect(r.unit_price).toBe(1000);
    expect(r.original_unit_price).toBe(1000);
    expect(r.discounted_unit_price).toBe(900);
    expect(r.discount_pct).toBe(10);
    expect(r.campaign_id).toBe("c1");
  });

  it("withholds discount when price is withheld (no-price rule)", () => {
    const oos = { ...stockAvailable, quantity_available: 0, quantity_atp: 0, replenishment_eta: null };
    const r = buildPartSearchResult({
      catalog,
      stock: oos,
      price: priceRow,
      discountCandidates: [eligibleCandidate({ discount_value: 50 })],
    });
    expect(r.unit_price).toBeNull();
    expect(r.discounted_unit_price).toBeNull();
    expect(r.campaign_id).toBeNull();
    expect(r.discount_pct).toBe(0);
    expect(r.original_unit_price).toBeNull();
  });
});
