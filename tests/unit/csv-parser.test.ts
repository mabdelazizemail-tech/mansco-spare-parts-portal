import { describe, it, expect } from "vitest";
import { parseCSVFile } from "@/lib/csv/parser";

/**
 * NOTE: Full parseCSVFile tests require browser File API and FileReader.
 * These tests are browser-focused and cannot be easily mocked in Node environment.
 * Integration tests in E2E suite cover the full parsing flow.
 *
 * These unit tests cover the validation logic within the parser function.
 */

describe("CSV Parser - File Validation", () => {
  it("should reject non-CSV files by file extension", async () => {
    const file = new File(["data"], "test.txt", { type: "text/plain" });

    const result = await parseCSVFile(file);

    expect(result.errors).toContain("File must be a CSV file");
    expect(result.rows).toHaveLength(0);
  });

  it("should reject files without .csv extension", async () => {
    const file = new File(["data"], "test.xlsx", { type: "application/vnd.ms-excel" });

    const result = await parseCSVFile(file);

    expect(result.errors).toContain("File must be a CSV file");
  });

  it("should return error when no file is selected", async () => {
    // @ts-ignore - testing null case
    const result = await parseCSVFile(null);

    expect(result.errors).toContain("No file selected");
    expect(result.rows).toHaveLength(0);
  });


  it("should have proper error messages for validation failures", async () => {
    const file = new File(["data"], "test.txt");

    const result = await parseCSVFile(file);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(typeof result.errors[0]).toBe("string");
  });
});
