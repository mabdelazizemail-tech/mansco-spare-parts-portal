import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParseResult {
  rows: Record<string, string>[];
  errors: string[];
}

// Required columns for order bulk upload (dealer-facing)
// Note: Description, Discount Value, Min Order Quantity are retrieved from catalog, not from CSV
const REQUIRED_COLUMNS = [
  "Part Number",
  "Quantity",
];

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

function isCSV(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv");
}

function isXLSX(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith(".xlsx") || n.endsWith(".xls");
}

function normalizeRows(raw: unknown[]): Record<string, string>[] {
  return raw.map((row) => {
    const stringRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      stringRow[key.trim()] = String(value ?? "").trim();
    }
    return stringRow;
  });
}

function checkColumns(firstRow: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !(col in firstRow));
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(", ")}`);
  }
  return errors;
}

async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      transformHeader: (h) => h.trim(),
      skipEmptyLines: true,
      worker: false,
      complete: (results) => {
        const errors: string[] = [];

        if (!results.data || results.data.length === 0) {
          errors.push("File is empty, please select a valid file");
          resolve({ rows: [], errors });
          return;
        }

        const firstRow = results.data[0] as Record<string, unknown>;
        errors.push(...checkColumns(firstRow));

        if (errors.length > 0) {
          resolve({ rows: [], errors });
          return;
        }

        resolve({ rows: normalizeRows(results.data), errors: [] });
      },
      error: (err) => {
        resolve({ rows: [], errors: [`Failed to parse CSV: ${err.message}`] });
      },
    });
  });
}

async function parseXLSX(file: File): Promise<ParseResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { rows: [], errors: ["Excel file has no sheets"] };
    }
    const sheet = workbook.Sheets[sheetName];

    // defval: "" so empty cells become "" not undefined; raw: false so dates/numbers come out as strings
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });

    if (data.length === 0) {
      return { rows: [], errors: ["File is empty, please select a valid file"] };
    }

    const firstRow = data[0];
    const colErrors = checkColumns(firstRow);
    if (colErrors.length > 0) {
      return { rows: [], errors: colErrors };
    }

    return { rows: normalizeRows(data), errors: [] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { rows: [], errors: [`Failed to parse Excel file: ${msg}`] };
  }
}

/**
 * Parse a CSV or XLSX file and validate structure.
 *
 * - Detects format by file extension (.csv vs .xlsx/.xls)
 * - Caps file size at 5MB to prevent tab freezes
 * - Validates required columns are present
 * - Returns row data normalized to Record<string, string>
 */
export async function parseCSVFile(file: File): Promise<ParseResult> {
  if (!file) {
    return { rows: [], errors: ["No file selected"] };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      rows: [],
      errors: [`File too large (max ${MAX_FILE_BYTES / 1024 / 1024}MB)`],
    };
  }

  if (isCSV(file)) {
    return parseCSV(file);
  }

  if (isXLSX(file)) {
    return parseXLSX(file);
  }

  return { rows: [], errors: ["File must be a CSV or Excel file (.csv, .xlsx)"] };
}
