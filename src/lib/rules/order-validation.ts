/**
 * Order Validation Rules — Financial block checks + auto-approval logic.
 *
 * Per CLAUDE.md §4 "Order Validation Chain", before any order is confirmed:
 *   1. Dealer eligibility (active, not blocked)
 *   2. Stock availability (qty check)
 *   3. Pricing rules (no pricing on unavailable)
 *   4. Credit / financial block rules
 *
 * If ALL pass and within auto-approval threshold → auto-confirm.
 * If ANY exception → route to admin review queue.
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

/** Auto-approval threshold: orders under this value auto-approve */
const AUTO_APPROVAL_THRESHOLD = 50000; // EGP

export type OrderValidationResult = {
  canSubmit: boolean;
  needsReview: boolean;
  financialBlock: boolean;
  reasons: string[];
  initialStatus: "submitted" | "under_review";
};

export function validateOrderSubmission(input: {
  orderTotal: number;
  financial: FinancialCheckInput;
  hasUnavailableParts?: boolean;
}): OrderValidationResult {
  const reasons: string[] = [];
  let financialBlock = false;
  let needsReview = false;

  // Financial check
  const financialResult = checkFinancialBlock(input.financial);
  if (!financialResult.passed) {
    reasons.push(financialResult.reason!);
    financialBlock = true;
    needsReview = true;
  }

  // Auto-approval threshold
  if (input.orderTotal > AUTO_APPROVAL_THRESHOLD) {
    reasons.push(`Order exceeds auto-approval threshold (EGP ${AUTO_APPROVAL_THRESHOLD.toLocaleString()})`);
    needsReview = true;
  }

  return {
    canSubmit: true, // always allow submission, but may route to review
    needsReview,
    financialBlock,
    reasons,
    initialStatus: needsReview ? "under_review" : "submitted",
  };
}

/** Status lifecycle transitions */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  submitted: ["under_review", "approved", "rejected", "cancelled"],
  under_review: ["approved", "rejected", "partial", "cancelled"],
  approved: ["done", "invoiced", "shipped", "partial", "back_ordered"],
  partial: ["done", "invoiced", "shipped", "back_ordered"],
  back_ordered: ["approved", "done", "invoiced", "shipped"],
  rejected: [], // terminal
  done: ["invoiced"],
  invoiced: ["shipped"],
  shipped: ["delivered"],
  delivered: [], // terminal
  cancelled: [], // terminal
};

export function canTransition(from: string, to: string): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** ETA defaults by order type */
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
