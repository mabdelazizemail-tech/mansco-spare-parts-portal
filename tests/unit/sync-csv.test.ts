import { describe, it, expect } from "vitest";
import { parseCsv, csvCell, toCsv } from "@/lib/sync/csv";

describe("parseCsv", () => {
  it("parses headers (lower-cased) and rows", () => {
    const rows = parseCsv("Part_Number,Qty\nABC,5\nDEF,7");
    expect(rows).toEqual([
      { part_number: "ABC", qty: "5" },
      { part_number: "DEF", qty: "7" },
    ]);
  });

  it("strips a BOM and trims cells", () => {
    const rows = parseCsv("﻿a,b\n x , y ");
    expect(rows).toEqual([{ a: "x", b: "y" }]);
  });

  it("handles quoted fields with commas, escaped quotes, and newlines", () => {
    const rows = parseCsv('name,note\n"Brake, Pad","He said ""hi""\nsecond line"');
    expect(rows[0].name).toBe("Brake, Pad");
    expect(rows[0].note).toBe('He said "hi"\nsecond line');
  });

  it("handles CRLF line endings and skips blank lines", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n\r\n3,4\r\n");
    expect(rows).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("returns [] for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("csvCell", () => {
  it("quotes cells containing comma, quote, or newline", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });
  it("renders null/undefined as empty", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(0)).toBe("0");
  });
});

describe("toCsv", () => {
  it("serializes rows in column order with a header", () => {
    const csv = toCsv(
      [{ a: 1, b: "x,y" }],
      [
        { header: "A", key: "a" as const },
        { header: "B", key: "b" as const },
      ]
    );
    expect(csv).toBe('A,B\r\n1,"x,y"');
  });

  it("round-trips through parseCsv", () => {
    const rows = [{ part: "ABC", qty: 5 }];
    const csv = toCsv(rows, [
      { header: "part", key: "part" as const },
      { header: "qty", key: "qty" as const },
    ]);
    expect(parseCsv(csv)).toEqual([{ part: "ABC", qty: "5" }]);
  });

  it("emits only the header for an empty row set", () => {
    expect(toCsv([], [{ header: "A", key: "a" as const }])).toBe("A");
  });
});
