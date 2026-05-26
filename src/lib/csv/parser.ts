import Papa from "papaparse";

export interface ParseResult {
  rows: Record<string, string>[];
  errors: string[];
}

const REQUIRED_COLUMNS = [
  "Part Number",
  "Description",
  "Discount Type",
  "Discount Value",
  "Min Order Quantity",
];

/**
 * Parse a CSV file and validate structure
 * @param file - The CSV file to parse
 * @returns { rows: parsed rows, errors: file-level errors }
 */
export async function parseCSVFile(file: File): Promise<ParseResult> {
  if (!file) {
    return { rows: [], errors: ["No file selected"] };
  }

  if (!file.name.endsWith(".csv")) {
    return { rows: [], errors: ["File must be a CSV file"] };
  }

  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      trimHeaders: true,
      skipEmptyLines: true,
      worker: false,
      complete: (results) => {
        const errors: string[] = [];

        // Check if file is empty
        if (!results.data || results.data.length === 0) {
          errors.push("CSV file is empty, please select a valid file");
        }

        // Check for required columns
        if (results.data && results.data.length > 0) {
          const firstRow = results.data[0] as Record<string, unknown>;
          const missingColumns = REQUIRED_COLUMNS.filter(
            (col) => !(col in firstRow)
          );
          if (missingColumns.length > 0) {
            errors.push(
              `Missing required columns: ${missingColumns.join(", ")}`
            );
          }
        }

        if (errors.length > 0) {
          resolve({ rows: [], errors });
        } else {
          // Safely convert all values to strings
          const validatedRows = (results.data as any[]).map((row) => {
            const stringRow: Record<string, string> = {};
            for (const [key, value] of Object.entries(row)) {
              stringRow[key] = String(value ?? "").trim();
            }
            return stringRow;
          });
          resolve({ rows: validatedRows, errors: [] });
        }
      },
      error: (err) => {
        resolve({
          rows: [],
          errors: [`Failed to parse CSV: ${err.message}`],
        });
      },
    });
  });
}
