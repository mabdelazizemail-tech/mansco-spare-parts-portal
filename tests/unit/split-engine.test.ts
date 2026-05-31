import { describe, it, expect } from "vitest";
import {
  computeSplit,
  deriveOrderStatus,
  computeSlippage,
  type SplitLineInput,
} from "@/lib/fulfillment/split-engine";

function line(over: Partial<SplitLineInput> & { line_id: string }): SplitLineInput {
  return {
    part_number: "P-1",
    quantity_requested: 10,
    atp: 10,
    unit_price: 100,
    backorder_eta: null,
    ...over,
  };
}

describe("computeSplit", () => {
  it("fully confirms when ATP >= requested", () => {
    const r = computeSplit([line({ line_id: "l1", quantity_requested: 5, atp: 10 })]);
    expect(r.lines[0].quantity_confirmed).toBe(5);
    expect(r.lines[0].quantity_backordered).toBe(0);
    expect(r.lines[0].line_status).toBe("confirmed");
    expect(r.hasBackorders).toBe(false);
    expect(r.fullyConfirmed).toBe(true);
    expect(r.needsReview).toBe(false);
  });

  it("splits when 0 < ATP < requested", () => {
    const r = computeSplit([line({ line_id: "l1", quantity_requested: 10, atp: 4 })]);
    expect(r.lines[0].quantity_confirmed).toBe(4);
    expect(r.lines[0].quantity_backordered).toBe(6);
    expect(r.lines[0].line_status).toBe("confirmed");
    expect(r.hasBackorders).toBe(true);
  });

  it("fully back-orders when ATP is 0", () => {
    const r = computeSplit([line({ line_id: "l1", quantity_requested: 8, atp: 0, backorder_eta: "2026-07-01" })]);
    expect(r.lines[0].quantity_confirmed).toBe(0);
    expect(r.lines[0].quantity_backordered).toBe(8);
    expect(r.lines[0].line_status).toBe("backordered");
    expect(r.lines[0].backorder_eta).toBe("2026-07-01");
  });

  it("treats negative ATP as zero", () => {
    const r = computeSplit([line({ line_id: "l1", quantity_requested: 3, atp: -5 })]);
    expect(r.lines[0].quantity_confirmed).toBe(0);
    expect(r.lines[0].quantity_backordered).toBe(3);
  });

  it("computes back-order value ratio across lines", () => {
    const r = computeSplit([
      line({ line_id: "a", quantity_requested: 10, atp: 10, unit_price: 100 }), // 1000 confirmed
      line({ line_id: "b", quantity_requested: 10, atp: 0, unit_price: 100 }), // 1000 backordered
    ]);
    expect(r.totalOrderValue).toBe(2000);
    expect(r.backorderValue).toBe(1000);
    expect(r.backorderRatio).toBeCloseTo(0.5);
    expect(r.needsReview).toBe(true); // > 30%
  });

  it("does not flag review when back-order ratio is at/below threshold", () => {
    const r = computeSplit([
      line({ line_id: "a", quantity_requested: 100, atp: 100, unit_price: 10 }), // 1000
      line({ line_id: "b", quantity_requested: 10, atp: 0, unit_price: 10 }), // 100 BO → ~9%
    ]);
    expect(r.backorderRatio).toBeCloseTo(100 / 1100);
    expect(r.needsReview).toBe(false);
  });

  it("clears backorder_eta on fully confirmed lines", () => {
    const r = computeSplit([line({ line_id: "l1", quantity_requested: 5, atp: 5, backorder_eta: "2026-07-01" })]);
    expect(r.lines[0].backorder_eta).toBeNull();
  });
});

describe("deriveOrderStatus", () => {
  it("approved when nothing back-ordered", () => {
    const r = computeSplit([line({ line_id: "l1", atp: 10, quantity_requested: 10 })]);
    expect(deriveOrderStatus(r)).toBe("approved");
  });
  it("partial when some confirmed and some back-ordered", () => {
    const r = computeSplit([line({ line_id: "l1", atp: 4, quantity_requested: 10 })]);
    expect(deriveOrderStatus(r)).toBe("partial");
  });
  it("back_ordered when nothing confirmed", () => {
    const r = computeSplit([line({ line_id: "l1", atp: 0, quantity_requested: 10 })]);
    expect(deriveOrderStatus(r)).toBe("back_ordered");
  });
});

describe("computeSlippage", () => {
  it("returns 0 / not-at-risk when a date is missing", () => {
    expect(computeSlippage(null, "2026-07-01")).toEqual({ slippageDays: 0, isAtRisk: false });
    expect(computeSlippage("2026-07-01", null)).toEqual({ slippageDays: 0, isAtRisk: false });
  });

  it("returns 0 when current ETA is not later than original", () => {
    expect(computeSlippage("2026-07-10", "2026-07-05").slippageDays).toBe(0);
  });

  it("computes positive slippage in days", () => {
    expect(computeSlippage("2026-07-01", "2026-07-06").slippageDays).toBe(5);
  });

  it("flags at-risk only when slippage exceeds 7 days", () => {
    expect(computeSlippage("2026-07-01", "2026-07-08").isAtRisk).toBe(false); // exactly 7
    expect(computeSlippage("2026-07-01", "2026-07-09").isAtRisk).toBe(true); // 8
  });
});
