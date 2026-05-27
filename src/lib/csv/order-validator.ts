import { validateOrderRow } from "./order-schemas";

export interface ValidatedOrderRow {
  index: number;
  data: Record<string, string>;
  valid: boolean;
  errors: string[];
}

export function validateOrderRows(
  rows: Record<string, string>[],
): ValidatedOrderRow[] {
  return rows.map((row, index) => {
    const validation = validateOrderRow(row);
    return {
      index: index + 1,
      data: row,
      valid: validation.valid,
      errors: validation.errors,
    };
  });
}

export function allOrderRowsValid(rows: ValidatedOrderRow[]): boolean {
  return rows.every((r) => r.valid);
}
