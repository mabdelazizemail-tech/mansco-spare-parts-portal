/**
 * Test Suite: Dealer Registration Zod Schema
 * Covers: email, password, password confirm, all business fields, sub_dealer logic
 */

import { describe, it, expect } from "vitest";
import { dealerRegistrationSchema } from "@/lib/validators/registration";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const validPayload = {
  email: "dealer@example.com",
  password: "Password1",
  confirm_password: "Password1",
  company_name: "Cairo Auto Parts",
  contact_person: "Ahmed Hassan",
  phone: "+201234567890",
  tax_id: "123456789",
  commercial_register_number: "CR-2024-001",
  branch_address: "15 El-Gomhoria Street, Cairo, Egypt",
  dealer_type_requested: "dealer" as const,
};

function parse(overrides: Partial<typeof validPayload & { parent_dealer_code?: string }>) {
  return dealerRegistrationSchema.safeParse({ ...validPayload, ...overrides });
}

// ─── 1. Happy path ────────────────────────────────────────────────────────────

describe("Registration schema — valid inputs", () => {
  it("accepts a fully valid dealer payload", () => {
    const result = parse({});
    expect(result.success).toBe(true);
  });

  it("accepts a valid sub_dealer with parent code", () => {
    const result = parse({
      dealer_type_requested: "sub_dealer",
      parent_dealer_code: "CAI-001",
    });
    expect(result.success).toBe(true);
  });

  it("trims and accepts phone without + prefix", () => {
    const result = parse({ phone: "01234567890" });
    expect(result.success).toBe(true);
  });
});

// ─── 2. Email validation ──────────────────────────────────────────────────────

describe("Registration schema — email", () => {
  it("rejects missing @", () => {
    const result = parse({ email: "notanemail" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.email).toBeDefined();
  });

  it("rejects empty string", () => {
    const result = parse({ email: "" });
    expect(result.success).toBe(false);
  });

  it("rejects email without TLD", () => {
    const result = parse({ email: "user@domain" });
    expect(result.success).toBe(false);
  });
});

// ─── 3. Password validation ───────────────────────────────────────────────────

describe("Registration schema — password", () => {
  it("rejects password shorter than 8 characters", () => {
    const result = parse({ password: "Pass1", confirm_password: "Pass1" });
    expect(result.success).toBe(false);
    const errs = result.error?.flatten().fieldErrors.password;
    expect(errs?.some((e) => /8/.test(e))).toBe(true);
  });

  it("rejects password without uppercase letter", () => {
    const result = parse({ password: "password1", confirm_password: "password1" });
    expect(result.success).toBe(false);
    const errs = result.error?.flatten().fieldErrors.password;
    expect(errs?.some((e) => /uppercase/i.test(e))).toBe(true);
  });

  it("rejects password without number", () => {
    const result = parse({ password: "PasswordNoNum", confirm_password: "PasswordNoNum" });
    expect(result.success).toBe(false);
    const errs = result.error?.flatten().fieldErrors.password;
    expect(errs?.some((e) => /number/i.test(e))).toBe(true);
  });

  it("accepts a password with uppercase + number (exactly 8 chars)", () => {
    const result = parse({ password: "Passw0rd", confirm_password: "Passw0rd" });
    expect(result.success).toBe(true);
  });
});

// ─── 4. Password confirmation cross-field refinement ─────────────────────────

describe("Registration schema — password confirmation", () => {
  it("rejects when passwords do not match", () => {
    const result = parse({ password: "Password1", confirm_password: "Different1" });
    expect(result.success).toBe(false);
    const errs = result.error?.flatten().fieldErrors.confirm_password;
    expect(errs?.some((e) => /match/i.test(e))).toBe(true);
  });

  it("accepts when passwords match exactly", () => {
    const result = parse({ password: "Password1", confirm_password: "Password1" });
    expect(result.success).toBe(true);
  });
});

// ─── 5. Business fields ───────────────────────────────────────────────────────

describe("Registration schema — business fields", () => {
  it("rejects company_name shorter than 2 characters", () => {
    const result = parse({ company_name: "A" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.company_name).toBeDefined();
  });

  it("rejects company_name longer than 200 characters", () => {
    const result = parse({ company_name: "A".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects phone with fewer than 10 digits", () => {
    const result = parse({ phone: "12345" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.phone).toBeDefined();
  });

  it("rejects phone with non-digit characters (except leading +)", () => {
    const result = parse({ phone: "0123-456-789" });
    expect(result.success).toBe(false);
  });

  it("rejects tax_id shorter than 5 characters", () => {
    const result = parse({ tax_id: "123" });
    expect(result.success).toBe(false);
  });

  it("rejects commercial_register_number shorter than 3 characters", () => {
    const result = parse({ commercial_register_number: "AB" });
    expect(result.success).toBe(false);
  });

  it("rejects branch_address shorter than 10 characters", () => {
    const result = parse({ branch_address: "Cairo" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.branch_address).toBeDefined();
  });

  it("rejects invalid dealer_type_requested value", () => {
    const result = parse({ dealer_type_requested: "franchise" as never });
    expect(result.success).toBe(false);
  });
});

// ─── 6. Sub-dealer cross-field refinement ────────────────────────────────────

describe("Registration schema — sub_dealer parent code", () => {
  it("rejects sub_dealer without parent_dealer_code", () => {
    const result = parse({
      dealer_type_requested: "sub_dealer",
      parent_dealer_code: undefined,
    });
    expect(result.success).toBe(false);
    const errs = result.error?.flatten().fieldErrors.parent_dealer_code;
    expect(errs?.some((e) => /required/i.test(e))).toBe(true);
  });

  it("rejects sub_dealer with empty parent_dealer_code string", () => {
    const result = parse({
      dealer_type_requested: "sub_dealer",
      parent_dealer_code: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts dealer type without parent_dealer_code", () => {
    const result = parse({
      dealer_type_requested: "dealer",
      parent_dealer_code: undefined,
    });
    expect(result.success).toBe(true);
  });
});
