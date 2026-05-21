import { describe, it, expect } from "vitest";
import {
  cartReducer,
  INITIAL_CART_STATE,
  cartLineCount,
  cartTotalQty,
  cartSubtotal,
  cartVat,
  cartTotal,
  cartIsEmpty,
  cartHasItem,
  cartItemQty,
  cartToOrderPayload,
  describeAction,
  type CartState,
  type CartPartSnapshot,
} from "@/lib/cart/cart-store";

// ── Test fixtures ──

const BRAKE_PAD: CartPartSnapshot = {
  part_number: "1607328280",
  name: "Front Brake Pad Set",
  name_ar: "طقم تيل فرامل أمامي",
  category: "Brakes",
  model: "Peugeot 301",
  image: null,
  availability_state: "AVAILABLE",
  availability_label_en: "Available",
  quantity_available: 45,
  replenishment_eta: null,
  unit_price: 1850,
  currency: "EGP",
};

const OIL_FILTER: CartPartSnapshot = {
  part_number: "1109CK",
  name: "Oil Filter",
  name_ar: "فلتر زيت",
  category: "Filters",
  model: "Peugeot 2008",
  image: null,
  availability_state: "AVAILABLE",
  availability_label_en: "Available",
  quantity_available: 120,
  replenishment_eta: null,
  unit_price: 320,
  currency: "EGP",
};

const PARTIAL_PART: CartPartSnapshot = {
  part_number: "5271CC",
  name: "Rear Shock Absorber",
  name_ar: "مساعد خلفي",
  category: "Suspension",
  model: "Peugeot 301",
  image: null,
  availability_state: "PARTIALLY_AVAILABLE",
  availability_label_en: "Partially Available",
  quantity_available: 3,
  replenishment_eta: null,
  unit_price: 2400,
  currency: "EGP",
};

// ── ADD_ITEM ──

describe("cartReducer — ADD_ITEM", () => {
  it("adds a new item to an empty cart", () => {
    const state = cartReducer(INITIAL_CART_STATE, {
      type: "ADD_ITEM",
      part: BRAKE_PAD,
    });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].part.part_number).toBe("1607328280");
    expect(state.lines[0].qty).toBe(1);
  });

  it("adds multiple distinct items", () => {
    let state = cartReducer(INITIAL_CART_STATE, {
      type: "ADD_ITEM",
      part: BRAKE_PAD,
    });
    state = cartReducer(state, { type: "ADD_ITEM", part: OIL_FILTER });
    expect(state.lines).toHaveLength(2);
  });

  it("merges duplicate items by incrementing quantity", () => {
    let state = cartReducer(INITIAL_CART_STATE, {
      type: "ADD_ITEM",
      part: BRAKE_PAD,
    });
    state = cartReducer(state, { type: "ADD_ITEM", part: BRAKE_PAD });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].qty).toBe(2);
  });

  it("respects custom qty on add", () => {
    const state = cartReducer(INITIAL_CART_STATE, {
      type: "ADD_ITEM",
      part: BRAKE_PAD,
      qty: 5,
    });
    expect(state.lines[0].qty).toBe(5);
  });

  it("clamps qty to zero minimum (treats negative as 1)", () => {
    const state = cartReducer(INITIAL_CART_STATE, {
      type: "ADD_ITEM",
      part: BRAKE_PAD,
      qty: -3,
    });
    expect(state.lines[0].qty).toBe(1);
  });

  it("caps merged quantity at available stock", () => {
    let state = cartReducer(INITIAL_CART_STATE, {
      type: "ADD_ITEM",
      part: PARTIAL_PART,
      qty: 2,
    });
    state = cartReducer(state, { type: "ADD_ITEM", part: PARTIAL_PART, qty: 5 });
    // quantity_available is 3, so should cap at 3
    expect(state.lines[0].qty).toBe(3);
  });

  it("sets lastAction on add", () => {
    const state = cartReducer(INITIAL_CART_STATE, {
      type: "ADD_ITEM",
      part: BRAKE_PAD,
    });
    expect(state.lastAction?.type).toBe("ADD_ITEM");
  });
});

// ── SET_QTY ──

describe("cartReducer — SET_QTY", () => {
  it("updates quantity of existing item", () => {
    let state = cartReducer(INITIAL_CART_STATE, {
      type: "ADD_ITEM",
      part: BRAKE_PAD,
    });
    state = cartReducer(state, {
      type: "SET_QTY",
      partNumber: "1607328280",
      qty: 10,
    });
    expect(state.lines[0].qty).toBe(10);
  });

  it("removes item when qty set to 0", () => {
    let state = cartReducer(INITIAL_CART_STATE, {
      type: "ADD_ITEM",
      part: BRAKE_PAD,
    });
    state = cartReducer(state, {
      type: "SET_QTY",
      partNumber: "1607328280",
      qty: 0,
    });
    expect(state.lines).toHaveLength(0);
  });

  it("removes item when qty set to negative", () => {
    let state = cartReducer(INITIAL_CART_STATE, {
      type: "ADD_ITEM",
      part: BRAKE_PAD,
    });
    state = cartReducer(state, {
      type: "SET_QTY",
      partNumber: "1607328280",
      qty: -1,
    });
    expect(state.lines).toHaveLength(0);
  });

  it("caps quantity at available stock", () => {
    let state = cartReducer(INITIAL_CART_STATE, {
      type: "ADD_ITEM",
      part: PARTIAL_PART,
    });
    state = cartReducer(state, {
      type: "SET_QTY",
      partNumber: "5271CC",
      qty: 100,
    });
    expect(state.lines[0].qty).toBe(3); // quantity_available = 3
  });

  it("no-ops for unknown part number", () => {
    const state = cartReducer(INITIAL_CART_STATE, {
      type: "SET_QTY",
      partNumber: "UNKNOWN",
      qty: 5,
    });
    expect(state).toBe(INITIAL_CART_STATE);
  });
});

// ── REMOVE_ITEM ──

describe("cartReducer — REMOVE_ITEM", () => {
  it("removes the specified item", () => {
    let state = cartReducer(INITIAL_CART_STATE, {
      type: "ADD_ITEM",
      part: BRAKE_PAD,
    });
    state = cartReducer(state, { type: "ADD_ITEM", part: OIL_FILTER });
    state = cartReducer(state, {
      type: "REMOVE_ITEM",
      partNumber: "1607328280",
    });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].part.part_number).toBe("1109CK");
  });

  it("no-ops for unknown part number", () => {
    const state = cartReducer(INITIAL_CART_STATE, {
      type: "REMOVE_ITEM",
      partNumber: "NOPE",
    });
    expect(state.lines).toHaveLength(0);
  });
});

// ── CLEAR_CART ──

describe("cartReducer — CLEAR_CART", () => {
  it("removes all items", () => {
    let state = cartReducer(INITIAL_CART_STATE, {
      type: "ADD_ITEM",
      part: BRAKE_PAD,
    });
    state = cartReducer(state, { type: "ADD_ITEM", part: OIL_FILTER });
    state = cartReducer(state, { type: "CLEAR_CART" });
    expect(state.lines).toHaveLength(0);
  });

  it("preserves order type", () => {
    let state = cartReducer(INITIAL_CART_STATE, {
      type: "SET_ORDER_TYPE",
      orderType: "air_dhl",
    });
    state = cartReducer(state, { type: "ADD_ITEM", part: BRAKE_PAD });
    state = cartReducer(state, { type: "CLEAR_CART" });
    expect(state.orderType).toBe("air_dhl");
  });
});

// ── SET_ORDER_TYPE ──

describe("cartReducer — SET_ORDER_TYPE", () => {
  it("changes order type", () => {
    const state = cartReducer(INITIAL_CART_STATE, {
      type: "SET_ORDER_TYPE",
      orderType: "stock",
    });
    expect(state.orderType).toBe("stock");
  });
});

// ── SET_SUBMITTING ──

describe("cartReducer — SET_SUBMITTING", () => {
  it("sets submitting flag", () => {
    const state = cartReducer(INITIAL_CART_STATE, {
      type: "SET_SUBMITTING",
      submitting: true,
    });
    expect(state.submitting).toBe(true);
  });
});

// ── Selectors ──

describe("cart selectors", () => {
  const stateWith2Items = (): CartState => {
    let s = cartReducer(INITIAL_CART_STATE, {
      type: "ADD_ITEM",
      part: BRAKE_PAD,
      qty: 2,
    });
    s = cartReducer(s, { type: "ADD_ITEM", part: OIL_FILTER, qty: 3 });
    return s;
  };

  it("cartLineCount returns number of distinct lines", () => {
    expect(cartLineCount(stateWith2Items())).toBe(2);
  });

  it("cartTotalQty returns sum of all quantities", () => {
    expect(cartTotalQty(stateWith2Items())).toBe(5); // 2 + 3
  });

  it("cartSubtotal returns correct sum", () => {
    // 1850*2 + 320*3 = 3700 + 960 = 4660
    expect(cartSubtotal(stateWith2Items())).toBe(4660);
  });

  it("cartVat returns 14% rounded", () => {
    // 4660 * 0.14 = 652.4, rounded = 652
    expect(cartVat(stateWith2Items())).toBe(652);
  });

  it("cartTotal returns subtotal + vat", () => {
    expect(cartTotal(stateWith2Items())).toBe(4660 + 652);
  });

  it("cartIsEmpty returns true for empty cart", () => {
    expect(cartIsEmpty(INITIAL_CART_STATE)).toBe(true);
  });

  it("cartIsEmpty returns false for non-empty cart", () => {
    expect(cartIsEmpty(stateWith2Items())).toBe(false);
  });

  it("cartHasItem returns true for item in cart", () => {
    expect(cartHasItem(stateWith2Items(), "1607328280")).toBe(true);
  });

  it("cartHasItem returns false for item not in cart", () => {
    expect(cartHasItem(stateWith2Items(), "NOPE")).toBe(false);
  });

  it("cartItemQty returns correct quantity", () => {
    expect(cartItemQty(stateWith2Items(), "1109CK")).toBe(3);
  });

  it("cartItemQty returns 0 for missing item", () => {
    expect(cartItemQty(stateWith2Items(), "NOPE")).toBe(0);
  });
});

// ── Payload builder ──

describe("cartToOrderPayload", () => {
  it("builds correct API payload", () => {
    let s = cartReducer(INITIAL_CART_STATE, {
      type: "SET_ORDER_TYPE",
      orderType: "air_dhl",
    });
    s = cartReducer(s, { type: "ADD_ITEM", part: BRAKE_PAD, qty: 2 });

    const payload = cartToOrderPayload(s, "dlr-001");
    expect(payload.dealer_id).toBe("dlr-001");
    expect(payload.order_type).toBe("air_dhl");
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toEqual({
      part_number: "1607328280",
      part_name: "Front Brake Pad Set",
      part_name_ar: "طقم تيل فرامل أمامي",
      quantity: 2,
      unit_price: 1850,
      currency: "EGP",
      availability_state: "AVAILABLE",
    });
  });

  it("uses 'self' as default dealer_id", () => {
    const payload = cartToOrderPayload(INITIAL_CART_STATE);
    expect(payload.dealer_id).toBe("self");
  });
});

// ── Action descriptions (ARIA) ──

describe("describeAction", () => {
  it("describes ADD_ITEM", () => {
    const msg = describeAction({ type: "ADD_ITEM", part: BRAKE_PAD });
    expect(msg).toContain("Front Brake Pad Set");
    expect(msg).toContain("Added");
  });

  it("describes REMOVE_ITEM", () => {
    const msg = describeAction({ type: "REMOVE_ITEM", partNumber: "X" });
    expect(msg).toContain("Removed");
  });

  it("describes CLEAR_CART", () => {
    const msg = describeAction({ type: "CLEAR_CART" });
    expect(msg).toContain("Cleared");
  });

  it("describes SET_QTY with positive qty", () => {
    const msg = describeAction({ type: "SET_QTY", partNumber: "X", qty: 5 });
    expect(msg).toContain("5");
  });

  it("describes SET_QTY with zero (removal)", () => {
    const msg = describeAction({ type: "SET_QTY", partNumber: "X", qty: 0 });
    expect(msg).toContain("Removed");
  });
});
