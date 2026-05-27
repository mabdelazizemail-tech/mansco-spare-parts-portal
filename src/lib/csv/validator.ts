import { validateCampaignItemRow, type DiscountType } from "./schemas";

export interface ValidatedRow {
  index: number;
  data: Record<string, string>;
  valid: boolean;
  errors: string[];
}

/**
 * Validate all rows from a parsed CSV/XLSX file.
 *
 * @param rows         - The parsed row objects
 * @param discountType - The campaign-level discount type. Each row is validated
 *                       against this (e.g. percentage cap enforced when type is
 *                       "percentage").
 * @returns Array of ValidatedRow objects with validation status
 */
export function validateCSVRows(
  rows: Record<string, string>[],
  discountType: DiscountType,
): ValidatedRow[] {
  return rows.map((row, index) => {
    const validation = validateCampaignItemRow(row, discountType);
    return {
      index: index + 1,
      data: row,
      valid: validation.valid,
      errors: validation.errors,
    };
  });
}

/**
 * Check if every row in a validated set passed.
 */
export function allRowsValid(validatedRows: ValidatedRow[]): boolean {
  return validatedRows.every((row) => row.valid);
}
