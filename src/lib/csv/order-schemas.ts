import { z } from "zod";

/**
 * Per-row schema for a dealer's order CSV/XLSX upload.
 *
 * Only 2 columns — the catalog provides everything else (name, price,
 * availability) at upload time via the bulk-lookup API.
 *
 *   Part Number, Quantity
 */
export const orderRowSchema = z.object({
  part_number: z
    .string()
    .min(1, "Part Number is required")
    .max(50, "Part Number must not exceed 50 characters")
    .trim(),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .gte(1, "Quantity must be at least 1"),
});

export type OrderRow = z.infer<typeof orderRowSchema>;

/**
 * Validate the structural shape of a single uploaded row. This does NOT
 * cover catalog/availability — that runs server-side once the part number
 * is resolved against the parts_catalog table.
 */
export function validateOrderRow(
  row: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const result = orderRowSchema.safeParse({
    part_number: row["Part Number"]?.toString().trim() || "",
    quantity:
      row["Quantity"] !== undefined && row["Quantity"] !== ""
        ? Number(row["Quantity"])
        : undefined,
  });

  if (!result.success) {
    const errors = result.error.issues?.map((e) => e.message) || ["Validation failed"];
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}
