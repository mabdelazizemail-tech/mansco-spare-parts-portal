import { z } from "zod";

export const dealerRegistrationSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirm_password: z.string(),

    company_name: z.string().min(2, "Company name is required").max(200),
    contact_person: z.string().min(2, "Contact person is required").max(100),
    phone: z
      .string()
      .regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number (10-15 digits)"),
    tax_id: z.string().min(5, "Tax ID is required").max(20),
    commercial_register_number: z
      .string()
      .min(3, "Commercial register number is required")
      .max(30),
    branch_address: z
      .string()
      .min(10, "Please provide a full address")
      .max(500),
    dealer_type_requested: z.enum(["dealer", "sub_dealer"]),
    parent_dealer_code: z.string().optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })
  .refine(
    (data) =>
      data.dealer_type_requested !== "sub_dealer" ||
      (data.parent_dealer_code && data.parent_dealer_code.length > 0),
    {
      message: "Parent dealer code is required for sub-dealers",
      path: ["parent_dealer_code"],
    }
  );

export type DealerRegistrationInput = z.infer<typeof dealerRegistrationSchema>;
