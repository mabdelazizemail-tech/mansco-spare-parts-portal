import { describe, it, expect } from "vitest";
import { validateCSVRows, allRowsValid } from "@/lib/csv/validator";

describe("CSV Validator", () => {
  it("should validate a valid row", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated).toHaveLength(1);
    expect(validated[0].valid).toBe(true);
    expect(validated[0].errors).toHaveLength(0);
    expect(validated[0].index).toBe(1);
  });

  it("should validate multiple valid rows", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
      {
        "Part Number": "PSA-1234.56",
        "Description": "Oil Filter",
        "Discount Type": "Fixed",
        "Discount Value": "150",
        "Min Order Quantity": "2",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated).toHaveLength(2);
    expect(validated[0].valid).toBe(true);
    expect(validated[1].valid).toBe(true);
  });

  it("should reject row with missing part number", () => {
    const rows = [
      {
        "Part Number": "",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.length).toBeGreaterThan(0);
    expect(validated[0].errors[0]).toContain("Part Number is required");
  });

  it("should reject row with invalid discount value", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "abc",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.length).toBeGreaterThan(0);
  });

  it("should reject percentage > 100", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "150",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.some((e) => e.includes("cannot exceed 100%"))).toBe(true);
  });

  it("should accept percentage <= 100", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "100",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(true);
  });

  it("should accept case-insensitive discount type", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "PERCENTAGE",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(true);
  });

  it("should accept lowercase discount type", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "percentage",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(true);
  });

  it("should accept 'Fixed' discount type", () => {
    const rows = [
      {
        "Part Number": "PSA-1234.56",
        "Description": "Oil Filter",
        "Discount Type": "Fixed",
        "Discount Value": "150",
        "Min Order Quantity": "2",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(true);
  });

  it("should reject invalid discount type", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "InvalidType",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.length).toBeGreaterThan(0);
    expect(validated[0].errors.some((e) => e.toLowerCase().includes("percentage") || e.toLowerCase().includes("fixed"))).toBe(true);
  });

  it("should reject discount value <= 0", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "0",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.some((e) => e.includes("greater than 0"))).toBe(true);
  });

  it("should reject non-integer min order quantity", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "10",
        "Min Order Quantity": "1.5",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.some((e) => e.includes("whole number"))).toBe(true);
  });

  it("should reject min order quantity < 1", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "10",
        "Min Order Quantity": "0",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.some((e) => e.includes("at least 1"))).toBe(true);
  });

  it("should reject description exceeding 200 characters", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "A".repeat(201),
        "Discount Type": "Percentage",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.some((e) => e.includes("200 characters"))).toBe(true);
  });

  it("should allow description up to 200 characters", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "A".repeat(200),
        "Discount Type": "Percentage",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(true);
  });

  it("should use 1-based indexing for row numbers", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
      {
        "Part Number": "PSA-1234.56",
        "Description": "Oil Filter",
        "Discount Type": "Fixed",
        "Discount Value": "150",
        "Min Order Quantity": "2",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].index).toBe(1);
    expect(validated[1].index).toBe(2);
  });

  it("should detect when all rows are valid", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
      {
        "Part Number": "PSA-1234.56",
        "Description": "Oil Filter",
        "Discount Type": "Fixed",
        "Discount Value": "150",
        "Min Order Quantity": "2",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(allRowsValid(validated)).toBe(true);
  });

  it("should detect when not all rows are valid", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
      {
        "Part Number": "",
        "Description": "Oil Filter",
        "Discount Type": "Fixed",
        "Discount Value": "150",
        "Min Order Quantity": "2",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(allRowsValid(validated)).toBe(false);
  });

  it("should handle empty rows array", () => {
    const rows: any[] = [];

    const validated = validateCSVRows(rows);

    expect(validated).toHaveLength(0);
    expect(allRowsValid(validated)).toBe(true);
  });

  it("should preserve original row data in validated result", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].data).toEqual(rows[0]);
  });
});
