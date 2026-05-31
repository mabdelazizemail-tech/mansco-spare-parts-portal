"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { catalog, type CatalogPart } from "./catalog";
import { createClient } from "./supabase/client";

/* ─────────────────────── Types ─────────────────────── */

export type Role = "dealer" | "sub_dealer" | "admin" | "super_admin";

export interface Dealer {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  branch: string;
  type: "dealer" | "sub_dealer";
  creditLimit: number;
  creditUsed: number;
  overdueBalance: number;
  targetAmount: number;
  achievedAmount: number;
  isActive: boolean;
  financialStatus: "active" | "blocked" | "warning";
}

export type AvailabilityStatus =
  | "available"
  | "partially_available"
  | "not_available_with_eta"
  | "not_available_no_eta";

export interface StockInfo {
  partNumber: string;
  status: AvailabilityStatus;
  quantityAvailable: number;
  quantityAtp: number;
  price: number;
  eta?: string;
}

export type OrderType = "daily" | "air_dhl" | "stock";

export type OrderStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "done"
  | "partial"
  | "backordered"
  | "invoiced"
  | "shipped"
  | "delivered";

export type OrderLineStatus =
  | "confirmed"
  | "backordered"
  | "cancelled"
  | "shipped"
  | "delivered";

export interface OrderLine {
  partNumber: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineStatus: OrderLineStatus;
  backorderEta?: string;
}

export interface Shipment {
  carrier: string;
  trackingNumber: string;
  shipmentDate: string;
  eta: string;
  actualDelivery?: string;
}

export interface Invoice {
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  dueDate: string;
  status: "paid" | "pending" | "overdue";
}

export interface Order {
  id: string;
  orderNumber: string;
  dealerId: string;
  orderType: OrderType;
  status: OrderStatus;
  submittedAt: string;
  approvedAt?: string;
  totalAmount: number;
  lines: OrderLine[];
  shipments: Shipment[];
  invoices: Invoice[];
}

export interface Inquiry {
  id: string;
  dealerId: string;
  partNumber: string;
  quantity: number;
  inquiryType: "search" | "order_attempt";
  convertedToOrderId?: string;
  createdAt: string;
  reason?: string;
}

export interface Campaign {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  startDate: string;
  endDate: string;
  discountPct: number;
  partNumbers: string[];
  isActive: boolean;
  image: string;
}

export interface CartLine {
  partNumber: string;
  name: string;
  quantity: number;
  unitPrice: number;
  image: string;
}

export interface Part extends CatalogPart {
  price: number;
  stock: StockInfo;
  /** Convenience alias for stock.status — used by page components. */
  availability: AvailabilityStatus;
  /** Convenience alias for stock.eta */
  eta?: string;
  /** Is this a campaign part? */
  isCampaign?: boolean;
}

/* ─────────────────────── Mock Data ─────────────────────── */

export const dealers: Dealer[] = [
  {
    id: "d1",
    code: "MNS-CAI-001",
    name: "Cairo Motors",
    nameAr: "كايرو موتورز",
    branch: "Nasr City, Cairo",
    type: "dealer",
    creditLimit: 500000,
    creditUsed: 185000,
    overdueBalance: 12000,
    targetAmount: 300000,
    achievedAmount: 210000,
    isActive: true,
    financialStatus: "active",
  },
  {
    id: "d2",
    code: "MNS-ALX-002",
    name: "Alexandria Auto",
    nameAr: "اسكندرية اوتو",
    branch: "Smouha, Alexandria",
    type: "dealer",
    creditLimit: 350000,
    creditUsed: 120000,
    overdueBalance: 0,
    targetAmount: 200000,
    achievedAmount: 160000,
    isActive: true,
    financialStatus: "active",
  },
  {
    id: "d3",
    code: "MNS-CAI-003",
    name: "Heliopolis Parts",
    nameAr: "هليوبوليس بارتس",
    branch: "Heliopolis, Cairo",
    type: "sub_dealer",
    creditLimit: 150000,
    creditUsed: 45000,
    overdueBalance: 5000,
    targetAmount: 100000,
    achievedAmount: 62000,
    isActive: true,
    financialStatus: "warning",
  },
];

export const stock: StockInfo[] = [
  { partNumber: "PSA-4254.22", status: "available", quantityAvailable: 150, quantityAtp: 150, price: 1250 },
  { partNumber: "PSA-4249.34", status: "available", quantityAvailable: 45, quantityAtp: 45, price: 2800 },
  { partNumber: "PSA-5271.E5", status: "partially_available", quantityAvailable: 8, quantityAtp: 8, price: 3500, eta: "2026-06-05" },
  { partNumber: "PSA-5040.R0", status: "available", quantityAvailable: 22, quantityAtp: 22, price: 1800 },
  { partNumber: "PSA-4254.68", status: "available", quantityAvailable: 90, quantityAtp: 90, price: 1100 },
  { partNumber: "PSA-1109.CK", status: "available", quantityAvailable: 500, quantityAtp: 500, price: 280 },
  { partNumber: "PSA-V861.7B", status: "partially_available", quantityAvailable: 5, quantityAtp: 5, price: 4200, eta: "2026-06-10" },
  { partNumber: "PSA-1007.49", status: "not_available_with_eta", quantityAvailable: 0, quantityAtp: 0, price: 1600, eta: "2026-06-20" },
  { partNumber: "PSA-5970.98", status: "available", quantityAvailable: 300, quantityAtp: 300, price: 450 },
  { partNumber: "PSA-1201.G9", status: "available", quantityAvailable: 18, quantityAtp: 18, price: 2200 },
  { partNumber: "PSA-6216.E0", status: "available", quantityAvailable: 30, quantityAtp: 30, price: 5500 },
  { partNumber: "PSA-6351.HH", status: "not_available_no_eta", quantityAvailable: 0, quantityAtp: 0, price: 3200 },
  { partNumber: "PSA-5978.P0", status: "available", quantityAvailable: 12, quantityAtp: 12, price: 7800 },
  { partNumber: "PSA-5983.F5", status: "partially_available", quantityAvailable: 3, quantityAtp: 3, price: 6500, eta: "2026-06-15" },
  { partNumber: "PSA-7104.GG", status: "available", quantityAvailable: 25, quantityAtp: 25, price: 4800 },
  { partNumber: "PSA-8231.PN", status: "available", quantityAvailable: 40, quantityAtp: 40, price: 3100 },
  { partNumber: "PSA-7111.LN", status: "not_available_with_eta", quantityAvailable: 0, quantityAtp: 0, price: 1900, eta: "2026-07-01" },
  { partNumber: "PSA-1444.TJ", status: "available", quantityAvailable: 600, quantityAtp: 600, price: 180 },
  { partNumber: "PSA-9809.72", status: "available", quantityAvailable: 400, quantityAtp: 400, price: 150 },
  { partNumber: "PSA-1906.E6", status: "available", quantityAvailable: 200, quantityAtp: 200, price: 350 },
  { partNumber: "PSA-1330.Q1", status: "partially_available", quantityAvailable: 6, quantityAtp: 6, price: 5200, eta: "2026-06-08" },
  { partNumber: "PSA-1336.X2", status: "available", quantityAvailable: 80, quantityAtp: 80, price: 420 },
  { partNumber: "PSA-2150.CW", status: "available", quantityAvailable: 15, quantityAtp: 15, price: 6800 },
  { partNumber: "PSA-2313.H6", status: "not_available_with_eta", quantityAvailable: 0, quantityAtp: 0, price: 1400, eta: "2026-06-25" },
  { partNumber: "PSA-4048.L7", status: "available", quantityAvailable: 60, quantityAtp: 60, price: 750 },
  { partNumber: "PSA-4062.R4", status: "available", quantityAvailable: 10, quantityAtp: 10, price: 4500 },
  { partNumber: "PSA-1731.AN", status: "not_available_no_eta", quantityAvailable: 0, quantityAtp: 0, price: 12000 },
  { partNumber: "PSA-1726.S4", status: "available", quantityAvailable: 20, quantityAtp: 20, price: 3800 },
  { partNumber: "PSA-6438.JA", status: "available", quantityAvailable: 250, quantityAtp: 250, price: 320 },
  { partNumber: "PSA-1608.F9", status: "available", quantityAvailable: 35, quantityAtp: 35, price: 4200 },
];

export const campaigns: Campaign[] = [
  {
    id: "c1",
    name: "Summer Brake Special",
    nameAr: "عرض فرامل الصيف",
    description: "15% off all brake components for Peugeot 301 and 508",
    descriptionAr: "خصم 15% على جميع قطع الفرامل لبيجو 301 و508",
    startDate: "2026-05-01",
    endDate: "2026-07-31",
    discountPct: 15,
    partNumbers: ["PSA-4254.22", "PSA-4249.34", "PSA-4254.68"],
    isActive: true,
    image: "/campaigns/summer-brake.jpg",
  },
  {
    id: "c2",
    name: "Filter Bundle Deal",
    nameAr: "عرض حزمة الفلاتر",
    description: "Buy 50+ filters, get 20% discount",
    descriptionAr: "اشترِ 50+ فلتر واحصل على خصم 20%",
    startDate: "2026-05-15",
    endDate: "2026-06-30",
    discountPct: 20,
    partNumbers: ["PSA-1109.CK", "PSA-1444.TJ", "PSA-9809.72", "PSA-1906.E6"],
    isActive: true,
    image: "/campaigns/filter-bundle.jpg",
  },
  {
    id: "c3",
    name: "Lighting Clearance",
    nameAr: "تصفية الإضاءة",
    description: "10% off headlight and taillight assemblies",
    descriptionAr: "خصم 10% على مجموعات الكشافات والمصابيح",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    discountPct: 10,
    partNumbers: ["PSA-6216.E0", "PSA-6351.HH"],
    isActive: true,
    image: "/campaigns/lighting.jpg",
  },
];

export const initialOrders: Order[] = [
  {
    id: "o1",
    orderNumber: "ORD-2026-0142",
    dealerId: "d1",
    orderType: "daily",
    status: "delivered",
    submittedAt: "2026-05-10T09:30:00Z",
    approvedAt: "2026-05-10T10:15:00Z",
    totalAmount: 18750,
    lines: [
      { partNumber: "PSA-4254.22", name: "Front Brake Pad Set", quantity: 10, unitPrice: 1250, lineStatus: "delivered" },
      { partNumber: "PSA-1109.CK", name: "Oil Filter", quantity: 25, unitPrice: 280, lineStatus: "delivered" },
    ],
    shipments: [
      { carrier: "MANSCO Logistics", trackingNumber: "MNS-TRK-20260510-001", shipmentDate: "2026-05-11", eta: "2026-05-14", actualDelivery: "2026-05-13" },
    ],
    invoices: [
      { invoiceNumber: "INV-2026-0198", invoiceDate: "2026-05-11", totalAmount: 18750, dueDate: "2026-06-10", status: "paid" },
    ],
  },
  {
    id: "o2",
    orderNumber: "ORD-2026-0155",
    dealerId: "d1",
    orderType: "air_dhl",
    status: "shipped",
    submittedAt: "2026-05-15T14:00:00Z",
    approvedAt: "2026-05-15T14:30:00Z",
    totalAmount: 35000,
    lines: [
      { partNumber: "PSA-5271.E5", name: "Front Shock Absorber", quantity: 4, unitPrice: 3500, lineStatus: "shipped" },
      { partNumber: "PSA-V861.7B", name: "Timing Belt Kit", quantity: 5, unitPrice: 4200, lineStatus: "shipped" },
    ],
    shipments: [
      { carrier: "DHL Express", trackingNumber: "DHL-1234567890", shipmentDate: "2026-05-16", eta: "2026-05-18" },
    ],
    invoices: [
      { invoiceNumber: "INV-2026-0212", invoiceDate: "2026-05-16", totalAmount: 35000, dueDate: "2026-06-15", status: "pending" },
    ],
  },
  {
    id: "o3",
    orderNumber: "ORD-2026-0160",
    dealerId: "d1",
    orderType: "stock",
    status: "partial",
    submittedAt: "2026-05-17T08:00:00Z",
    approvedAt: "2026-05-17T09:00:00Z",
    totalAmount: 52000,
    lines: [
      { partNumber: "PSA-6216.E0", name: "Headlight Assembly LH", quantity: 6, unitPrice: 5500, lineStatus: "confirmed" },
      { partNumber: "PSA-7104.GG", name: "Front Bumper", quantity: 4, unitPrice: 4800, lineStatus: "backordered", backorderEta: "2026-06-05" },
    ],
    shipments: [],
    invoices: [],
  },
  {
    id: "o4",
    orderNumber: "ORD-2026-0165",
    dealerId: "d1",
    orderType: "daily",
    status: "submitted",
    submittedAt: "2026-05-19T07:45:00Z",
    totalAmount: 9600,
    lines: [
      { partNumber: "PSA-1444.TJ", name: "Air Filter", quantity: 20, unitPrice: 180, lineStatus: "confirmed" },
      { partNumber: "PSA-9809.72", name: "Cabin Filter", quantity: 20, unitPrice: 150, lineStatus: "confirmed" },
      { partNumber: "PSA-1906.E6", name: "Fuel Filter", quantity: 10, unitPrice: 350, lineStatus: "confirmed" },
    ],
    shipments: [],
    invoices: [],
  },
  {
    id: "o5",
    orderNumber: "ORD-2026-0168",
    dealerId: "d2",
    orderType: "daily",
    status: "approved",
    submittedAt: "2026-05-18T11:00:00Z",
    approvedAt: "2026-05-18T12:00:00Z",
    totalAmount: 22400,
    lines: [
      { partNumber: "PSA-4254.22", name: "Front Brake Pad Set", quantity: 8, unitPrice: 1250, lineStatus: "confirmed" },
      { partNumber: "PSA-4249.34", name: "Front Brake Disc", quantity: 4, unitPrice: 2800, lineStatus: "confirmed" },
    ],
    shipments: [],
    invoices: [],
  },
];

export const initialInquiries: Inquiry[] = [
  { id: "inq1", dealerId: "d1", partNumber: "PSA-1007.49", quantity: 5, inquiryType: "order_attempt", createdAt: "2026-05-18T10:00:00Z", reason: "not_available_with_eta" },
  { id: "inq2", dealerId: "d1", partNumber: "PSA-6351.HH", quantity: 3, inquiryType: "search", createdAt: "2026-05-17T15:30:00Z", reason: "not_available_no_eta" },
  { id: "inq3", dealerId: "d2", partNumber: "PSA-1731.AN", quantity: 2, inquiryType: "order_attempt", createdAt: "2026-05-19T08:00:00Z", reason: "not_available_no_eta" },
  { id: "inq4", dealerId: "d3", partNumber: "PSA-7111.LN", quantity: 10, inquiryType: "search", createdAt: "2026-05-19T09:15:00Z", reason: "not_available_with_eta" },
];

/* ─────────────────────── Helpers ─────────────────────── */

export function formatEGP(amount: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export type ToneColor = "success" | "warning" | "destructive" | "info" | "muted" | "accent";

export const orderTypeMeta: Record<OrderType, { label: string; labelAr: string; color: string; icon: string; tone: ToneColor; description: string }> = {
  daily: { label: "Daily", labelAr: "يومي", color: "hsl(200 90% 55%)", icon: "CalendarDays", tone: "info", description: "Standard replenishment order" },
  air_dhl: { label: "Air/DHL", labelAr: "جوي/DHL", color: "hsl(38 95% 55%)", icon: "Plane", tone: "warning", description: "Expedited air/DHL shipment" },
  stock: { label: "Stock", labelAr: "مخزون", color: "hsl(145 60% 48%)", icon: "Warehouse", tone: "success", description: "Bulk stock order from warehouse" },
};

export function statusTone(status: OrderStatus): ToneColor {
  const map: Record<OrderStatus, ToneColor> = {
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

export function statusLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    submitted: "Submitted",
    under_review: "Under Review",
    approved: "Approved",
    rejected: "Rejected",
    done: "Done",
    partial: "Partial",
    backordered: "Back-ordered",
    invoiced: "Invoiced",
    shipped: "Shipped",
    delivered: "Delivered",
  };
  return map[status] ?? status;
}

export function availabilityTone(status: AvailabilityStatus): ToneColor {
  const map: Record<AvailabilityStatus, ToneColor> = {
    available: "success",
    partially_available: "warning",
    not_available_with_eta: "accent",
    not_available_no_eta: "destructive",
  };
  return map[status] ?? "muted";
}

/** Parts that are not available must NOT show a price. */
export function isItemPriceable(partOrStatus: Part | AvailabilityStatus): boolean {
  const status = typeof partOrStatus === "string" ? partOrStatus : partOrStatus.stock.status;
  return status === "available" || status === "partially_available";
}

export function getStock(partOrNumber: Part | string): number {
  if (typeof partOrNumber === "string") {
    return stock.find((s) => s.partNumber === partOrNumber)?.quantityAvailable ?? 0;
  }
  return partOrNumber.stock.quantityAvailable;
}

export const allParts: Part[] = catalog.map((c) => {
  const s = stock.find((si) => si.partNumber === c.partNumber) ?? {
    partNumber: c.partNumber,
    status: "not_available_no_eta" as AvailabilityStatus,
    quantityAvailable: 0,
    quantityAtp: 0,
    price: 0,
  };
  return { ...c, price: s.price, stock: s, availability: s.status, eta: s.eta, isCampaign: false };
});

/* ─────────────────────── Context ─────────────────────── */

export interface PortalStats {
  totalOrders: number;
  pendingOrders: number;
  creditLimit: number;
  creditUsed: number;
  availableCredit: number;
  overdueBalance: number;
  targetPercent: number;
  monthlyRevenue: number;
}

interface PortalContextValue {
  role: Role;
  setRole: (role: Role) => void;
  dealer: Dealer;
  currentDealer: Dealer;
  setCurrentDealer: (dealer: Dealer) => void;
  dealers: Dealer[];
  stats: PortalStats;
  orders: Order[];
  inquiries: Inquiry[];
  cart: CartLine[];
  cartType: OrderType;
  setCartType: (type: OrderType) => void;
  addToCart: (line: CartLine) => void;
  updateCart: (partNumber: string, quantity: number) => void;
  removeFromCart: (partNumber: string) => void;
  clearCart: () => void;
  submitOrder: () => Order;
  approveOrder: (orderId: string) => void;
  rejectOrder: (orderId: string, reason: string) => void;
  recordInquiry: (inquiry: Omit<Inquiry, "id" | "createdAt">) => void;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("dealer");
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartType, setCartType] = useState<OrderType>("daily");
  const [loading, setLoading] = useState(true);

  // Load authenticated dealer and orders from Supabase
  useEffect(() => {
    const loadDealerData = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("Auth error:", userError);
          setLoading(false);
          return;
        }

        // Get user role
        const userRole = user.user_metadata?.role as string | undefined;
        if (userRole === "admin" || userRole === "super_admin") {
          setRole("admin");
        } else {
          setRole("dealer");
        }

        // For dealers, fetch their dealer record from Supabase
        if (userRole === "dealer" || userRole === "sub_dealer") {
          // Get dealer by supabase_uid
          const { data: dealerData, error: dealerError } = await supabase
            .from("dealers")
            .select("*")
            .eq("supabase_uid", user.id)
            .single();

          if (dealerError) {
            console.error("Failed to fetch dealer:", dealerError);
            setLoading(false);
            return;
          }

          if (dealerData) {
            // Map database fields to Dealer interface
            const mappedDealer: Dealer = {
              id: dealerData.id,
              code: dealerData.code,
              name: dealerData.company_name,
              nameAr: dealerData.company_name, // Fallback for Arabic name
              branch: dealerData.branch_address,
              type: dealerData.dealer_type as "dealer" | "sub_dealer",
              creditLimit: parseFloat(dealerData.credit_limit),
              creditUsed: 0, // Will be calculated from orders
              overdueBalance: parseFloat(dealerData.overdue_balance),
              targetAmount: 0, // Placeholder
              achievedAmount: 0, // Placeholder
              isActive: dealerData.is_active,
              financialStatus: dealerData.financial_status as "active" | "blocked" | "warning",
            };

            setDealer(mappedDealer);

            // Fetch orders for this dealer. orders.dealer_id stores the dealer
            // CODE (see POST /api/orders), but older rows may carry the UUID —
            // match either so the dashboard never silently shows zero orders.
            const dealerKeys = [dealerData.id, dealerData.code].filter(
              (v: string | null): v is string => typeof v === "string" && v.length > 0
            );
            const { data: ordersData, error: ordersError } = await supabase
              .from("orders")
              .select("*")
              .in("dealer_id", dealerKeys)
              .order("created_at", { ascending: false });

            if (!ordersError && ordersData) {
              // Map orders from database to Order interface (simplified for now)
              const mappedOrders: Order[] = ordersData.map((o: any) => ({
                id: o.id,
                orderNumber: o.order_number,
                dealerId: o.dealer_id,
                orderType: o.order_type as OrderType,
                status: o.status as OrderStatus,
                submittedAt: o.created_at,
                approvedAt: o.approved_at,
                totalAmount: parseFloat(o.total_amount),
                lines: [], // Will fetch separately if needed
                shipments: [], // Will fetch separately if needed
                invoices: [], // Will fetch separately if needed
              }));

              setOrders(mappedOrders);
            }

            // Fetch inquiries for this dealer
            const { data: inquiriesData } = await supabase
              .from("inquiries")
              .select("*")
              .eq("dealer_id", dealerData.id)
              .order("created_at", { ascending: false });

            if (inquiriesData) {
              const mappedInquiries: Inquiry[] = inquiriesData.map((i: any) => ({
                id: i.id,
                dealerId: i.dealer_id,
                partNumber: i.part_number,
                quantity: i.quantity,
                inquiryType: i.inquiry_type as "search" | "order_attempt",
                createdAt: i.created_at,
              }));

              setInquiries(mappedInquiries);
            }
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading dealer data:", error);
        setLoading(false);
      }
    };

    loadDealerData();
  }, []);

  const addToCart = useCallback((line: CartLine) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.partNumber === line.partNumber);
      if (existing) {
        return prev.map((l) =>
          l.partNumber === line.partNumber
            ? { ...l, quantity: l.quantity + line.quantity }
            : l
        );
      }
      return [...prev, line];
    });
  }, []);

  const updateCart = useCallback((partNumber: string, quantity: number) => {
    setCart((prev) =>
      prev.map((l) => (l.partNumber === partNumber ? { ...l, quantity } : l))
    );
  }, []);

  const removeFromCart = useCallback((partNumber: string) => {
    setCart((prev) => prev.filter((l) => l.partNumber !== partNumber));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const submitOrder = useCallback(() => {
    if (!dealer) throw new Error("Dealer not loaded");
    const totalAmount = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const newOrder: Order = {
      id: `o${Date.now()}`,
      orderNumber: `ORD-2026-${String(orders.length + 200).padStart(4, "0")}`,
      dealerId: dealer!.id,
      orderType: cartType,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      totalAmount,
      lines: cart.map((l) => ({
        partNumber: l.partNumber,
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineStatus: "confirmed" as OrderLineStatus,
      })),
      shipments: [],
      invoices: [],
    };
    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    return newOrder;
  }, [cart, cartType, dealer, orders.length]);

  const approveOrder = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: "approved" as OrderStatus, approvedAt: new Date().toISOString() }
          : o
      )
    );
  }, []);

  const rejectOrder = useCallback((_orderId: string, _reason: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === _orderId ? { ...o, status: "rejected" as OrderStatus } : o
      )
    );
  }, []);

  const recordInquiry = useCallback(
    (inquiry: Omit<Inquiry, "id" | "createdAt">) => {
      setInquiries((prev) => [
        {
          ...inquiry,
          id: `inq${Date.now()}`,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    []
  );

  const stats: PortalStats = useMemo(() => {
    if (!dealer) {
      return {
        totalOrders: 0,
        pendingOrders: 0,
        creditLimit: 0,
        creditUsed: 0,
        availableCredit: 0,
        overdueBalance: 0,
        targetPercent: 0,
        monthlyRevenue: 0,
      };
    }

    const nonRejected = orders.filter((o) => o.status !== "rejected");
    const used = nonRejected.reduce((s, o) => s + o.totalAmount, 0);

    // Month-to-date achieved revenue (real). There is no dealer_targets source
    // yet, so targetPercent stays 0 — the dashboard renders MTD revenue without
    // a target percentage rather than a fabricated figure.
    const now = new Date();
    const monthlyRevenue = nonRejected
      .filter((o) => {
        const d = new Date(o.submittedAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, o) => s + o.totalAmount, 0);

    return {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === "submitted" || o.status === "under_review").length,
      creditLimit: dealer.creditLimit,
      creditUsed: used,
      availableCredit: dealer.creditLimit - used,
      overdueBalance: dealer.overdueBalance ?? 0,
      targetPercent: 0,
      monthlyRevenue,
    };
  }, [orders, dealer]);

  // Provide fallback dealer during loading
  const contextDealer = dealer || dealers[0];

  const value = useMemo(
    () => ({
      role,
      setRole,
      dealer: contextDealer,
      currentDealer: contextDealer,
      setCurrentDealer: setDealer,
      dealers,
      stats,
      orders,
      inquiries,
      cart,
      cartType,
      setCartType,
      addToCart,
      updateCart,
      removeFromCart,
      clearCart,
      submitOrder,
      approveOrder,
      rejectOrder,
      recordInquiry,
    }),
    [
      role,
      contextDealer,
      stats,
      orders,
      inquiries,
      cart,
      cartType,
      addToCart,
      updateCart,
      removeFromCart,
      clearCart,
      submitOrder,
      approveOrder,
      rejectOrder,
      recordInquiry,
    ]
  );

  return (
    <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
  );
}

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) {
    throw new Error("usePortal must be used within a PortalProvider");
  }
  return ctx;
}
