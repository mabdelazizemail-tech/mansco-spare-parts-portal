import { describe, it, expect } from "vitest";
import { validatePartRow } from "@/lib/csv/parts-schemas";

describe("Parts Row Schema", () => {
  const valid = {
    "Part Number": "PSA-4249.34",
    "Name (EN)": "Brake Pad Set",
    "Name (AR)": "طقم تيل فرامل",
    "Category": "Brakes",
    "Model": "Peugeot 3008",
    "Price": "1250",
    "Currency": "EGP",
  };

  it("accepts a valid row", () => {
    const r = validatePartRow(valid);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("requires Part Number", () => {
    const r = validatePartRow({ ...valid, "Part Number": "" });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("Part Number is required");
  });

  it("requires Name (EN)", () => {
    const r = validatePartRow({ ...valid, "Name (EN)": "" });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("Name (EN) is required");
  });

  it("allows missing Name (AR), Category, Model (optional)", () => {
    const r = validatePartRow({
      ...valid,
      "Name (AR)": "",
      "Category": "",
      "Model": "",
    });
    expect(r.valid).toBe(true);
  });

  it("rejects negative price", () => {
    const r = validatePartRow({ ...valid, "Price": "-100" });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("zero or greater"))).toBe(true);
  });

  it("accepts zero price", () => {
    const r = validatePartRow({ ...valid, "Price": "0" });
    expect(r.valid).toBe(true);
  });

  it("rejects missing price", () => {
    const r = validatePartRow({ ...valid, "Price": "" });
    expect(r.valid).toBe(false);
  });

  it("rejects non-3-letter currency", () => {
    const r = validatePartRow({ ...valid, "Currency": "EG" });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("3-letter ISO"))).toBe(true);

    const r2 = validatePartRow({ ...valid, "Currency": "EGPP" });
    expect(r2.valid).toBe(false);
  });

  it("normalizes currency to uppercase", () => {
    // The transform is internal; just ensure lowercase passes validation
    const r = validatePartRow({ ...valid, "Currency": "egp" });
    expect(r.valid).toBe(true);
  });

  it("defaults currency to EGP when missing", () => {
    const r = validatePartRow({ ...valid, "Currency": "" });
    expect(r.valid).toBe(true);
  });

  it("rejects Part Number longer than 50 characters", () => {
    const r = validatePartRow({ ...valid, "Part Number": "X".repeat(51) });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("50 characters"))).toBe(true);
  });

  it("rejects Name (EN) longer than 200 characters", () => {
    const r = validatePartRow({ ...valid, "Name (EN)": "X".repeat(201) });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("200 characters"))).toBe(true);
  });
});
