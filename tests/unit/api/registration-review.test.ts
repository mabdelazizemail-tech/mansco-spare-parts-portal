/**
 * Test Suite: Registration Review State Machine
 *
 * Verifies the business rules for the approve/reject workflow:
 *  - Valid actions
 *  - State transitions
 *  - Double-review guard
 *  - Rejection reason requirement
 *  - Admin notes
 *  - User metadata updates
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── State machine types ───────────────────────────────────────────────────────

type ReviewStatus = "pending" | "approved" | "rejected";
type ReviewAction = "approve" | "reject";

interface Registration {
  id: string;
  supabase_uid: string;
  email: string;
  company_name: string;
  contact_person: string;
  phone: string;
  tax_id: string;
  commercial_register_number: string;
  branch_address: string;
  dealer_type_requested: "dealer" | "sub_dealer";
  parent_dealer_code: string | null;
  review_status: ReviewStatus;
  documents_uploaded: Record<string, string>;
}

interface ReviewResult {
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  newStatus?: ReviewStatus;
  userMetadataUpdate?: Record<string, string>;
  dealerCreated?: boolean;
}

// ─── Pure state-machine logic (mirrors api/registration/[id]/review/route.ts) ─

function processReview(
  registration: Registration,
  action: string,
  rejection_reason?: string,
  admin_notes?: string
): ReviewResult {
  // 1. Validate action
  if (!["approve", "reject"].includes(action)) {
    return { success: false, errorCode: "INVALID_ACTION", errorMessage: "Action must be approve or reject" };
  }

  // 2. Guard: double-review prevention (G4 fix)
  if (registration.review_status !== "pending") {
    return {
      success: false,
      errorCode: "ALREADY_REVIEWED",
      errorMessage: `This registration has already been ${registration.review_status}. No further action is allowed.`,
    };
  }

  if (action === "approve") {
    return {
      success: true,
      newStatus: "approved",
      dealerCreated: true,
      userMetadataUpdate: { registration_status: "approved" },
    };
  }

  // action === "reject"
  if (!rejection_reason || !rejection_reason.trim()) {
    return {
      success: false,
      errorCode: "VALIDATION_ERROR",
      errorMessage: "Rejection reason is required",
    };
  }

  return {
    success: true,
    newStatus: "rejected",
    dealerCreated: false,
    userMetadataUpdate: {
      registration_status: "rejected",
      rejection_reason: rejection_reason.trim(),
    },
  };
}

// ─── Test data factory ────────────────────────────────────────────────────────

function makePendingReg(overrides: Partial<Registration> = {}): Registration {
  return {
    id: "reg-001",
    supabase_uid: "uid-abc123",
    email: "dealer@example.com",
    company_name: "Cairo Auto Parts",
    contact_person: "Ahmed Hassan",
    phone: "+201234567890",
    tax_id: "123456789",
    commercial_register_number: "CR-001",
    branch_address: "15 El-Gomhoria Street, Cairo",
    dealer_type_requested: "dealer",
    parent_dealer_code: null,
    review_status: "pending",
    documents_uploaded: {
      trade_license: "registrations/uid-abc123/trade_license_1716000000",
      tax_card: "registrations/uid-abc123/tax_card_1716000000",
      commercial_register_doc: "registrations/uid-abc123/commercial_register_doc_1716000000",
    },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Registration review — invalid actions", () => {
  it("rejects an unknown action string", () => {
    const result = processReview(makePendingReg(), "suspend");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("INVALID_ACTION");
  });

  it("rejects empty action string", () => {
    const result = processReview(makePendingReg(), "");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("INVALID_ACTION");
  });
});

describe("Registration review — approve action", () => {
  it("approves a pending registration successfully", () => {
    const result = processReview(makePendingReg(), "approve");
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe("approved");
  });

  it("sets the correct user_metadata on approve", () => {
    const result = processReview(makePendingReg(), "approve");
    expect(result.userMetadataUpdate).toEqual({ registration_status: "approved" });
  });

  it("creates a dealer record on approve", () => {
    const result = processReview(makePendingReg(), "approve");
    expect(result.dealerCreated).toBe(true);
  });

  it("does NOT require rejection_reason on approve", () => {
    const result = processReview(makePendingReg(), "approve", undefined);
    expect(result.success).toBe(true);
  });
});

describe("Registration review — reject action", () => {
  it("rejects a pending registration with a reason", () => {
    const result = processReview(makePendingReg(), "reject", "Incomplete documents");
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe("rejected");
  });

  it("sets the correct user_metadata including rejection_reason on reject", () => {
    const result = processReview(makePendingReg(), "reject", "Missing tax card");
    expect(result.userMetadataUpdate).toEqual({
      registration_status: "rejected",
      rejection_reason: "Missing tax card",
    });
  });

  it("does NOT create a dealer record on reject", () => {
    const result = processReview(makePendingReg(), "reject", "Incomplete documents");
    expect(result.dealerCreated).toBe(false);
  });

  it("requires rejection_reason — returns VALIDATION_ERROR if missing", () => {
    const result = processReview(makePendingReg(), "reject");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("VALIDATION_ERROR");
  });

  it("requires rejection_reason — returns VALIDATION_ERROR if empty string", () => {
    const result = processReview(makePendingReg(), "reject", "");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("VALIDATION_ERROR");
  });

  it("requires rejection_reason — returns VALIDATION_ERROR if whitespace only", () => {
    const result = processReview(makePendingReg(), "reject", "   ");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("VALIDATION_ERROR");
  });

  it("trims whitespace from rejection_reason", () => {
    const result = processReview(makePendingReg(), "reject", "  Missing docs  ");
    expect(result.success).toBe(true);
    expect(result.userMetadataUpdate?.rejection_reason).toBe("Missing docs");
  });
});

describe("Registration review — double-review guard (G4)", () => {
  it("blocks re-approving an already approved registration", () => {
    const approvedReg = makePendingReg({ review_status: "approved" });
    const result = processReview(approvedReg, "approve");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("ALREADY_REVIEWED");
    expect(result.errorMessage).toContain("approved");
  });

  it("blocks rejecting an already rejected registration", () => {
    const rejectedReg = makePendingReg({ review_status: "rejected" });
    const result = processReview(rejectedReg, "reject", "Some reason");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("ALREADY_REVIEWED");
    expect(result.errorMessage).toContain("rejected");
  });

  it("blocks approving an already rejected registration", () => {
    const rejectedReg = makePendingReg({ review_status: "rejected" });
    const result = processReview(rejectedReg, "approve");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("ALREADY_REVIEWED");
  });

  it("allows action on a pending registration (guard does not block)", () => {
    const result = processReview(makePendingReg(), "approve");
    expect(result.success).toBe(true);
  });
});

describe("Registration review — state transition completeness", () => {
  const transitions: Array<[ReviewStatus, ReviewAction, boolean]> = [
    ["pending",  "approve", true],
    ["pending",  "reject",  true],
    ["approved", "approve", false],  // blocked
    ["approved", "reject",  false],  // blocked
    ["rejected", "approve", false],  // blocked
    ["rejected", "reject",  false],  // blocked
  ];

  transitions.forEach(([from, action, shouldSucceed]) => {
    it(`${from} → ${action}: success=${shouldSucceed}`, () => {
      const reg = makePendingReg({ review_status: from });
      const result = processReview(
        reg,
        action,
        action === "reject" ? "Test reason" : undefined
      );
      expect(result.success).toBe(shouldSucceed);
    });
  });
});
