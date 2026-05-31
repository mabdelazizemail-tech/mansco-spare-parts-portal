// src/lib/fulfillment/threshold.ts
//
// Configurable thresholds for the partial-fulfillment and back-order risk
// logic. Centralized so business can tune them in one place.

/**
 * If the back-ordered portion of an order exceeds this fraction of total
 * order value, the split is flagged for explicit admin review rather than
 * auto-applied. (Module 6 fulfillment design: hybrid auto-split + escalation.)
 */
export const BACKORDER_REVIEW_THRESHOLD = 0.3; // 30% of order value

/**
 * A back-order whose current ETA has slipped more than this many days past
 * its original ETA is flagged `is_at_risk` for admin attention.
 */
export const ETA_SLIPPAGE_RISK_DAYS = 7;
