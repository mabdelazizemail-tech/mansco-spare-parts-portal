import { describe, it, expect } from "vitest";
import { generatePartsTemplate } from "@/lib/csv/parts-template-generator";

describe("Parts Template Generator", () => {
  it("generates non-empty CSV", () => {
    const t = generatePartsTemplate();
    expect(t).toBeTruthy();
    expect(typeof t).toBe("string");
  });

  it("has exactly 7 columns in header", () => {
    const header = generatePartsTemplate().split("\n")[0];
    const columns = header.split(",");
    expect(columns).toEqual(["Part Number", "Name (EN)", "Name (AR)", "Category", "Model", "Price", "Currency"]);
    expect(columns).toHaveLength(7);
  });

  it("contains exactly 3 example rows + 1 header", () => {
    const lines = generatePartsTemplate().split("\n");
    expect(lines).toHaveLength(4);
  });

  it("includes the canonical sample part numbers", () => {
    const t = generatePartsTemplate();
    expect(t).toContain("PSA-4249.34");
    expect(t).toContain("PSA-1234.56");
    expect(t).toContain("PSA-7890.12");
  });

  it("includes Arabic names in example rows", () => {
    const t = generatePartsTemplate();
    expect(t).toContain("طقم تيل فرامل");
    expect(t).toContain("فلتر زيت");
    expect(t).toContain("فلتر هواء");
  });

  it("all example rows use EGP currency", () => {
    const dataLines = generatePartsTemplate().split("\n").slice(1);
    for (const line of dataLines) {
      const parts = line.split(",");
      expect(parts[parts.length - 1]).toBe("EGP");
    }
  });

  it("all example rows have a positive numeric price", () => {
    const dataLines = generatePartsTemplate().split("\n").slice(1);
    for (const line of dataLines) {
      const parts = line.split(",");
      const price = Number(parts[5]);
      expect(price).toBeGreaterThan(0);
    }
  });

  it("each line has exactly 6 commas (7 fields)", () => {
    const lines = generatePartsTemplate().split("\n");
    for (const line of lines) {
      const commas = (line.match(/,/g) || []).length;
      expect(commas).toBe(6);
    }
  });

  it("generates consistent output across calls", () => {
    expect(generatePartsTemplate()).toBe(generatePartsTemplate());
  });
});
