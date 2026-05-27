import { z } from "zod";

/**
 * Per-row schema. Note: discount_type is NOT part of the row — it's set at the
 * campaign level and applied to all items uniformly. The validator receives it
 * as an external parameter so the percentage cap can be enforced per row.
 */
export const campaignItemRowSchema = z.object({
  part_number: z
    .string()
    .min(1, "Part Number is required")
    .trim(),
  part_description: z
    .string()
    .max(200, "Description must not exceed 200 characters")
    .nullish(),
  discount_value: z
    .number()
    .gt(0, "Discount Value must be greater than 0"),
  min_order_quantity: z
    .number()
    .int("Min Order Quantity must be a whole number")
    .gte(1, "Min Order Quantity must be at least 1"),
});

export type CampaignItemRow = z.infer<typeof campaignItemRowSchema>;

export type DiscountType = "percentage" | "fixed";

/**
 * Validate a single row (as a plain object from parsed CSV/XLSX).
 *
 * @param row     - The parsed row object (column name → string value)
 * @param discountType - The campaign-level discount type. Used to enforce
 *                       "percentage ≤ 100" without requiring it in the row.
 * @returns       - { valid, errors }
 */
export function validateCampaignItemRow(
  row: Record<string, unknown>,
  discountType: DiscountType,
): { valid: boolean; errors: string[] } {
  const result = campaignItemRowSchema.safeParse({
    part_number: row["Part Number"]?.toString().trim() || "",
    part_description: row["Description"]?.toString().trim() || null,
    discount_value:
      row["Discount Value"] !== undefined && row["Discount Value"] !== ""
        ? Number(row["Discount Value"])
        : undefined,
    min_order_quantity:
      row["Min Order Quantity"] !== undefined && row["Min Order Quantity"] !== ""
        ? Number(row["Min Order Quantity"])
        : undefined,
  });

  if (!result.success) {
    const errors = result.error.issues?.map((e) => e.message) || ["Validation failed"];
    return { valid: false, errors };
  }

  // Apply the campaign-level percentage cap
  if (discountType === "percentage" && result.data.discount_value > 100) {
    return { valid: false, errors: ["Percentage cannot exceed 100%"] };
  }

  return { valid: true, errors: [] };
}
