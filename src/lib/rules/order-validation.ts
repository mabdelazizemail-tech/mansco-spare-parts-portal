/**
 * Order Validation Rules — Financial block checks + mandatory admin review.
 *
 * Per Module 5 design: EVERY order is reviewed by an admin (no auto-approval
 * threshold). The admin can propose per-line quantity adjustments and send
 * the order back to the dealer for final confirmation. The lifecycle:
 *
 *   submitted → under_review
 *             ↓ (admin proposes edits)
 *      pending_dealer_confirmation
 *             ↓ (dealer accepts)              ↓ (dealer rejects)
 *           approved                       cancelled
 *             ↓
 *       done / partial / back_ordered → invoiced → shipped → delivered
 */

export type FinancialCheckInput = {
  creditLimit: number;
  overdueBalance: number;
  financialStatus: string; // "active" | "blocked" | "warning"
  orderTotal: number;
  currentOutstanding?: number; // sum of approved but unpaid orders
};

export type FinancialCheckResult = {
  passed: boolean;
  reason: string | null;
  details: {
    availableCredit: number;
    wouldExceed: boolean;
    isBlocked: boolean;
    isOverdue: boolean;
  };
};

export function checkFinancialBlock(input: FinancialCheckInput): FinancialCheckResult {
  const outstanding = input.currentOutstanding ?? 0;
  const usedCredit = outstanding + input.overdueBalance;
  const availableCredit = input.creditLimit - usedCredit;
  const wouldExceed = input.orderTotal > availableCredit;
  const isBlocked = input.financialStatus === "blocked";
  const isOverdue = input.overdueBalance > 0;

  const details = { availableCredit, wouldExceed, isBlocked, isOverdue };

  if (isBlocked) {
    return { passed: false, reason: "Dealer account is financially blocked", details };
  }
  if (wouldExceed) {
    return {
      passed: false,
      reason: `Order total (${input.orderTotal}) exceeds available credit (${availableCredit})`,
      details,
    };
  }
  return { passed: true, reason: null, details };
}

export type OrderValidationResult = {
  canSubmit: boolean;
  needsReview: boolean;     // Always true under the new mandatory-review policy
  financialBlock: boolean;
  reasons: string[];        // Notes that admin will see in the queue
  initialStatus: "under_review"; // Every order starts here now
};

/**
 * Validate a new order submission. EVERY order is routed to admin review —
 * the financial check still runs so the admin sees blockers in the queue,
 * but no order is auto-approved any more.
 */
export function validateOrderSubmission(input: {
  orderTotal: number;
  financial: FinancialCheckInput;
  hasUnavailableParts?: boolean;
}): OrderValidationResult {
  const reasons: string[] = [];

  const financialResult = checkFinancialBlock(input.financial);
  const financialBlock = !financialResult.passed;
  if (financialBlock && financialResult.reason) {
    reasons.push(financialResult.reason);
  }

  return {
    canSubmit: true,           // Always allow submission; admin decides outcome
    needsReview: true,         // Every order is reviewed
    financialBlock,
    reasons,
    initialStatus: "under_review",
  };
}

/** Status lifecycle transitions. */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  submitted: ["under_review", "cancelled"],
  under_review: ["pending_dealer_confirmation", "approved", "rejected", "cancelled"],
  pending_dealer_confirmation: ["approved", "cancelled", "under_review"],
  approved: ["done", "invoiced", "shipped", "partial", "back_ordered"],
  partial: ["done", "invoiced", "shipped", "back_ordered"],
  back_ordered: ["approved", "done", "invoiced", "shipped"],
  rejected: [],       // terminal
  done: ["invoiced"],
  invoiced: ["shipped"],
  shipped: ["delivered"],
  delivered: [],      // terminal
  cancelled: [],      // terminal
};

export function canTransition(from: string, to: string): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** ETA defaults by order type. */
export function defaultEtaDays(orderType: string): number {
  switch (orderType) {
    case "daily": return 4;    // 3-5 business days
    case "air_dhl": return 2;  // 1-2 business days
    case "stock": return 10;   // 7-14 business days
    default: return 5;
  }
}

export function calculateEta(orderType: string, fromDate?: Date): string {
  const base = fromDate ?? new Date();
  const days = defaultEtaDays(orderType);
  const eta = new Date(base);
  eta.setDate(eta.getDate() + days);
  return eta.toISOString().split("T")[0];
}
