/**
 * Parts Availability Rules — MANSCO Critical Business Rules
 *
 * The 4 availability states (from CLAUDE.md):
 *   AVAILABLE                  — stock on hand ≥ requested qty → show price + qty + ETA
 *   PARTIALLY_AVAILABLE        — some stock, less than requested → show available qty + price + ETA for remainder
 *   NOT_AVAILABLE_WITH_ETA     — no stock but replenishment ETA known → show ETA, **no price**
 *   NOT_AVAILABLE_NO_ETA       — no stock, no ETA → no price
 *
 * ⚠️ MANDATORY RULE: Prices MUST NOT be displayed for parts in either
 *     NOT_AVAILABLE_* state. This is enforced here at the data layer so
 *     callers (API, UI, exporters) cannot accidentally leak pricing.
 */

export type AvailabilityState =
  | "AVAILABLE"
  | "PARTIALLY_AVAILABLE"
  | "NOT_AVAILABLE_WITH_ETA"
  | "NOT_AVAILABLE_NO_ETA";

export type AvailabilityUiTone = "available" | "partially_available" | "unavailable_eta" | "unavailable";

export type StockSnapshot = {
  part_number: string;
  quantity_available: number;
  quantity_atp?: number; // available-to-promise
  source_location?: string | null;
  replenishment_eta?: string | null; // ISO date
  last_synced_at?: string | null;
};

export type PriceSnapshot = {
  part_number: string;
  unit_price: number;
  currency: string;
  price_list_id?: string | null;
};

/**
 * Resolve the availability state for a part, given a stock snapshot and
 * optional requested quantity.
 */
export function resolveAvailabilityState(
  stock: StockSnapshot | null | undefined,
  requestedQty = 1
): AvailabilityState {
  const onHand = Math.max(0, stock?.quantity_atp ?? stock?.quantity_available ?? 0);
  const hasEta = Boolean(stock?.replenishment_eta);

  if (onHand >= requestedQty && onHand > 0) return "AVAILABLE";
  if (onHand > 0 && onHand < requestedQty) return "PARTIALLY_AVAILABLE";
  if (onHand === 0 && hasEta) return "NOT_AVAILABLE_WITH_ETA";
  return "NOT_AVAILABLE_NO_ETA";
}

/**
 * The ONLY function that should produce a customer-visible price.
 * Returns null when the no-price rule applies (always for *NOT_AVAILABLE_* states).
 */
export function getDisplayablePrice(
  state: AvailabilityState,
  price: PriceSnapshot | null | undefined
): { unit_price: number; currency: string } | null {
  if (!price) return null;
  if (state === "AVAILABLE" || state === "PARTIALLY_AVAILABLE") {
    return { unit_price: price.unit_price, currency: price.currency };
  }
  // NOT_AVAILABLE_* → price MUST be withheld
  return null;
}

/**
 * Map domain state to the UI badge tone used in the existing components.
 */
export function stateToUiTone(state: AvailabilityState): AvailabilityUiTone {
  switch (state) {
    case "AVAILABLE":
      return "available";
    case "PARTIALLY_AVAILABLE":
      return "partially_available";
    case "NOT_AVAILABLE_WITH_ETA":
      return "unavailable_eta";
    case "NOT_AVAILABLE_NO_ETA":
      return "unavailable";
  }
}

/**
 * Human-friendly label for the state, available in English and Arabic.
 */
export function stateLabel(state: AvailabilityState, lang: "en" | "ar" = "en"): string {
  const en: Record<AvailabilityState, string> = {
    AVAILABLE: "Available",
    PARTIALLY_AVAILABLE: "Partially Available",
    NOT_AVAILABLE_WITH_ETA: "Out of Stock — ETA known",
    NOT_AVAILABLE_NO_ETA: "Out of Stock — No ETA",
  };
  const ar: Record<AvailabilityState, string> = {
    AVAILABLE: "متوفر",
    PARTIALLY_AVAILABLE: "متوفر جزئياً",
    NOT_AVAILABLE_WITH_ETA: "غير متوفر — لديه موعد توريد",
    NOT_AVAILABLE_NO_ETA: "غير متوفر — لا يوجد موعد",
  };
  return (lang === "ar" ? ar : en)[state];
}

/**
 * The unified "search result" payload built from catalog + stock + price.
 * Always safe to send to dealers — no-price rule pre-applied.
 */
export type PartSearchResult = {
  part_number: string;
  name: string;
  name_ar: string;
  category: string;
  category_ar: string;
  model: string;
  oem?: string | null;
  image?: string | null;
  availability_state: AvailabilityState;
  availability_label_en: string;
  availability_label_ar: string;
  quantity_available: number;
  replenishment_eta: string | null;
  // Price is only present when displayable per the no-price rule.
  unit_price: number | null;
  currency: string | null;
  // Always include lookup metadata so the UI can warn about stale data.
  stock_last_synced_at: string | null;
};

/**
 * Build a safe `PartSearchResult` from raw catalog/stock/price data. All
 * pricing decisions go through `getDisplayablePrice` so the no-price-on-
 * unavailable rule cannot leak.
 */
export function buildPartSearchResult(input: {
  catalog: {
    partNumber: string;
    name: string;
    nameAr: string;
    category: string;
    categoryAr: string;
    model: string;
    oem?: string | null;
    image?: string | null;
  };
  stock: StockSnapshot | null | undefined;
  price: PriceSnapshot | null | undefined;
  requestedQty?: number;
}): PartSearchResult {
  const state = resolveAvailabilityState(input.stock, input.requestedQty ?? 1);
  const displayable = getDisplayablePrice(state, input.price);
  return {
    part_number: input.catalog.partNumber,
    name: input.catalog.name,
    name_ar: input.catalog.nameAr,
    category: input.catalog.category,
    category_ar: input.catalog.categoryAr,
    model: input.catalog.model,
    oem: input.catalog.oem ?? null,
    image: input.catalog.image ?? null,
    availability_state: state,
    availability_label_en: stateLabel(state, "en"),
    availability_label_ar: stateLabel(state, "ar"),
    quantity_available: Math.max(0, input.stock?.quantity_available ?? 0),
    replenishment_eta: input.stock?.replenishment_eta ?? null,
    unit_price: displayable?.unit_price ?? null,
    currency: displayable?.currency ?? null,
    stock_last_synced_at: input.stock?.last_synced_at ?? null,
  };
}
