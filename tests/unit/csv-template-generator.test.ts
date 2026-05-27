import { describe, it, expect } from "vitest";
import { generateCampaignItemsTemplate } from "@/lib/csv/template-generator";

/**
 * The template now has 4 columns — Discount Type is set at the campaign level
 * (in the wizard), not per row.
 */
describe("CSV Template Generator", () => {
  it("should generate valid CSV template", () => {
    const template = generateCampaignItemsTemplate();

    expect(template).toBeTruthy();
    expect(typeof template).toBe("string");
    expect(template).toContain("Part Number");
    expect(template).toContain("Description");
    expect(template).toContain("Discount Value");
    expect(template).toContain("Min Order Quantity");
  });

  it("should NOT contain a Discount Type column (campaign-level now)", () => {
    const template = generateCampaignItemsTemplate();
    const header = template.split("\n")[0];
    const columns = header.split(",");

    expect(columns).not.toContain("Discount Type");
  });

  it("should have exactly 4 columns in header", () => {
    const template = generateCampaignItemsTemplate();
    const header = template.split("\n")[0];
    const columns = header.split(",");

    expect(columns).toEqual(["Part Number", "Description", "Discount Value", "Min Order Quantity"]);
    expect(columns).toHaveLength(4);
  });

  it("should include 3 example rows", () => {
    const template = generateCampaignItemsTemplate();
    const lines = template.split("\n");

    expect(lines.length).toBe(4); // 1 header + 3 examples
  });

  it("should include canonical example part numbers", () => {
    const template = generateCampaignItemsTemplate();

    expect(template).toContain("PSA-4249.34");
    expect(template).toContain("PSA-1234.56");
    expect(template).toContain("PSA-7890.12");
    expect(template).toContain("Brake Pad Set");
    expect(template).toContain("Oil Filter");
    expect(template).toContain("Air Filter");
  });

  it("should have correctly formatted example rows", () => {
    const template = generateCampaignItemsTemplate();

    expect(template).toContain("PSA-4249.34,Brake Pad Set,10,1");
    expect(template).toContain("PSA-1234.56,Oil Filter,15,2");
    expect(template).toContain("PSA-7890.12,Air Filter,5,1");
  });

  it("should have header as first line", () => {
    const template = generateCampaignItemsTemplate();
    const lines = template.split("\n");

    expect(lines[0]).toBe("Part Number,Description,Discount Value,Min Order Quantity");
  });

  it("should have exactly 3 commas per line (4 fields)", () => {
    const template = generateCampaignItemsTemplate();
    const lines = template.split("\n");

    for (const line of lines) {
      const commaCount = (line.match(/,/g) || []).length;
      expect(commaCount).toBe(3);
    }
  });

  it("should have no trailing newline that creates empty rows", () => {
    const template = generateCampaignItemsTemplate();
    const lines = template.split("\n");

    expect(lines[lines.length - 1]).not.toBe("");
  });

  it("should have valid numeric values for discount and quantity", () => {
    const template = generateCampaignItemsTemplate();
    const dataLines = template.split("\n").slice(1);

    for (const line of dataLines) {
      const [, , discountValue, minQty] = line.split(",");
      expect(Number(discountValue)).toBeGreaterThan(0);
      expect(Number(minQty)).toBeGreaterThanOrEqual(1);
    }
  });

  it("should generate consistent output across calls", () => {
    expect(generateCampaignItemsTemplate()).toBe(generateCampaignItemsTemplate());
  });

  it("should have no leading or trailing whitespace in values", () => {
    const template = generateCampaignItemsTemplate();
    const dataLines = template.split("\n").slice(1);

    for (const line of dataLines) {
      const values = line.split(",");
      for (const value of values) {
        expect(value).not.toMatch(/^\s/);
        expect(value).not.toMatch(/\s$/);
      }
    }
  });
});
