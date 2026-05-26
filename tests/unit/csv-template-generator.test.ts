import { describe, it, expect } from "vitest";
import { generateCampaignItemsTemplate } from "@/lib/csv/template-generator";

describe("CSV Template Generator", () => {
  it("should generate valid CSV template", () => {
    const template = generateCampaignItemsTemplate();

    expect(template).toBeTruthy();
    expect(typeof template).toBe("string");
    expect(template).toContain("Part Number");
    expect(template).toContain("Description");
    expect(template).toContain("Discount Type");
    expect(template).toContain("Discount Value");
    expect(template).toContain("Min Order Quantity");
  });

  it("should have all required columns in header", () => {
    const template = generateCampaignItemsTemplate();

    const lines = template.split("\n");
    const header = lines[0];

    const columns = header.split(",");

    expect(columns).toContain("Part Number");
    expect(columns).toContain("Description");
    expect(columns).toContain("Discount Type");
    expect(columns).toContain("Discount Value");
    expect(columns).toContain("Min Order Quantity");
    expect(columns).toHaveLength(5);
  });

  it("should include example rows", () => {
    const template = generateCampaignItemsTemplate();

    expect(template).toContain("PSA-4249.34");
    expect(template).toContain("Brake Pad Set");
    expect(template).toContain("Percentage");
    expect(template).toContain("10");
  });

  it("should include multiple example rows", () => {
    const template = generateCampaignItemsTemplate();

    expect(template).toContain("PSA-4249.34");
    expect(template).toContain("PSA-1234.56");
    expect(template).toContain("PSA-7890.12");
    expect(template).toContain("Oil Filter");
    expect(template).toContain("Air Filter");
  });

  it("should have correct example values", () => {
    const template = generateCampaignItemsTemplate();

    expect(template).toContain("PSA-4249.34,Brake Pad Set,Percentage,10,1");
    expect(template).toContain("PSA-1234.56,Oil Filter,Fixed,150,2");
    expect(template).toContain("PSA-7890.12,Air Filter,Percentage,15,1");
  });

  it("should have header as first line", () => {
    const template = generateCampaignItemsTemplate();

    const lines = template.split("\n");

    expect(lines[0]).toBe("Part Number,Description,Discount Type,Discount Value,Min Order Quantity");
  });

  it("should have 3 example data rows", () => {
    const template = generateCampaignItemsTemplate();

    const lines = template.split("\n");

    expect(lines.length).toBe(4); // 1 header + 3 examples
  });

  it("should generate template with proper CSV formatting", () => {
    const template = generateCampaignItemsTemplate();

    const lines = template.split("\n");

    // Verify no trailing newlines that would create empty lines
    expect(lines[lines.length - 1]).not.toBe("");

    // Verify each line has 5 comma-separated values
    for (const line of lines) {
      const fields = line.split(",");
      expect(fields).toHaveLength(5);
    }
  });

  it("should have percentage discount examples", () => {
    const template = generateCampaignItemsTemplate();

    expect(template).toContain("Percentage");
    const percentageMatches = (template.match(/Percentage/g) || []).length;
    expect(percentageMatches).toBeGreaterThanOrEqual(2);
  });

  it("should have fixed discount examples", () => {
    const template = generateCampaignItemsTemplate();

    expect(template).toContain("Fixed");
  });

  it("should have valid numeric values for discount and quantity", () => {
    const template = generateCampaignItemsTemplate();

    const lines = template.split("\n").slice(1); // Skip header

    for (const line of lines) {
      const [, , , discountValue, minQty] = line.split(",");
      expect(Number(discountValue)).toBeGreaterThan(0);
      expect(Number(minQty)).toBeGreaterThanOrEqual(1);
    }
  });

  it("should generate consistent output", () => {
    const template1 = generateCampaignItemsTemplate();
    const template2 = generateCampaignItemsTemplate();

    expect(template1).toBe(template2);
  });

  it("should be downloadable as CSV string", () => {
    const template = generateCampaignItemsTemplate();

    // Should be able to be used directly as CSV content
    expect(template.length).toBeGreaterThan(0);
    expect(template.includes("\n")).toBe(true);
    expect(template.split(",").length).toBeGreaterThan(5);
  });

  it("should follow proper CSV format without extra commas", () => {
    const template = generateCampaignItemsTemplate();

    const lines = template.split("\n");
    for (const line of lines) {
      // Each line should have exactly 4 commas (separating 5 fields)
      const commaCount = (line.match(/,/g) || []).length;
      expect(commaCount).toBe(4);
    }
  });

  it("should contain no trailing or leading whitespace in values", () => {
    const template = generateCampaignItemsTemplate();

    // Check that values are properly formatted without extra spaces
    const lines = template.split("\n");
    const dataLines = lines.slice(1); // Skip header

    for (const line of dataLines) {
      const values = line.split(",");
      for (const value of values) {
        expect(value).not.toMatch(/^\s/);  // No leading whitespace
        expect(value).not.toMatch(/\s$/);  // No trailing whitespace
      }
    }
  });
});
