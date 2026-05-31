import { describe, it, expect } from "vitest";
import {
  cartReducer,
  INITIAL_CART_STATE,
  cartSubtotal,
  cartTotalDiscount,
  cartSubtotalAfterDiscount,
  cartVat,
  cartTotal,
  type CartPartSnapshot,
} from "@/lib/cart/cart-store";

const snap = (over: Partial<CartPartSnapshot> = {}): CartPartSnapshot => ({
  part_number: "P1",
  name: "Brake Pad",
  name_ar: "تيل",
  category: "brakes",
  model: "3008",
  oem: null,
  image: null,
  availability_state: "AVAILABLE",
  availability_label_en: "Available",
  quantity_available: 100,
  replenishment_eta: null,
  unit_price: 1000,
  currency: "EGP",
  ...over,
});

const addLine = (state = INITIAL_CART_STATE, snapshot: CartPartSnapshot, qty = 1) =>
  cartReducer(state, { type: "ADD_ITEM", part: snapshot, qty });

describe("cart discount selectors", () => {
  it("returns zero discount when no line has a discounted price", () => {
    const s = addLine(undefined, snap(), 5);
    expect(cartSubtotal(s)).toBe(5000);
    expect(cartTotalDiscount(s)).toBe(0);
    expect(cartSubtotalAfterDiscount(s)).toBe(5000);
  });

  it("sums per-line discount based on (original - discounted) * qty", () => {
    const discounted = snap({
      campaign_id: "c1",
      discount_pct: 10,
      original_unit_price: 1000,
      discounted_unit_price: 900,
    });
    const s = addLine(undefined, discounted, 12);
    expect(cartSubtotal(s)).toBe(12000); // 1000 * 12
    expect(cartTotalDiscount(s)).toBe(1200); // 100 * 12
    expect(cartSubtotalAfterDiscount(s)).toBe(10800);
  });

  it("computes VAT on the after-discount subtotal", () => {
    const discounted = snap({
      campaign_id: "c1",
      discount_pct: 10,
      original_unit_price: 1000,
      discounted_unit_price: 900,
    });
    const s = addLine(undefined, discounted, 10);
    expect(cartSubtotalAfterDiscount(s)).toBe(9000);
    // VAT = 14% of 9000 = 1260
    expect(cartVat(s)).toBe(1260);
    // Total = 9000 + 1260
    expect(cartTotal(s)).toBe(10260);
  });

  it("mixes discounted and non-discounted lines correctly", () => {
    let s = addLine(undefined, snap({
      unit_price: 100,
      campaign_id: "c1",
      discount_pct: 20,
      original_unit_price: 100,
      discounted_unit_price: 80,
    }), 5);
    s = addLine(s, snap({ part_number: "P2", unit_price: 200 }), 3);
    // Subtotal (original): 100*5 + 200*3 = 1100
    expect(cartSubtotal(s)).toBe(1100);
    // Discount: 20*5 + 0 = 100
    expect(cartTotalDiscount(s)).toBe(100);
    // After-discount: 1000
    expect(cartSubtotalAfterDiscount(s)).toBe(1000);
  });

  it("treats missing discount fields as no discount (back-compat)", () => {
    const s = addLine(undefined, snap({ unit_price: 500 }), 2);
    expect(cartTotalDiscount(s)).toBe(0);
    expect(cartSubtotalAfterDiscount(s)).toBe(cartSubtotal(s));
  });
});
