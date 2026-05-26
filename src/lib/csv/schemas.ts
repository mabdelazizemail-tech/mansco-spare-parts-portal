import { z } from "zod";

export const campaignItemSchema = z.object({
  part_number: z
    .string()
    .min(1, "Part Number is required")
    .trim(),
  part_description: z
    .string()
    .max(200, "Description must not exceed 200 characters")
    .nullish(),
  discount_type: z
    .string()
    .transform((val) => val.toLowerCase())
    .pipe(
      z.enum(["percentage", "fixed"], {
        errorMap: () => ({ message: "Discount Type must be 'Percentage' or 'Fixed'" }),
      })
    ),
  discount_value: z
    .number()
    .gt(0, "Discount Value must be greater than 0"),
  min_order_quantity: z
    .number()
    .int("Min Order Quantity must be a whole number")
    .gte(1, "Min Order Quantity must be at least 1"),
}).refine(
  (data) => {
    if (data.discount_type === "percentage" && data.discount_value > 100) {
      return false;
    }
    return true;
  },
  {
    message: "Percentage cannot exceed 100%",
    path: ["discount_value"],
  }
);

export type CampaignItem = z.infer<typeof campaignItemSchema>;

/**
 * Validate a single row (as a plain object from CSV)
 * Returns { valid: boolean, errors: string[] }
 */
export function validateCampaignItemRow(
  row: Record<string, any>
): { valid: boolean; errors: string[] } {
  const result = campaignItemSchema.safeParse({
    part_number: row["Part Number"]?.toString().trim() || "",
    part_description: row["Description"]?.toString().trim() || null,
    discount_type: row["Discount Type"]?.toString().trim() || "",
    discount_value: row["Discount Value"] !== undefined && row["Discount Value"] !== ""
      ? Number(row["Discount Value"])
      : undefined,
    min_order_quantity: row["Min Order Quantity"] !== undefined && row["Min Order Quantity"] !== ""
      ? Number(row["Min Order Quantity"])
      : undefined,
  });

  if (!result.success) {
    const errors = result.error.errors.map((e) => e.message);
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}
