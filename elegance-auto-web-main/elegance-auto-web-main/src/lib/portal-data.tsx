import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { parts as catalogParts, type Part } from "./catalog";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type Role = "dealer" | "admin";

export type Dealer = {
  id: string;
  code: string;
  name: string;
  city: string;
  tier: "Master" | "Sub-Dealer";
  parentId?: string;
  creditLimit: number;
  outstanding: number;
  overdue: number;
  covering: number; // financial covering %
  targetMonthly: number;
  achievedMonthly: number;
  status: "Active" | "Financial Block" | "Suspended";
  contact: string;
  email: string;
};

export type AvailabilityStatus =
  | "Available"
  | "Partial"
  | "ETA"
  | "No ETA";

export type StockInfo = {
  sku: string;
  onHand: number;
  atp: number; // available-to-promise
  location: string;
  etaDays?: number; // when not fully in stock
  status: AvailabilityStatus;
};

export type OrderType = "Daily" | "Air/DHL" | "Stock";

export type OrderStatus =
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Rejected"
  | "Done"
  | "Partial"
  | "Back Ordered"
  | "Invoiced"
  | "Shipped"
  | "Delivered";

export type OrderLineStatus = "Confirmed" | "Backorder" | "Rejected";

export type OrderLine = {
  sku: string;
  name: string;
  qty: number;
  qtyConfirmed: number;
  unitPrice: number;
  discountPct?: number;
  status: OrderLineStatus;
  etaDays?: number;
};

export type Shipment = {
  carrier: string;
  awb: string;
  shippedAt?: string;
  etaDate?: string;
  deliveredAt?: string;
};

export type Invoice = {
  number: string;
  date: string;
  amount: number;
  status: "Open" | "Paid" | "Overdue";
};

export type Order = {
  id: string;
  dealerId: string;
  type: OrderType;
  createdAt: string;
  requestedDate: string;
  status: OrderStatus;
  lines: OrderLine[];
  invoice?: Invoice;
  shipment?: Shipment;
  reviewReason?: string;
  totalGross: number;
  totalNet: number;
};

export type Inquiry = {
  id: string;
  dealerId: string;
  sku: string;
  name: string;
  qty: number;
  createdAt: string;
  outcome: "Converted" | "Saved" | "Backorder Requested" | "Lost Sale";
  reason?: string;
  etaDays?: number;
};

export type Campaign = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Planned" | "Ended";
  discountPct: number;
  skus: string[];
};

// ────────────────────────────────────────────────────────────────────────────
// Mock data
// ────────────────────────────────────────────────────────────────────────────

export const dealers: Dealer[] = [
  { id: "DLR-001", code: "CAI-001", name: "Auto Prime Cairo", city: "Cairo", tier: "Master", creditLimit: 800000, outstanding: 312500, overdue: 0, covering: 92, targetMonthly: 500000, achievedMonthly: 372000, status: "Active", contact: "Karim Hassan", email: "karim@autoprime.eg" },
  { id: "DLR-002", code: "ALX-014", name: "Mediterranean Motors", city: "Alexandria", tier: "Master", creditLimit: 600000, outstanding: 480000, overdue: 42000, covering: 64, targetMonthly: 350000, achievedMonthly: 198000, status: "Active", contact: "Nour El Din", email: "nour@medmotors.eg" },
  { id: "DLR-003", code: "GIZ-027", name: "Pyramid Auto Parts", city: "Giza", tier: "Sub-Dealer", parentId: "DLR-001", creditLimit: 200000, outstanding: 95000, overdue: 0, covering: 100, targetMonthly: 120000, achievedMonthly: 134000, status: "Active", contact: "Sara Mostafa", email: "sara@pyramid.eg" },
  { id: "DLR-004", code: "MNS-041", name: "Delta Spare Hub", city: "Mansoura", tier: "Sub-Dealer", parentId: "DLR-002", creditLimit: 150000, outstanding: 162000, overdue: 28000, covering: 38, targetMonthly: 90000, achievedMonthly: 41000, status: "Financial Block", contact: "Tarek Helmy", email: "tarek@deltahub.eg" },
  { id: "DLR-005", code: "ASW-052", name: "Upper Egypt Motors", city: "Aswan", tier: "Sub-Dealer", parentId: "DLR-001", creditLimit: 120000, outstanding: 22000, overdue: 0, covering: 100, targetMonthly: 70000, achievedMonthly: 58000, status: "Active", contact: "Mahmoud Saber", email: "mahmoud@uemotors.eg" },
];

export const stock: Record<string, StockInfo> = {
  "PG-BR-4248K9":  { sku: "PG-BR-4248K9", onHand: 48, atp: 48, location: "Cairo DC", status: "Available" },
  "PG-FL-1444TT":  { sku: "PG-FL-1444TT", onHand: 220, atp: 220, location: "Cairo DC", status: "Available" },
  "PG-IG-5960L1":  { sku: "PG-IG-5960L1", onHand: 12, atp: 8, etaDays: 14, location: "Cairo DC", status: "Partial" },
  "PG-WH-17BLK":   { sku: "PG-WH-17BLK", onHand: 4, atp: 4, etaDays: 30, location: "Alex DC", status: "Partial" },
  "PG-EL-BTRY70":  { sku: "PG-EL-BTRY70", onHand: 64, atp: 64, location: "Cairo DC", status: "Available" },
  "PG-LT-LEDFR":   { sku: "PG-LT-LEDFR", onHand: 0, atp: 0, etaDays: 21, location: "EU Hub", status: "ETA" },
  "PG-FL-OIL5W30": { sku: "PG-FL-OIL5W30", onHand: 320, atp: 320, location: "Cairo DC", status: "Available" },
  "PG-SP-SH9001":  { sku: "PG-SP-SH9001", onHand: 0, atp: 0, location: "EU Hub", status: "No ETA" },
};

export const campaigns: Campaign[] = [
  { id: "CMP-2026-04", title: "Q2 Filter Promotion", description: "10% off all genuine filters for Daily orders.", startDate: "2026-04-01", endDate: "2026-06-30", status: "Active", discountPct: 10, skus: ["PG-FL-1444TT", "PG-FL-OIL5W30"] },
  { id: "CMP-2026-05", title: "Brake Safety Drive", description: "Special pricing on brake discs and pads.", startDate: "2026-04-15", endDate: "2026-05-31", status: "Active", discountPct: 8, skus: ["PG-BR-4248K9"] },
  { id: "CMP-2026-06", title: "Battery Season", description: "AGM battery campaign — Stock orders only.", startDate: "2026-06-01", endDate: "2026-08-31", status: "Planned", discountPct: 12, skus: ["PG-EL-BTRY70"] },
  { id: "CMP-2026-03", title: "Spring Service Bundle", description: "Bundle pricing for service parts.", startDate: "2026-02-01", endDate: "2026-03-31", status: "Ended", discountPct: 5, skus: ["PG-FL-OIL5W30", "PG-FL-1444TT"] },
];

const today = new Date();
const isoDaysAgo = (d: number) => new Date(today.getTime() - d * 86400000).toISOString().slice(0, 10);
const isoDaysAhead = (d: number) => new Date(today.getTime() + d * 86400000).toISOString().slice(0, 10);

export const initialOrders: Order[] = [
  {
    id: "SO-2026-0418", dealerId: "DLR-001", type: "Daily", createdAt: isoDaysAgo(1), requestedDate: isoDaysAhead(1),
    status: "Invoiced",
    lines: [
      { sku: "PG-BR-4248K9", name: "Front Brake Disc Set — Ventilated 283mm", qty: 6, qtyConfirmed: 6, unitPrice: 142, discountPct: 8, status: "Confirmed" },
      { sku: "PG-FL-1444TT", name: "Engine Air Filter — Premium", qty: 20, qtyConfirmed: 20, unitPrice: 24.5, discountPct: 10, status: "Confirmed" },
    ],
    invoice: { number: "INV-2026-09812", date: isoDaysAgo(0), amount: 1224.32, status: "Open" },
    shipment: { carrier: "Aramex Egypt", awb: "ARM-77831204", shippedAt: isoDaysAgo(0), etaDate: isoDaysAhead(1) },
    totalGross: 1342, totalNet: 1224.32,
  },
  {
    id: "SO-2026-0417", dealerId: "DLR-001", type: "Air/DHL", createdAt: isoDaysAgo(2), requestedDate: isoDaysAhead(3),
    status: "Shipped",
    lines: [
      { sku: "PG-IG-5960L1", name: "Iridium Spark Plug Set (×4)", qty: 10, qtyConfirmed: 8, unitPrice: 58, status: "Backorder", etaDays: 14 },
    ],
    invoice: { number: "INV-2026-09805", date: isoDaysAgo(2), amount: 464, status: "Open" },
    shipment: { carrier: "DHL Express", awb: "DHL-882-44119", shippedAt: isoDaysAgo(1), etaDate: isoDaysAhead(2) },
    totalGross: 580, totalNet: 464,
  },
  {
    id: "SO-2026-0416", dealerId: "DLR-002", type: "Stock", createdAt: isoDaysAgo(4), requestedDate: isoDaysAhead(20),
    status: "Under Review", reviewReason: "Credit limit exceeded by EGP 42,000",
    lines: [
      { sku: "PG-EL-BTRY70", name: "Starter Battery 70Ah AGM", qty: 24, qtyConfirmed: 0, unitPrice: 189, status: "Confirmed" },
    ],
    totalGross: 4536, totalNet: 4536,
  },
  {
    id: "SO-2026-0415", dealerId: "DLR-003", type: "Daily", createdAt: isoDaysAgo(5), requestedDate: isoDaysAhead(0),
    status: "Delivered",
    lines: [
      { sku: "PG-FL-OIL5W30", name: "Premium Synthetic Engine Oil 5W-30 — 5L", qty: 40, qtyConfirmed: 40, unitPrice: 64, discountPct: 5, status: "Confirmed" },
    ],
    invoice: { number: "INV-2026-09760", date: isoDaysAgo(5), amount: 2432, status: "Paid" },
    shipment: { carrier: "Egypt Post Express", awb: "EPE-44211", shippedAt: isoDaysAgo(4), etaDate: isoDaysAgo(3), deliveredAt: isoDaysAgo(3) },
    totalGross: 2560, totalNet: 2432,
  },
  {
    id: "SO-2026-0414", dealerId: "DLR-001", type: "Daily", createdAt: isoDaysAgo(6), requestedDate: isoDaysAhead(0),
    status: "Back Ordered",
    lines: [
      { sku: "PG-WH-17BLK", name: 'Alloy Wheel "Sirius" 17" — Diamond Cut', qty: 8, qtyConfirmed: 4, unitPrice: 389, status: "Backorder", etaDays: 30 },
      { sku: "PG-LT-LEDFR", name: "Full LED Headlight — Right", qty: 2, qtyConfirmed: 0, unitPrice: 612, status: "Backorder", etaDays: 21 },
    ],
    invoice: { number: "INV-2026-09740", date: isoDaysAgo(6), amount: 1556, status: "Open" },
    totalGross: 4336, totalNet: 1556,
  },
  {
    id: "SO-2026-0413", dealerId: "DLR-005", type: "Daily", createdAt: isoDaysAgo(8), requestedDate: isoDaysAhead(0),
    status: "Done",
    lines: [
      { sku: "PG-SP-SH9001", name: "Front Shock Absorber — Gas", qty: 4, qtyConfirmed: 4, unitPrice: 124, status: "Confirmed" },
    ],
    invoice: { number: "INV-2026-09702", date: isoDaysAgo(8), amount: 496, status: "Paid" },
    shipment: { carrier: "Aramex Egypt", awb: "ARM-77810004", shippedAt: isoDaysAgo(7), etaDate: isoDaysAgo(5), deliveredAt: isoDaysAgo(5) },
    totalGross: 496, totalNet: 496,
  },
];

export const initialInquiries: Inquiry[] = [
  { id: "INQ-2026-2201", dealerId: "DLR-001", sku: "PG-LT-LEDFR", name: "Full LED Headlight — Right", qty: 4, createdAt: isoDaysAgo(2), outcome: "Backorder Requested", etaDays: 21 },
  { id: "INQ-2026-2198", dealerId: "DLR-002", sku: "PG-SP-SH9001", name: "Front Shock Absorber — Gas", qty: 12, createdAt: isoDaysAgo(3), outcome: "Lost Sale", reason: "No ETA available; dealer sourced locally." },
  { id: "INQ-2026-2196", dealerId: "DLR-001", sku: "PG-WH-17BLK", name: 'Alloy Wheel "Sirius" 17"', qty: 16, createdAt: isoDaysAgo(4), outcome: "Saved", etaDays: 30 },
  { id: "INQ-2026-2191", dealerId: "DLR-003", sku: "PG-FL-OIL5W30", name: "Engine Oil 5W-30 5L", qty: 60, createdAt: isoDaysAgo(5), outcome: "Converted" },
  { id: "INQ-2026-2188", dealerId: "DLR-004", sku: "PG-EL-BTRY70", name: "Starter Battery 70Ah AGM", qty: 30, createdAt: isoDaysAgo(6), outcome: "Lost Sale", reason: "Dealer financial block — order rejected." },
];

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

export const formatEGP = (n: number) =>
  new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(n * 50);

export const orderTypeMeta: Record<OrderType, { label: string; eta: string; tone: string; description: string }> = {
  "Daily":   { label: "Daily Order",   eta: "Next business day",   tone: "bg-info/10 text-info border-info/30",         description: "Routine replenishment shipped daily from the Cairo distribution centre." },
  "Air/DHL": { label: "Air / DHL",     eta: "3–5 working days",    tone: "bg-warning/10 text-warning border-warning/40", description: "Express courier from EU hub for urgent or low-volume parts." },
  "Stock":   { label: "Stock Order",   eta: "20–30 working days",  tone: "bg-success/10 text-success border-success/30", description: "Bulk container shipment with planned ETA and best pricing." },
};

export const statusTone: Record<OrderStatus, string> = {
  "Submitted":     "bg-muted text-foreground border-border",
  "Under Review":  "bg-warning/10 text-warning border-warning/40",
  "Approved":      "bg-info/10 text-info border-info/30",
  "Rejected":      "bg-destructive/10 text-destructive border-destructive/30",
  "Done":          "bg-success/10 text-success border-success/30",
  "Partial":       "bg-warning/10 text-warning border-warning/40",
  "Back Ordered":  "bg-warning/10 text-warning border-warning/40",
  "Invoiced":      "bg-info/10 text-info border-info/30",
  "Shipped":       "bg-info/10 text-info border-info/30",
  "Delivered":     "bg-success/10 text-success border-success/30",
};

export const availabilityTone: Record<AvailabilityStatus, string> = {
  "Available":   "bg-success/10 text-success border-success/30",
  "Partial":     "bg-warning/10 text-warning border-warning/40",
  "ETA":         "bg-info/10 text-info border-info/30",
  "No ETA":      "bg-destructive/10 text-destructive border-destructive/30",
};

export const isItemPriceable = (sku: string) => {
  const s = stock[sku];
  // Mandatory rule: if not available now or via ETA → no price shown
  if (!s) return false;
  return s.status !== "No ETA";
};

export const getStock = (sku: string): StockInfo => stock[sku] ?? { sku, onHand: 0, atp: 0, location: "—", status: "No ETA" };

export const allParts: Part[] = catalogParts;

// ────────────────────────────────────────────────────────────────────────────
// Portal context (current dealer / role / orders / cart)
// ────────────────────────────────────────────────────────────────────────────

export type CartLine = { sku: string; qty: number };

type Ctx = {
  role: Role;
  setRole: (r: Role) => void;
  dealer: Dealer;
  setDealerId: (id: string) => void;
  orders: Order[];
  inquiries: Inquiry[];
  cart: CartLine[];
  cartType: OrderType;
  setCartType: (t: OrderType) => void;
  addToCart: (sku: string, qty: number) => void;
  updateCart: (sku: string, qty: number) => void;
  removeFromCart: (sku: string) => void;
  clearCart: () => void;
  submitOrder: () => Order;
  approveOrder: (id: string) => void;
  rejectOrder: (id: string, reason: string) => void;
  recordInquiry: (sku: string, qty: number, outcome: Inquiry["outcome"], reason?: string) => void;
};

const PortalCtx = createContext<Ctx | null>(null);

export const PortalProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<Role>("dealer");
  const [dealerId, setDealerId] = useState<string>("DLR-001");
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartType, setCartType] = useState<OrderType>("Daily");

  const dealer = useMemo(() => dealers.find((d) => d.id === dealerId) ?? dealers[0], [dealerId]);

  const addToCart = (sku: string, qty: number) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.sku === sku);
      if (existing) return prev.map((l) => (l.sku === sku ? { ...l, qty: l.qty + qty } : l));
      return [...prev, { sku, qty }];
    });
  };

  const updateCart = (sku: string, qty: number) =>
    setCart((prev) => prev.map((l) => (l.sku === sku ? { ...l, qty: Math.max(1, qty) } : l)));

  const removeFromCart = (sku: string) =>
    setCart((prev) => prev.filter((l) => l.sku !== sku));

  const clearCart = () => setCart([]);

  const submitOrder = (): Order => {
    const seq = String(420 + orders.length).padStart(4, "0");
    const lines: OrderLine[] = cart.map((l) => {
      const part = allParts.find((p) => p.sku === l.sku)!;
      const s = getStock(l.sku);
      const confirmed = Math.min(l.qty, s.atp);
      const status: OrderLineStatus = confirmed === l.qty ? "Confirmed" : confirmed > 0 ? "Backorder" : "Backorder";
      const campaign = campaigns.find((c) => c.status === "Active" && c.skus.includes(l.sku));
      return {
        sku: l.sku, name: part.name, qty: l.qty, qtyConfirmed: confirmed,
        unitPrice: part.price, discountPct: campaign?.discountPct, status,
        etaDays: status !== "Confirmed" ? s.etaDays : undefined,
      };
    });

    const totalGross = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    const totalNet = lines.reduce((s, l) => s + l.qtyConfirmed * l.unitPrice * (1 - (l.discountPct ?? 0) / 100), 0);

    const allConfirmed = lines.every((l) => l.status === "Confirmed");
    const anyConfirmed = lines.some((l) => l.qtyConfirmed > 0);
    const overLimit = dealer.outstanding + totalGross > dealer.creditLimit;

    let status: OrderStatus = "Submitted";
    let reviewReason: string | undefined;
    if (overLimit) {
      status = "Under Review";
      reviewReason = `Order exceeds credit limit by EGP ${(dealer.outstanding + totalGross - dealer.creditLimit).toLocaleString()}`;
    } else if (allConfirmed) {
      status = "Approved";
    } else if (anyConfirmed) {
      status = "Partial";
    } else {
      status = "Back Ordered";
    }

    const newOrder: Order = {
      id: `SO-2026-${seq}`,
      dealerId: dealer.id,
      type: cartType,
      createdAt: new Date().toISOString().slice(0, 10),
      requestedDate: new Date(today.getTime() + 86400000).toISOString().slice(0, 10),
      status,
      lines,
      reviewReason,
      totalGross,
      totalNet,
    };
    setOrders((prev) => [newOrder, ...prev]);

    // log inquiries for unfulfilled lines
    lines.forEach((l) => {
      if (l.qtyConfirmed < l.qty) {
        recordInquiry(l.sku, l.qty - l.qtyConfirmed, l.qtyConfirmed === 0 && !l.etaDays ? "Lost Sale" : "Backorder Requested", l.qtyConfirmed === 0 && !l.etaDays ? "No availability — no ETA" : undefined);
      }
    });

    setCart([]);
    return newOrder;
  };

  const approveOrder = (id: string) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "Approved", reviewReason: undefined } : o)));

  const rejectOrder = (id: string, reason: string) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "Rejected", reviewReason: reason } : o)));

  const recordInquiry: Ctx["recordInquiry"] = (sku, qty, outcome, reason) => {
    const part = allParts.find((p) => p.sku === sku);
    setInquiries((prev) => [{
      id: `INQ-2026-${String(2300 + prev.length).padStart(4, "0")}`,
      dealerId, sku, name: part?.name ?? sku, qty,
      createdAt: new Date().toISOString().slice(0, 10),
      outcome, reason, etaDays: getStock(sku).etaDays,
    }, ...prev]);
  };

  const value: Ctx = {
    role, setRole, dealer, setDealerId,
    orders, inquiries, cart, cartType, setCartType,
    addToCart, updateCart, removeFromCart, clearCart,
    submitOrder, approveOrder, rejectOrder, recordInquiry,
  };

  return <PortalCtx.Provider value={value}>{children}</PortalCtx.Provider>;
};

export const usePortal = () => {
  const ctx = useContext(PortalCtx);
  if (!ctx) throw new Error("usePortal must be used inside PortalProvider");
  return ctx;
};
