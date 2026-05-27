import { describe, it, expect } from "vitest";
import { validateCSVRows, allRowsValid } from "@/lib/csv/validator";

/**
 * The validator API takes the campaign-level discount type as a second
 * argument — it's no longer per row. Test both branches.
 */
describe("CSV Validator", () => {
  const validRow = {
    "Part Number": "PSA-4249.34",
    "Description": "Brake Pad Set",
    "Discount Value": "10",
    "Min Order Quantity": "1",
  };

  it("should validate a valid row (percentage campaign)", () => {
    const validated = validateCSVRows([validRow], "percentage");

    expect(validated).toHaveLength(1);
    expect(validated[0].valid).toBe(true);
    expect(validated[0].errors).toHaveLength(0);
    expect(validated[0].index).toBe(1);
  });

  it("should validate a valid row (fixed campaign)", () => {
    const validated = validateCSVRows([{ ...validRow, "Discount Value": "150" }], "fixed");

    expect(validated[0].valid).toBe(true);
  });

  it("should validate multiple valid rows", () => {
    const rows = [
      validRow,
      { ...validRow, "Part Number": "PSA-1234.56", "Description": "Oil Filter", "Discount Value": "20" },
    ];

    const validated = validateCSVRows(rows, "percentage");

    expect(validated).toHaveLength(2);
    expect(validated[0].valid).toBe(true);
    expect(validated[1].valid).toBe(true);
  });

  it("should reject row with missing part number", () => {
    const validated = validateCSVRows([{ ...validRow, "Part Number": "" }], "percentage");

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors[0]).toContain("Part Number is required");
  });

  it("should reject row with non-numeric discount value", () => {
    const validated = validateCSVRows([{ ...validRow, "Discount Value": "abc" }], "percentage");

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.length).toBeGreaterThan(0);
  });

  it("should reject percentage > 100 when campaign is percentage", () => {
    const validated = validateCSVRows([{ ...validRow, "Discount Value": "150" }], "percentage");

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.some((e) => e.includes("cannot exceed 100%"))).toBe(true);
  });

  it("should ALLOW value > 100 when campaign is fixed (no cap on fixed amounts)", () => {
    const validated = validateCSVRows([{ ...validRow, "Discount Value": "500" }], "fixed");

    expect(validated[0].valid).toBe(true);
  });

  it("should accept percentage <= 100", () => {
    const validated = validateCSVRows([{ ...validRow, "Discount Value": "100" }], "percentage");

    expect(validated[0].valid).toBe(true);
  });

  it("should reject discount value <= 0", () => {
    const validated = validateCSVRows([{ ...validRow, "Discount Value": "0" }], "percentage");

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.some((e) => e.includes("greater than 0"))).toBe(true);
  });

  it("should reject non-integer min order quantity", () => {
    const validated = validateCSVRows([{ ...validRow, "Min Order Quantity": "1.5" }], "percentage");

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.some((e) => e.includes("whole number"))).toBe(true);
  });

  it("should reject min order quantity < 1", () => {
    const validated = validateCSVRows([{ ...validRow, "Min Order Quantity": "0" }], "percentage");

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.some((e) => e.includes("at least 1"))).toBe(true);
  });

  it("should reject description exceeding 200 characters", () => {
    const validated = validateCSVRows([{ ...validRow, "Description": "A".repeat(201) }], "percentage");

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.some((e) => e.includes("200 characters"))).toBe(true);
  });

  it("should allow description up to 200 characters", () => {
    const validated = validateCSVRows([{ ...validRow, "Description": "A".repeat(200) }], "percentage");

    expect(validated[0].valid).toBe(true);
  });

  it("should allow empty/missing description", () => {
    const validated = validateCSVRows([{ ...validRow, "Description": "" }], "percentage");

    expect(validated[0].valid).toBe(true);
  });

  it("should use 1-based indexing for row numbers", () => {
    const rows = [validRow, { ...validRow, "Part Number": "PSA-1234.56" }];

    const validated = validateCSVRows(rows, "percentage");

    expect(validated[0].index).toBe(1);
    expect(validated[1].index).toBe(2);
  });

  it("should detect when all rows are valid", () => {
    const validated = validateCSVRows([validRow, { ...validRow, "Part Number": "PSA-1234.56" }], "percentage");

    expect(allRowsValid(validated)).toBe(true);
  });

  it("should detect when not all rows are valid", () => {
    const validated = validateCSVRows(
      [validRow, { ...validRow, "Part Number": "" }],
      "percentage",
    );

    expect(allRowsValid(validated)).toBe(false);
  });

  it("should handle empty rows array", () => {
    const validated = validateCSVRows([], "percentage");

    expect(validated).toHaveLength(0);
    expect(allRowsValid(validated)).toBe(true);
  });

  it("should preserve original row data in validated result", () => {
    const validated = validateCSVRows([validRow], "percentage");

    expect(validated[0].data).toEqual(validRow);
  });
});
