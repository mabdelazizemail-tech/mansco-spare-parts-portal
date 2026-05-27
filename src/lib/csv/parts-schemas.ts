import { z } from "zod";

/**
 * Per-row schema for parts catalog bulk upload.
 *
 * Columns:
 *   Part Number, Name (EN), Name (AR), Category, Model, Price, Currency
 *
 * Price/Currency are written to a designated "Admin Bulk Upload" price list
 * (or whichever the API route chooses); they're not stored on the part record
 * itself.
 */
export const partRowSchema = z.object({
  part_number: z
    .string()
    .min(1, "Part Number is required")
    .max(50, "Part Number must not exceed 50 characters")
    .trim(),
  name_en: z
    .string()
    .min(1, "Name (EN) is required")
    .max(200, "Name (EN) must not exceed 200 characters")
    .trim(),
  name_ar: z
    .string()
    .max(200, "Name (AR) must not exceed 200 characters")
    .nullish(),
  category: z
    .string()
    .max(100, "Category must not exceed 100 characters")
    .nullish(),
  model: z
    .string()
    .max(100, "Model must not exceed 100 characters")
    .nullish(),
  price: z
    .number()
    .gte(0, "Price must be zero or greater"),
  currency: z
    .string()
    .min(3, "Currency must be a 3-letter ISO code (e.g. EGP, USD)")
    .max(3, "Currency must be a 3-letter ISO code (e.g. EGP, USD)")
    .transform((v) => v.toUpperCase()),
});

export type PartRow = z.infer<typeof partRowSchema>;

/**
 * Validate a single parts row from a parsed CSV/XLSX.
 */
export function validatePartRow(
  row: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const result = partRowSchema.safeParse({
    part_number: row["Part Number"]?.toString().trim() || "",
    name_en: row["Name (EN)"]?.toString().trim() || "",
    name_ar: row["Name (AR)"]?.toString().trim() || null,
    category: row["Category"]?.toString().trim() || null,
    model: row["Model"]?.toString().trim() || null,
    price:
      row["Price"] !== undefined && row["Price"] !== ""
        ? Number(row["Price"])
        : undefined,
    currency: row["Currency"]?.toString().trim() || "EGP",
  });

  if (!result.success) {
    const errors = result.error.issues?.map((e) => e.message) || ["Validation failed"];
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}
