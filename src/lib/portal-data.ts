// ── Portal Data Layer ──
// Re-exports and helpers for dealer-facing portal pages.

import {
  dealers,
  parts,
  orders,
  campaigns,
  dashboardStats,
  formatCurrency,
  type OrderType,
  type OrderStatus,
  type Dealer,
  type Part,
  type Order,
  type Campaign,
  type Availability,
} from "./mock-data";

export { dealers, parts as allParts, orders, campaigns, dashboardStats, formatCurrency };
export type { OrderType, OrderStatus, Dealer, Part, Order, Campaign, Availability };

// ── Tone color type (matches status-badge component) ──

export type ToneColor = "success" | "warning" | "destructive" | "info" | "muted" | "accent";

// ── Current dealer context (mock) ──

const CURRENT_DEALER_ID = "dlr-001";

export function usePortal() {
  const dealer = dealers.find((d) => d.id === CURRENT_DEALER_ID)!;
  const myOrders = orders.filter((o) => o.dealerId === CURRENT_DEALER_ID);
  const role: "dealer" | "admin" = "dealer";

  return {
    dealer,
    role,
    orders: myOrders,
    stats: dashboardStats,
  };
}

// ── Formatting helpers ──

export function formatEGP(value: number): string {
  return `EGP ${value.toLocaleString()}`;
}

// ── Status tone mapping for badges ──

export function statusTone(status: OrderStatus): ToneColor {
  const map: Record<string, ToneColor> = {
    submitted: "info",
    under_review: "warning",
    approved: "success",
    rejected: "destructive",
    done: "success",
    partial: "warning",
    backordered: "accent",
    invoiced: "info",
    shipped: "info",
    delivered: "success",
  };
  return map[status] ?? "muted";
}

// ── Status label helper ──

export function statusLabel(s: OrderStatus): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Order type metadata ──

export const orderTypeMeta: Record<
  OrderType,
  { label: string; tone: ToneColor; description: string }
> = {
  daily: {
    label: "Daily",
    tone: "info",
    description: "Standard replenishment orders with 3-5 day delivery",
  },
  air_dhl: {
    label: "Air / DHL",
    tone: "warning",
    description: "Expedited delivery via Air/DHL in 1-2 business days",
  },
  stock: {
    label: "Stock",
    tone: "accent",
    description: "Bulk allocation orders with 7-14 day delivery",
  },
};

// ── Stock helpers ──

export function getStock(part: Part): number {
  return part.stockCount ?? part.stock ?? 0;
}

export function isItemPriceable(part: Part): boolean {
  // MANSCO rule: unavailable items must NOT show price
  return (
    part.availability !== "unavailable" &&
    part.availability !== "unavailable_eta"
  );
}

export function availabilityTone(availability: Availability): ToneColor {
  switch (availability) {
    case "available":
      return "success";
    case "partial":
    case "partially_available":
      return "warning";
    case "unavailable_eta":
      return "warning";
    case "unavailable":
    default:
      return "destructive";
  }
}
