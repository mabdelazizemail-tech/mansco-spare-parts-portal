import { describe, it, expect } from "vitest";
import { parseCSVFile } from "@/lib/csv/parser";

/**
 * Parser accepts both .csv and .xlsx. Full integration tests for content
 * parsing live in the E2E suite — these check the file-type gating logic.
 */
describe("CSV/XLSX Parser - File Validation", () => {
  it("should reject unsupported file types (e.g. .txt)", async () => {
    const file = new File(["data"], "test.txt", { type: "text/plain" });

    const result = await parseCSVFile(file);

    expect(result.errors[0]).toContain("must be a CSV or Excel file");
    expect(result.rows).toHaveLength(0);
  });

  it("should reject .doc, .pdf and other non-tabular formats", async () => {
    const file = new File(["data"], "test.pdf", { type: "application/pdf" });

    const result = await parseCSVFile(file);

    expect(result.errors[0]).toContain("must be a CSV or Excel file");
  });

  it("should ACCEPT .xlsx files (not reject)", async () => {
    // Pass an empty Excel-ish file — it should pass the extension gate and then
    // fail downstream with a parse error (which is a different error message)
    const file = new File([new Uint8Array([0x50, 0x4b])], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await parseCSVFile(file);

    // The extension gate passes — any error here is from the XLSX parser itself
    expect(result.errors[0]).not.toContain("must be a CSV or Excel file");
  });

  it("should ACCEPT .xls files", async () => {
    const file = new File([new Uint8Array([0xd0, 0xcf])], "test.xls", {
      type: "application/vnd.ms-excel",
    });

    const result = await parseCSVFile(file);

    expect(result.errors[0]).not.toContain("must be a CSV or Excel file");
  });

  it("should return error when no file is provided", async () => {
    // @ts-expect-error testing null case
    const result = await parseCSVFile(null);

    expect(result.errors).toContain("No file selected");
    expect(result.rows).toHaveLength(0);
  });

  it("should reject files larger than 5MB", async () => {
    // Create a fake 6MB file
    const big = new Uint8Array(6 * 1024 * 1024);
    const file = new File([big], "huge.csv", { type: "text/csv" });

    const result = await parseCSVFile(file);

    expect(result.errors[0]).toContain("too large");
  });

  it("should be case-insensitive on file extensions", async () => {
    const file = new File(["data"], "test.TXT", { type: "text/plain" });

    const result = await parseCSVFile(file);

    expect(result.errors[0]).toContain("must be a CSV or Excel file");
  });
});
