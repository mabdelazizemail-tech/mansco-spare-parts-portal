/**
 * Campaign Eligibility Rules Engine
 *
 * Evaluates whether a dealer (and optionally a candidate order) qualifies
 * for a campaign based on the campaign's eligibility_rules JSON.
 *
 * Rule dimensions supported:
 *   - min_credit_limit      → dealer.credit_limit must be ≥ this
 *   - min_target_pct        → dealer.target_achievement_pct must be ≥ this
 *   - financial_status[]    → dealer.financial_status must be in this list
 *   - order_types[]         → if order.type is provided, it must be in this list
 *
 * The engine returns a structured result with per-rule pass/fail explanations
 * so callers can show dealers why they don't qualify, or admin tools can
 * preview audience size before activating a campaign.
 */

export type CampaignEligibilityRules = {
  min_credit_limit?: number;
  min_target_pct?: number;
  financial_status?: string[];
  order_types?: string[];
};

export type DealerEligibilityContext = {
  dealer_id: string;
  credit_limit: number;
  overdue_balance?: number;
  financial_status: string; // "active" | "warning" | "blocked"
  is_active: boolean;
  target_achievement_pct?: number; // 0..100
};

export type OrderEligibilityContext = {
  order_type?: string; // "daily" | "air_dhl" | "stock"
};

export type RuleCheck = {
  rule: string;
  passed: boolean;
  reason?: string;
  expected?: unknown;
  actual?: unknown;
};

export type EligibilityResult = {
  eligible: boolean;
  passed_checks: RuleCheck[];
  failed_checks: RuleCheck[];
  rules_evaluated: number;
};

/**
 * Evaluate a dealer (and optional order) against a campaign's eligibility rules.
 * Suspended dealers (is_active = false) are auto-rejected regardless of rules.
 */
export function evaluateCampaignEligibility(
  rules: CampaignEligibilityRules | null | undefined,
  dealer: DealerEligibilityContext,
  order?: OrderEligibilityContext
): EligibilityResult {
  const checks: RuleCheck[] = [];

  // Hard precondition: dealer account must be active
  if (!dealer.is_active) {
    checks.push({
      rule: "dealer_account_active",
      passed: false,
      reason: "Dealer account is suspended",
      expected: true,
      actual: false,
    });
    return {
      eligible: false,
      passed_checks: [],
      failed_checks: checks,
      rules_evaluated: 1,
    };
  }

  const r = rules ?? {};

  // ── min_credit_limit ──────────────────────────────────────────────
  if (typeof r.min_credit_limit === "number" && r.min_credit_limit > 0) {
    const ok = dealer.credit_limit >= r.min_credit_limit;
    checks.push({
      rule: "min_credit_limit",
      passed: ok,
      reason: ok
        ? undefined
        : `Credit limit ${dealer.credit_limit} is below required ${r.min_credit_limit}`,
      expected: r.min_credit_limit,
      actual: dealer.credit_limit,
    });
  }

  // ── min_target_pct ────────────────────────────────────────────────
  if (typeof r.min_target_pct === "number" && r.min_target_pct > 0) {
    const actual = dealer.target_achievement_pct ?? 0;
    const ok = actual >= r.min_target_pct;
    checks.push({
      rule: "min_target_pct",
      passed: ok,
      reason: ok
        ? undefined
        : `Target achievement ${actual.toFixed(1)}% is below required ${r.min_target_pct}%`,
      expected: r.min_target_pct,
      actual,
    });
  }

  // ── financial_status ──────────────────────────────────────────────
  if (Array.isArray(r.financial_status) && r.financial_status.length > 0) {
    const ok = r.financial_status.includes(dealer.financial_status);
    checks.push({
      rule: "financial_status",
      passed: ok,
      reason: ok
        ? undefined
        : `Dealer financial status '${dealer.financial_status}' not in allowed list [${r.financial_status.join(", ")}]`,
      expected: r.financial_status,
      actual: dealer.financial_status,
    });
  }

  // ── order_types (only checked when an order is passed) ────────────
  if (
    Array.isArray(r.order_types) &&
    r.order_types.length > 0 &&
    order?.order_type !== undefined
  ) {
    const ok = r.order_types.includes(order.order_type);
    checks.push({
      rule: "order_types",
      passed: ok,
      reason: ok
        ? undefined
        : `Order type '${order.order_type}' not allowed (allowed: ${r.order_types.join(", ")})`,
      expected: r.order_types,
      actual: order.order_type,
    });
  }

  const failed = checks.filter((c) => !c.passed);
  const passed = checks.filter((c) => c.passed);

  return {
    eligible: failed.length === 0,
    passed_checks: passed,
    failed_checks: failed,
    rules_evaluated: checks.length,
  };
}

/**
 * Filter a list of dealers down to those eligible for a campaign.
 * Useful for "audience preview" before activating a campaign.
 */
export function filterEligibleDealers(
  rules: CampaignEligibilityRules | null | undefined,
  dealers: DealerEligibilityContext[]
): { eligible: DealerEligibilityContext[]; ineligible: { dealer: DealerEligibilityContext; reasons: string[] }[] } {
  const eligible: DealerEligibilityContext[] = [];
  const ineligible: { dealer: DealerEligibilityContext; reasons: string[] }[] = [];

  for (const dealer of dealers) {
    const result = evaluateCampaignEligibility(rules, dealer);
    if (result.eligible) {
      eligible.push(dealer);
    } else {
      ineligible.push({
        dealer,
        reasons: result.failed_checks
          .map((c) => c.reason || c.rule)
          .filter((r): r is string => Boolean(r)),
      });
    }
  }

  return { eligible, ineligible };
}

/**
 * Calculate the discounted unit price for a campaign item.
 * Returns the original price if the discount would produce a non-positive number.
 */
export function applyCampaignDiscount(
  unitPrice: number,
  discountType: "percentage" | "fixed",
  discountValue: number
): { original_price: number; discounted_price: number; discount_amount: number; effective_discount_pct: number } {
  if (!unitPrice || unitPrice <= 0) {
    return {
      original_price: unitPrice,
      discounted_price: unitPrice,
      discount_amount: 0,
      effective_discount_pct: 0,
    };
  }

  let discount_amount = 0;
  if (discountType === "percentage") {
    const pct = Math.max(0, Math.min(100, discountValue));
    discount_amount = (unitPrice * pct) / 100;
  } else {
    discount_amount = Math.max(0, discountValue);
  }

  const discounted_price = Math.max(0, unitPrice - discount_amount);
  const effective_discount_pct = unitPrice > 0 ? (discount_amount / unitPrice) * 100 : 0;

  return {
    original_price: unitPrice,
    discounted_price,
    discount_amount,
    effective_discount_pct,
  };
}

/**
 * Human-readable summary of an eligibility ruleset (for UI badges/tooltips).
 */
export function describeEligibilityRules(rules: CampaignEligibilityRules | null | undefined): string[] {
  if (!rules || Object.keys(rules).length === 0) {
    return ["No eligibility restrictions"];
  }
  const out: string[] = [];
  if (rules.min_credit_limit) out.push(`Credit limit ≥ ${rules.min_credit_limit.toLocaleString()} EGP`);
  if (rules.min_target_pct) out.push(`Target achievement ≥ ${rules.min_target_pct}%`);
  if (rules.financial_status?.length) out.push(`Financial status in [${rules.financial_status.join(", ")}]`);
  if (rules.order_types?.length) out.push(`Order types in [${rules.order_types.join(", ")}]`);
  return out;
}
