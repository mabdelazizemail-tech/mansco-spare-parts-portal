import { validatePartRow } from "./parts-schemas";

export interface ValidatedPartRow {
  index: number;
  data: Record<string, string>;
  valid: boolean;
  errors: string[];
}

/**
 * Validate every row in a parsed parts CSV/XLSX.
 */
export function validatePartRows(
  rows: Record<string, string>[],
): ValidatedPartRow[] {
  return rows.map((row, index) => {
    const validation = validatePartRow(row);
    return {
      index: index + 1,
      data: row,
      valid: validation.valid,
      errors: validation.errors,
    };
  });
}

/** True if every row passed validation. */
export function allPartRowsValid(rows: ValidatedPartRow[]): boolean {
  return rows.every((r) => r.valid);
}
