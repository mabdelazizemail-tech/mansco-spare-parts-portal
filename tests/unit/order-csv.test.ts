import { describe, it, expect } from "vitest";
import { validateOrderRow } from "@/lib/csv/order-schemas";
import { validateOrderRows, allOrderRowsValid } from "@/lib/csv/order-validator";
import { generateOrderTemplate } from "@/lib/csv/order-template-generator";

const valid = { "Part Number": "PSA-4249.34", "Quantity": "5" };

describe("Order Row Schema (structural)", () => {
  it("accepts a valid row", () => {
    const r = validateOrderRow(valid);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("requires Part Number", () => {
    const r = validateOrderRow({ ...valid, "Part Number": "" });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("Part Number is required");
  });

  it("rejects Part Number longer than 50 chars", () => {
    const r = validateOrderRow({ ...valid, "Part Number": "X".repeat(51) });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("50 characters"))).toBe(true);
  });

  it("rejects missing Quantity", () => {
    const r = validateOrderRow({ ...valid, "Quantity": "" });
    expect(r.valid).toBe(false);
  });

  it("rejects non-numeric Quantity", () => {
    const r = validateOrderRow({ ...valid, "Quantity": "abc" });
    expect(r.valid).toBe(false);
  });

  it("rejects zero quantity", () => {
    const r = validateOrderRow({ ...valid, "Quantity": "0" });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("at least 1"))).toBe(true);
  });

  it("rejects negative quantity", () => {
    const r = validateOrderRow({ ...valid, "Quantity": "-3" });
    expect(r.valid).toBe(false);
  });

  it("rejects non-integer quantity (fractional)", () => {
    const r = validateOrderRow({ ...valid, "Quantity": "1.5" });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("whole number"))).toBe(true);
  });

  it("accepts quantity = 1", () => {
    const r = validateOrderRow({ ...valid, "Quantity": "1" });
    expect(r.valid).toBe(true);
  });
});

describe("Order Validator (rows)", () => {
  it("validates multiple rows", () => {
    const r = validateOrderRows([valid, { ...valid, "Part Number": "PSA-9999" }]);
    expect(r).toHaveLength(2);
    expect(r.every((row) => row.valid)).toBe(true);
  });

  it("flags mixed rows correctly", () => {
    const r = validateOrderRows([
      valid,
      { ...valid, "Part Number": "" },
      { ...valid, "Quantity": "0" },
    ]);
    expect(r[0].valid).toBe(true);
    expect(r[1].valid).toBe(false);
    expect(r[2].valid).toBe(false);
    expect(allOrderRowsValid(r)).toBe(false);
  });

  it("uses 1-based indexing", () => {
    const r = validateOrderRows([valid, valid, valid]);
    expect(r.map((row) => row.index)).toEqual([1, 2, 3]);
  });

  it("returns valid=true for empty input", () => {
    expect(allOrderRowsValid(validateOrderRows([]))).toBe(true);
  });
});

describe("Order Template Generator", () => {
  it("has exactly 2 columns in header", () => {
    const cols = generateOrderTemplate().split("\n")[0].split(",");
    expect(cols).toEqual(["Part Number", "Quantity"]);
    expect(cols).toHaveLength(2);
  });

  it("has 3 example rows + 1 header (4 lines total)", () => {
    expect(generateOrderTemplate().split("\n")).toHaveLength(4);
  });

  it("each line has exactly 1 comma (2 fields)", () => {
    for (const line of generateOrderTemplate().split("\n")) {
      const commas = (line.match(/,/g) || []).length;
      expect(commas).toBe(1);
    }
  });

  it("example quantities are positive integers", () => {
    const dataLines = generateOrderTemplate().split("\n").slice(1);
    for (const line of dataLines) {
      const qty = Number(line.split(",")[1]);
      expect(Number.isInteger(qty)).toBe(true);
      expect(qty).toBeGreaterThanOrEqual(1);
    }
  });

  it("contains canonical sample part numbers", () => {
    const t = generateOrderTemplate();
    expect(t).toContain("PSA-4249.34");
    expect(t).toContain("PSA-1234.56");
    expect(t).toContain("PSA-7890.12");
  });

  it("generates consistent output across calls", () => {
    expect(generateOrderTemplate()).toBe(generateOrderTemplate());
  });
});
