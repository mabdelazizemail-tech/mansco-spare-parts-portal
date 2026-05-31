/**
 * Order Cart Store — Pure reducer + types for order building.
 *
 * This module contains zero React — it's pure functions and types.
 * This makes it trivially testable and portable.
 */

// ── Types ──

export type CartPartSnapshot = {
  part_number: string;
  name: string;
  name_ar: string;
  category: string;
  model: string;
  oem?: string | null;
  image?: string | null;
  availability_state: string;
  availability_label_en: string;
  quantity_available: number;
  replenishment_eta: string | null;
  unit_price: number;
  currency: string;
  // ── Optional discount fields (populated by lookup APIs) ──
  campaign_id?: string | null;
  discount_pct?: number;
  original_unit_price?: number | null;
  discounted_unit_price?: number | null;
};

export type CartLine = {
  part: CartPartSnapshot;
  qty: number;
  /** Timestamp when first added — used for stable sort */
  addedAt: number;
};

export type OrderType = "daily" | "air_dhl" | "stock";

export type CartState = {
  lines: CartLine[];
  orderType: OrderType;
  /** Monotonic counter for ARIA announcements */
  lastAction: CartAction | null;
  /** Prevents double-submission */
  submitting: boolean;
};

// ── Actions ──

export type CartAction =
  | { type: "ADD_ITEM"; part: CartPartSnapshot; qty?: number }
  | { type: "SET_QTY"; partNumber: string; qty: number }
  | { type: "REMOVE_ITEM"; partNumber: string }
  | { type: "CLEAR_CART" }
  | { type: "SET_ORDER_TYPE"; orderType: OrderType }
  | { type: "SET_SUBMITTING"; submitting: boolean };

// ── Initial state ──

export const INITIAL_CART_STATE: CartState = {
  lines: [],
  orderType: "daily",
  lastAction: null,
  submitting: false,
};

// ── Reducer ──

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const addQty = Math.max(1, action.qty ?? 1);
      const existing = state.lines.find(
        (l) => l.part.part_number === action.part.part_number
      );

      if (existing) {
        // Merge: increment quantity, cap at available stock
        const maxQty = action.part.quantity_available || 9999;
        const newQty = Math.min(existing.qty + addQty, maxQty);
        return {
          ...state,
          lines: state.lines.map((l) =>
            l.part.part_number === action.part.part_number
              ? { ...l, qty: newQty, part: action.part }
              : l
          ),
          lastAction: action,
        };
      }

      // New line
      return {
        ...state,
        lines: [
          ...state.lines,
          { part: action.part, qty: addQty, addedAt: Date.now() },
        ],
        lastAction: action,
      };
    }

    case "SET_QTY": {
      if (action.qty < 1) {
        // Remove if qty goes to zero
        return {
          ...state,
          lines: state.lines.filter(
            (l) => l.part.part_number !== action.partNumber
          ),
          lastAction: action,
        };
      }
      const line = state.lines.find(
        (l) => l.part.part_number === action.partNumber
      );
      if (!line) return state;

      const maxQty = line.part.quantity_available || 9999;
      const clampedQty = Math.min(action.qty, maxQty);

      return {
        ...state,
        lines: state.lines.map((l) =>
          l.part.part_number === action.partNumber
            ? { ...l, qty: clampedQty }
            : l
        ),
        lastAction: action,
      };
    }

    case "REMOVE_ITEM":
      return {
        ...state,
        lines: state.lines.filter(
          (l) => l.part.part_number !== action.partNumber
        ),
        lastAction: action,
      };

    case "CLEAR_CART":
      return { ...state, lines: [], lastAction: action };

    case "SET_ORDER_TYPE":
      return { ...state, orderType: action.orderType, lastAction: action };

    case "SET_SUBMITTING":
      return { ...state, submitting: action.submitting };

    default:
      return state;
  }
}

// ── Selectors (pure functions) ──

export function cartLineCount(state: CartState): number {
  return state.lines.length;
}

export function cartTotalQty(state: CartState): number {
  return state.lines.reduce((sum, l) => sum + l.qty, 0);
}

export function cartSubtotal(state: CartState): number {
  // ORIGINAL subtotal (sum of unit_price * qty, ignoring discount).
  return state.lines.reduce((sum, l) => sum + l.part.unit_price * l.qty, 0);
}

export function cartTotalDiscount(state: CartState): number {
  return state.lines.reduce((sum, l) => {
    const orig = l.part.original_unit_price ?? l.part.unit_price;
    const disc = l.part.discounted_unit_price ?? l.part.unit_price;
    return sum + Math.max(0, orig - disc) * l.qty;
  }, 0);
}

export function cartSubtotalAfterDiscount(state: CartState): number {
  return cartSubtotal(state) - cartTotalDiscount(state);
}

export function cartVat(state: CartState, rate = 0.14): number {
  return Math.round(cartSubtotalAfterDiscount(state) * rate);
}

export function cartTotal(state: CartState, vatRate = 0.14): number {
  return cartSubtotalAfterDiscount(state) + cartVat(state, vatRate);
}

export function cartIsEmpty(state: CartState): boolean {
  return state.lines.length === 0;
}

export function cartHasItem(state: CartState, partNumber: string): boolean {
  return state.lines.some((l) => l.part.part_number === partNumber);
}

export function cartItemQty(state: CartState, partNumber: string): number {
  return state.lines.find((l) => l.part.part_number === partNumber)?.qty ?? 0;
}

/** Build the API payload for POST /api/orders */
export function cartToOrderPayload(state: CartState, dealerId = "self") {
  return {
    dealer_id: dealerId,
    order_type: state.orderType,
    items: state.lines.map((l) => ({
      part_number: l.part.part_number,
      part_name: l.part.name,
      part_name_ar: l.part.name_ar,
      quantity: l.qty,
      unit_price: l.part.unit_price,
      currency: l.part.currency,
      availability_state: l.part.availability_state,
    })),
  };
}

/** Human-readable action description for ARIA announcements */
export function describeAction(action: CartAction): string {
  switch (action.type) {
    case "ADD_ITEM":
      return `Added ${action.part.name} to order`;
    case "SET_QTY":
      return action.qty < 1
        ? `Removed item from order`
        : `Updated quantity to ${action.qty}`;
    case "REMOVE_ITEM":
      return `Removed item from order`;
    case "CLEAR_CART":
      return `Cleared all items from order`;
    case "SET_ORDER_TYPE":
      return `Changed order type to ${action.orderType}`;
    default:
      return "";
  }
}
