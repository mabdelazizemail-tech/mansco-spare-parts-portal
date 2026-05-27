import { describe, it, expect } from "vitest";
import { validatePartRows, allPartRowsValid } from "@/lib/csv/parts-validator";

const valid = {
  "Part Number": "PSA-4249.34",
  "Name (EN)": "Brake Pad Set",
  "Name (AR)": "طقم تيل فرامل",
  "Category": "Brakes",
  "Model": "Peugeot 3008",
  "Price": "1250",
  "Currency": "EGP",
};

describe("Parts Validator", () => {
  it("validates a single valid row", () => {
    const r = validatePartRows([valid]);
    expect(r).toHaveLength(1);
    expect(r[0].valid).toBe(true);
    expect(r[0].index).toBe(1);
  });

  it("validates multiple rows", () => {
    const r = validatePartRows([
      valid,
      { ...valid, "Part Number": "PSA-1234.56" },
      { ...valid, "Part Number": "PSA-7890.12" },
    ]);
    expect(r).toHaveLength(3);
    expect(r.every((row) => row.valid)).toBe(true);
  });

  it("flags mixed valid/invalid rows correctly", () => {
    const r = validatePartRows([
      valid,
      { ...valid, "Part Number": "" },
      { ...valid, "Part Number": "PSA-1234.56" },
    ]);
    expect(r[0].valid).toBe(true);
    expect(r[1].valid).toBe(false);
    expect(r[2].valid).toBe(true);
    expect(allPartRowsValid(r)).toBe(false);
  });

  it("uses 1-based indexing", () => {
    const r = validatePartRows([valid, valid, valid]);
    expect(r[0].index).toBe(1);
    expect(r[1].index).toBe(2);
    expect(r[2].index).toBe(3);
  });

  it("preserves original row data", () => {
    const r = validatePartRows([valid]);
    expect(r[0].data).toEqual(valid);
  });

  it("handles empty input", () => {
    const r = validatePartRows([]);
    expect(r).toHaveLength(0);
    expect(allPartRowsValid(r)).toBe(true);
  });
});
