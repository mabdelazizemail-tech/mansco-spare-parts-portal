"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  cartReducer,
  INITIAL_CART_STATE,
  describeAction,
  cartLineCount,
  cartTotalQty,
  cartSubtotal,
  cartTotalDiscount,
  cartSubtotalAfterDiscount,
  cartVat,
  cartTotal,
  cartIsEmpty,
  cartHasItem,
  cartItemQty,
  cartToOrderPayload,
  type CartState,
  type CartAction,
  type CartPartSnapshot,
  type OrderType,
} from "./cart-store";

// ── Context shape ──

interface CartContextValue {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  // Convenience methods
  addItem: (part: CartPartSnapshot, qty?: number) => void;
  setQty: (partNumber: string, qty: number) => void;
  removeItem: (partNumber: string) => void;
  clearCart: () => void;
  setOrderType: (type: OrderType) => void;
  setSubmitting: (v: boolean) => void;
  // Selectors
  lineCount: number;
  totalQty: number;
  subtotal: number;
  totalDiscount: number;
  subtotalAfterDiscount: number;
  vat: number;
  total: number;
  isEmpty: boolean;
  hasItem: (partNumber: string) => boolean;
  itemQty: (partNumber: string) => number;
  toPayload: (dealerId?: string) => ReturnType<typeof cartToOrderPayload>;
}

const CartContext = createContext<CartContextValue | null>(null);

// ── Provider ──

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, INITIAL_CART_STATE);
  const liveRef = useRef<HTMLDivElement>(null);

  // ARIA live announcements
  useEffect(() => {
    if (state.lastAction && liveRef.current) {
      const msg = describeAction(state.lastAction);
      if (msg) {
        liveRef.current.textContent = msg;
        // Clear after announcement so repeated identical actions still fire
        const t = setTimeout(() => {
          if (liveRef.current) liveRef.current.textContent = "";
        }, 1000);
        return () => clearTimeout(t);
      }
    }
  }, [state.lastAction]);

  const addItem = useCallback(
    (part: CartPartSnapshot, qty?: number) =>
      dispatch({ type: "ADD_ITEM", part, qty }),
    []
  );
  const setQty = useCallback(
    (partNumber: string, qty: number) =>
      dispatch({ type: "SET_QTY", partNumber, qty }),
    []
  );
  const removeItem = useCallback(
    (partNumber: string) => dispatch({ type: "REMOVE_ITEM", partNumber }),
    []
  );
  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);
  const setOrderType = useCallback(
    (orderType: OrderType) => dispatch({ type: "SET_ORDER_TYPE", orderType }),
    []
  );
  const setSubmitting = useCallback(
    (submitting: boolean) => dispatch({ type: "SET_SUBMITTING", submitting }),
    []
  );

  const value: CartContextValue = {
    state,
    dispatch,
    addItem,
    setQty,
    removeItem,
    clearCart,
    setOrderType,
    setSubmitting,
    lineCount: cartLineCount(state),
    totalQty: cartTotalQty(state),
    subtotal: cartSubtotal(state),
    totalDiscount: cartTotalDiscount(state),
    subtotalAfterDiscount: cartSubtotalAfterDiscount(state),
    vat: cartVat(state),
    total: cartTotal(state),
    isEmpty: cartIsEmpty(state),
    hasItem: (pn) => cartHasItem(state, pn),
    itemQty: (pn) => cartItemQty(state, pn),
    toPayload: (dealerId) => cartToOrderPayload(state, dealerId),
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      {/* Visually hidden ARIA live region for screen readers */}
      <div
        ref={liveRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </CartContext.Provider>
  );
}

// ── Hook ──

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a <CartProvider>");
  }
  return ctx;
}
