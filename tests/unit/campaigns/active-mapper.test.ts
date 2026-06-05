import { describe, it, expect } from "vitest";
import { toActiveCampaign, discountLabelFromItems } from "@/lib/campaigns/active-mapper";

describe("discountLabelFromItems", () => {
  it("prefers the highest percentage", () => {
    expect(discountLabelFromItems([
      { discount_type: "percentage", discount_value: 10 },
      { discount_type: "percentage", discount_value: 25 },
      { discount_type: "fixed", discount_value: 50 },
    ])).toBe("25%");
  });
  it("falls back to the highest fixed amount", () => {
    expect(discountLabelFromItems([{ discount_type: "fixed", discount_value: 50 }])).toBe("50 EGP");
  });
  it("returns null with no items", () => {
    expect(discountLabelFromItems([])).toBeNull();
  });
});

describe("toActiveCampaign", () => {
  const base = {
    id: "c1", name: "Summer", description: null, campaign_type: "discount",
    start_date: "2026-06-01", end_date: "2026-06-30", target_audience: "all",
  };
  it("maps coverImageUrl when present", () => {
    const out = toActiveCampaign({ ...base, cover_image_url: "https://x/y.jpg", campaign_items: [] });
    expect(out.coverImageUrl).toBe("https://x/y.jpg");
    expect(out.description).toBe("");
    expect(out.itemCount).toBe(0);
  });
  it("defaults coverImageUrl to null when absent", () => {
    const out = toActiveCampaign({ ...base, campaign_items: [{ discount_type: "percentage", discount_value: 15 }] });
    expect(out.coverImageUrl).toBeNull();
    expect(out.discountLabel).toBe("15%");
    expect(out.itemCount).toBe(1);
  });
});
