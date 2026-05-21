import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { Part } from "./catalog";

export type CartItem = { sku: string; name: string; price: number; image: string; qty: number };

type State = { items: CartItem[] };

type Action =
  | { type: "add"; part: Part; qty?: number }
  | { type: "remove"; sku: string }
  | { type: "qty"; sku: string; qty: number }
  | { type: "clear" }
  | { type: "hydrate"; state: State };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "add": {
      const existing = state.items.find((i) => i.sku === action.part.sku);
      const qty = action.qty ?? 1;
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.sku === action.part.sku ? { ...i, qty: i.qty + qty } : i,
          ),
        };
      }
      return {
        items: [
          ...state.items,
          { sku: action.part.sku, name: action.part.name, price: action.part.price, image: action.part.image, qty },
        ],
      };
    }
    case "remove":
      return { items: state.items.filter((i) => i.sku !== action.sku) };
    case "qty":
      return {
        items: state.items.map((i) =>
          i.sku === action.sku ? { ...i, qty: Math.max(1, action.qty) } : i,
        ),
      };
    case "clear":
      return { items: [] };
  }
};

type Ctx = {
  items: CartItem[];
  totalQty: number;
  subtotal: number;
  add: (part: Part, qty?: number) => void;
  remove: (sku: string) => void;
  setQty: (sku: string, qty: number) => void;
  clear: () => void;
};

const CartCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "peugeot-cart-v1";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, { items: [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "hydrate", state: JSON.parse(raw) });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const value = useMemo<Ctx>(() => ({
    items: state.items,
    totalQty: state.items.reduce((s, i) => s + i.qty, 0),
    subtotal: state.items.reduce((s, i) => s + i.qty * i.price, 0),
    add: (part, qty) => dispatch({ type: "add", part, qty }),
    remove: (sku) => dispatch({ type: "remove", sku }),
    setQty: (sku, qty) => dispatch({ type: "qty", sku, qty }),
    clear: () => dispatch({ type: "clear" }),
  }), [state]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
};

const noopCart: Ctx = {
  items: [],
  totalQty: 0,
  subtotal: 0,
  add: () => {},
  remove: () => {},
  setQty: () => {},
  clear: () => {},
};

export const useCart = () => {
  const ctx = useContext(CartCtx);
  return ctx ?? noopCart;
};

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(n * 50);
