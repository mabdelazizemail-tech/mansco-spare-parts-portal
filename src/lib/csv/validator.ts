import { validateCampaignItemRow } from "./schemas";

export interface ValidatedRow {
  index: number;
  data: Record<string, string>;
  valid: boolean;
  errors: string[];
}

/**
 * Validate all rows from parsed CSV
 * @param rows - Array of parsed CSV rows
 * @returns Array of ValidatedRow objects with validation status
 */
export function validateCSVRows(
  rows: Record<string, string>[]
): ValidatedRow[] {
  return rows.map((row, index) => {
    const validation = validateCampaignItemRow(row);
    return {
      index: index + 1,
      data: row,
      valid: validation.valid,
      errors: validation.errors,
    };
  });
}

/**
 * Check if all rows are valid
 */
export function allRowsValid(validatedRows: ValidatedRow[]): boolean {
  return validatedRows.every((row) => row.valid);
}
