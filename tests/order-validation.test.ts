import { describe, it, expect } from "vitest";
import {
  checkFinancialBlock,
  validateOrderSubmission,
  canTransition,
  calculateEta,
  defaultEtaDays,
  ORDER_STATUS_TRANSITIONS,
} from "@/lib/rules/order-validation";

// ── Financial block checks ──

describe("checkFinancialBlock", () => {
  it("passes when order is within credit limit", () => {
    const result = checkFinancialBlock({
      creditLimit: 100000,
      overdueBalance: 0,
      financialStatus: "active",
      orderTotal: 50000,
    });
    expect(result.passed).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("fails when dealer is financially blocked", () => {
    const result = checkFinancialBlock({
      creditLimit: 100000,
      overdueBalance: 0,
      financialStatus: "blocked",
      orderTotal: 1000,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("blocked");
    expect(result.details.isBlocked).toBe(true);
  });

  it("fails when order exceeds available credit", () => {
    const result = checkFinancialBlock({
      creditLimit: 100000,
      overdueBalance: 80000,
      financialStatus: "active",
      orderTotal: 30000,
    });
    expect(result.passed).toBe(false);
    expect(result.details.wouldExceed).toBe(true);
    expect(result.details.availableCredit).toBe(20000);
  });

  it("accounts for current outstanding orders", () => {
    const result = checkFinancialBlock({
      creditLimit: 100000,
      overdueBalance: 0,
      financialStatus: "active",
      orderTotal: 10000,
      currentOutstanding: 95000,
    });
    expect(result.passed).toBe(false);
    expect(result.details.availableCredit).toBe(5000);
  });

  it("passes when overdue but within limit", () => {
    const result = checkFinancialBlock({
      creditLimit: 500000,
      overdueBalance: 50000,
      financialStatus: "warning",
      orderTotal: 100000,
    });
    expect(result.passed).toBe(true);
    expect(result.details.isOverdue).toBe(true);
  });
});

// ── Order submission validation (mandatory review policy) ──

describe("validateOrderSubmission (mandatory admin review)", () => {
  it("always routes EVERY order to under_review (no auto-approval)", () => {
    const small = validateOrderSubmission({
      orderTotal: 10,
      financial: {
        creditLimit: 500000,
        overdueBalance: 0,
        financialStatus: "active",
        orderTotal: 10,
      },
    });
    expect(small.canSubmit).toBe(true);
    expect(small.needsReview).toBe(true);
    expect(small.initialStatus).toBe("under_review");

    const large = validateOrderSubmission({
      orderTotal: 999999,
      financial: {
        creditLimit: 500000,
        overdueBalance: 0,
        financialStatus: "active",
        orderTotal: 999999,
      },
    });
    expect(large.initialStatus).toBe("under_review");
  });

  it("flags financial block in the reasons array for admin visibility", () => {
    const result = validateOrderSubmission({
      orderTotal: 5000,
      financial: {
        creditLimit: 100000,
        overdueBalance: 99000,
        financialStatus: "active",
        orderTotal: 5000,
      },
    });
    expect(result.financialBlock).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0]).toMatch(/credit/i);
  });

  it("flags blocked status in reasons", () => {
    const result = validateOrderSubmission({
      orderTotal: 100,
      financial: {
        creditLimit: 100000,
        overdueBalance: 0,
        financialStatus: "blocked",
        orderTotal: 100,
      },
    });
    expect(result.financialBlock).toBe(true);
    expect(result.reasons.some((r) => r.toLowerCase().includes("blocked"))).toBe(true);
  });

  it("has empty reasons for a clean order (admin still must review)", () => {
    const result = validateOrderSubmission({
      orderTotal: 5000,
      financial: {
        creditLimit: 500000,
        overdueBalance: 0,
        financialStatus: "active",
        orderTotal: 5000,
      },
    });
    expect(result.financialBlock).toBe(false);
    expect(result.reasons).toEqual([]);
    expect(result.needsReview).toBe(true); // mandatory review
  });

  it("always allows submission (canSubmit true), even with blocks", () => {
    const result = validateOrderSubmission({
      orderTotal: 999999,
      financial: {
        creditLimit: 1000,
        overdueBalance: 999,
        financialStatus: "blocked",
        orderTotal: 999999,
      },
    });
    expect(result.canSubmit).toBe(true);
    expect(result.needsReview).toBe(true);
  });
});

// ── Status transitions ──

describe("canTransition", () => {
  it("submitted → under_review", () => {
    expect(canTransition("submitted", "under_review")).toBe(true);
  });

  it("under_review → pending_dealer_confirmation (admin proposes edits)", () => {
    expect(canTransition("under_review", "pending_dealer_confirmation")).toBe(true);
  });

  it("under_review → approved (admin approves without edits)", () => {
    expect(canTransition("under_review", "approved")).toBe(true);
  });

  it("under_review → rejected", () => {
    expect(canTransition("under_review", "rejected")).toBe(true);
  });

  it("pending_dealer_confirmation → approved (dealer accepts edits)", () => {
    expect(canTransition("pending_dealer_confirmation", "approved")).toBe(true);
  });

  it("pending_dealer_confirmation → cancelled (dealer rejects edits)", () => {
    expect(canTransition("pending_dealer_confirmation", "cancelled")).toBe(true);
  });

  it("pending_dealer_confirmation → under_review (admin re-edits after dealer queries)", () => {
    expect(canTransition("pending_dealer_confirmation", "under_review")).toBe(true);
  });

  it("disallows rejected → approved (terminal)", () => {
    expect(canTransition("rejected", "approved")).toBe(false);
  });

  it("disallows cancelled → anything (terminal)", () => {
    expect(canTransition("cancelled", "approved")).toBe(false);
    expect(canTransition("cancelled", "under_review")).toBe(false);
  });

  it("disallows delivered → anything (terminal)", () => {
    expect(canTransition("delivered", "shipped")).toBe(false);
  });

  it("approved → invoiced", () => {
    expect(canTransition("approved", "invoiced")).toBe(true);
  });

  it("shipped → delivered", () => {
    expect(canTransition("shipped", "delivered")).toBe(true);
  });

  it("returns false for unknown status", () => {
    expect(canTransition("nonexistent", "approved")).toBe(false);
  });
});

// ── ETA calculation ──

describe("calculateEta / defaultEtaDays", () => {
  it("daily = 4 days", () => {
    expect(defaultEtaDays("daily")).toBe(4);
  });

  it("air_dhl = 2 days", () => {
    expect(defaultEtaDays("air_dhl")).toBe(2);
  });

  it("stock = 10 days", () => {
    expect(defaultEtaDays("stock")).toBe(10);
  });

  it("unknown falls back to 5 days", () => {
    expect(defaultEtaDays("unknown")).toBe(5);
  });

  it("calculateEta returns ISO date string", () => {
    const eta = calculateEta("daily", new Date("2026-05-21"));
    expect(eta).toBe("2026-05-25");
  });

  it("calculateEta for air_dhl is sooner", () => {
    const eta = calculateEta("air_dhl", new Date("2026-05-21"));
    expect(eta).toBe("2026-05-23");
  });
});

// ── Transition map completeness ──

describe("ORDER_STATUS_TRANSITIONS completeness", () => {
  const allStatuses = [
    "submitted", "under_review", "pending_dealer_confirmation",
    "approved", "rejected", "partial", "back_ordered",
    "done", "invoiced", "shipped", "delivered", "cancelled",
  ];

  it("has an entry for every status (including pending_dealer_confirmation)", () => {
    for (const status of allStatuses) {
      expect(ORDER_STATUS_TRANSITIONS).toHaveProperty(status);
    }
  });

  it("terminal statuses have empty transition arrays", () => {
    expect(ORDER_STATUS_TRANSITIONS.rejected).toEqual([]);
    expect(ORDER_STATUS_TRANSITIONS.delivered).toEqual([]);
    expect(ORDER_STATUS_TRANSITIONS.cancelled).toEqual([]);
  });
});
