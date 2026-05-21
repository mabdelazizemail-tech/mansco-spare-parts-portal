// ── Types ──

export type Availability =
  | "available"
  | "partial"
  | "partially_available"
  | "unavailable_eta"
  | "unavailable";

export type AvailabilityStatus = Availability;

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

export type DetailedOrderStatus = OrderStatus;

export type FinancialStatus =
  | "active"
  | "blocked"
  | "warning"
  | "green"
  | "yellow"
  | "red";

export interface Dealer {
  id: string;
  name: string;
  nameAr: string;
  branch: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stockVisibility?: any;
  discountEligible?: boolean;
  notes?: string;
  creditLimit: number;
  overdueBalance: number;
  financialStatus: FinancialStatus;
  targetAchievement: number;
}

export interface Part {
  id: string;
  partNumber: string;
  name: string;
  nameAr: string;
  category: string;
  categoryAr: string;
  model: string;
  price: number;
  stock: number;
  stockCount?: number;
  availability: Availability;
  eta: string | null;
  image: string;
  isCampaign?: boolean;
  campaignDiscount?: number;
}

export interface OrderItem {
  partId: string;
  partNumber: string;
  name: string;
  partName?: string;
  qty: number;
  quantity?: number;
  unitPrice: number;
  totalPrice?: number;
  availability?: Availability | "in_stock" | "backorder";
}

export interface BackorderItem {
  partId: string;
  partNumber: string;
  name: string;
  partName?: string;
  qty: number;
  quantity?: number;
  eta?: string;
  updatedEta?: string;
}

export interface TimelineEvent {
  event: string;
  date: string;
  status?: string;
  description?: string;
  note?: string;
}

export interface Order {
  id: string;
  dealerId: string;
  orderType: OrderType;
  type?: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  amount?: number;
  itemCount?: number;
  createdAt: string;
  date?: string;
  invoiceNumber: string | null;
  trackingNumber: string | null;
  carrier?: string;
  awb?: string;
  backorderItems?: BackorderItem[];
  timeline?: TimelineEvent[];
}

export interface Campaign {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  discountPercent: number;
  discount?: number;
  validUntil: string;
  image: string;
  gradient?: string;
}

export interface DashboardStats {
  totalOrders: number;
  totalOrdersTrend: number;
  pendingOrders: number;
  pendingOrdersTrend: number;
  monthlyRevenue: number;
  monthlyRevenueTrend: number;
  backOrders: number;
  backOrdersTrend: number;
  targetPercent: number;
  targetAchievement?: number;
  creditUtilization: number;
  creditLimit: number;
  creditUsed: number;
  overdueBalance: number;
  availableCredit: number;
  financialStatus: FinancialStatus;
}

export interface Inquiry {
  id: string;
  dealerId: string;
  partNumber: string;
  message: string;
  createdAt: string;
  status: "open" | "replied" | "closed";
}

export interface LostSale {
  id: string;
  dealerId: string;
  partNumber: string;
  customerName: string;
  reason: string;
  estimatedValue: number;
  createdAt: string;
}

export interface TargetData {
  currentMonthTarget: number;
  currentMonthActual: number;
  ytdTarget: number;
  ytdActual: number;
  byType: { name: string; target: number; actual: number }[];
}

// ── Data ──

export const dealers: Dealer[] = [
  {
    id: "dlr-001",
    name: "Cairo Motors",
    nameAr: "كايرو موتورز",
    branch: "Nasr City",
    creditLimit: 5000000,
    overdueBalance: 180000,
    financialStatus: "active",
    targetAchievement: 78,
  },
  {
    id: "dlr-002",
    name: "Delta Auto Parts",
    nameAr: "دلتا لقطع الغيار",
    branch: "Mansoura",
    creditLimit: 3000000,
    overdueBalance: 450000,
    financialStatus: "warning",
    targetAchievement: 62,
  },
  {
    id: "dlr-003",
    name: "Alexandria Spare Parts",
    nameAr: "الإسكندرية لقطع الغيار",
    branch: "Smouha",
    creditLimit: 4000000,
    overdueBalance: 0,
    financialStatus: "active",
    targetAchievement: 91,
  },
  {
    id: "dlr-004",
    name: "Upper Egypt Motors",
    nameAr: "صعيد مصر للسيارات",
    branch: "Assiut",
    creditLimit: 2000000,
    overdueBalance: 820000,
    financialStatus: "blocked",
    targetAchievement: 35,
  },
  {
    id: "dlr-005",
    name: "Red Sea Auto",
    nameAr: "البحر الأحمر للسيارات",
    branch: "Hurghada",
    creditLimit: 1500000,
    overdueBalance: 50000,
    financialStatus: "active",
    targetAchievement: 88,
  },
];

export const parts: Part[] = [
  {
    id: "p-001",
    partNumber: "1607328280",
    name: "Front Brake Pad Set",
    nameAr: "طقم تيل فرامل أمامي",
    category: "Brakes",
    categoryAr: "فرامل",
    model: "Peugeot 301",
    price: 1850,
    stock: 45,
    availability: "available",
    eta: null,
    image: "/parts/brake-pad.png",
  },
  {
    id: "p-002",
    partNumber: "1109CK",
    name: "Oil Filter",
    nameAr: "فلتر زيت",
    category: "Filters",
    categoryAr: "فلاتر",
    model: "Peugeot 2008",
    price: 320,
    stock: 120,
    availability: "available",
    eta: null,
    image: "/parts/oil-filter.png",
  },
  {
    id: "p-003",
    partNumber: "9806727880",
    name: "Air Filter Element",
    nameAr: "فلتر هواء",
    category: "Filters",
    categoryAr: "فلاتر",
    model: "Peugeot 3008",
    price: 450,
    stock: 67,
    availability: "available",
    eta: null,
    image: "/parts/air-filter.png",
  },
  {
    id: "p-004",
    partNumber: "1623775080",
    name: "Spark Plug Set (4pcs)",
    nameAr: "طقم بوجيهات (4 قطع)",
    category: "Engine",
    categoryAr: "محرك",
    model: "Peugeot 508",
    price: 960,
    stock: 30,
    availability: "available",
    eta: null,
    image: "/parts/spark-plug.png",
  },
  {
    id: "p-005",
    partNumber: "5271CC",
    name: "Rear Shock Absorber",
    nameAr: "مساعد خلفي",
    category: "Suspension",
    categoryAr: "تعليق",
    model: "Peugeot 301",
    price: 2400,
    stock: 8,
    availability: "partial",
    eta: null,
    image: "/parts/shock-absorber.png",
  },
  {
    id: "p-006",
    partNumber: "1611300280",
    name: "Timing Belt Kit",
    nameAr: "طقم سير كاتينة",
    category: "Engine",
    categoryAr: "محرك",
    model: "Peugeot 2008",
    price: 4200,
    stock: 0,
    availability: "unavailable_eta",
    eta: "2026-06-05",
    image: "/parts/timing-belt.png",
  },
  {
    id: "p-007",
    partNumber: "6341T1",
    name: "Right Headlight Assembly",
    nameAr: "كشاف أمامي يمين",
    category: "Lighting",
    categoryAr: "إضاءة",
    model: "Peugeot 3008",
    price: 8500,
    stock: 3,
    availability: "partial",
    eta: null,
    image: "/parts/headlight.png",
  },
  {
    id: "p-008",
    partNumber: "9818232480",
    name: "Cabin Air Filter",
    nameAr: "فلتر مكيف",
    category: "Filters",
    categoryAr: "فلاتر",
    model: "Peugeot 5008",
    price: 380,
    stock: 95,
    availability: "available",
    eta: null,
    image: "/parts/cabin-filter.png",
  },
  {
    id: "p-009",
    partNumber: "3648A1",
    name: "Clutch Kit Complete",
    nameAr: "طقم دبرياج كامل",
    category: "Transmission",
    categoryAr: "ناقل الحركة",
    model: "Peugeot 301",
    price: 6800,
    stock: 0,
    availability: "unavailable",
    eta: null,
    image: "/parts/clutch-kit.png",
  },
  {
    id: "p-010",
    partNumber: "1637756080",
    name: "Water Pump",
    nameAr: "طلمبة مياه",
    category: "Engine",
    categoryAr: "محرك",
    model: "Peugeot 508",
    price: 3200,
    stock: 12,
    availability: "available",
    eta: null,
    image: "/parts/water-pump.png",
  },
  {
    id: "p-011",
    partNumber: "4007VY",
    name: "Front Stabilizer Link",
    nameAr: "وصلة مقصات أمامية",
    category: "Suspension",
    categoryAr: "تعليق",
    model: "Peugeot 2008",
    price: 750,
    stock: 22,
    availability: "available",
    eta: null,
    image: "/parts/stabilizer-link.png",
  },
  {
    id: "p-012",
    partNumber: "1614157280",
    name: "Battery 12V 60Ah",
    nameAr: "بطارية 12 فولت 60 أمبير",
    category: "Electrical",
    categoryAr: "كهرباء",
    model: "Peugeot 301",
    price: 3800,
    stock: 18,
    availability: "available",
    eta: null,
    image: "/parts/battery.png",
  },
  {
    id: "p-013",
    partNumber: "9816164280",
    name: "Side Mirror Glass Left",
    nameAr: "زجاج مرآة جانبية يسار",
    category: "Body",
    categoryAr: "هيكل",
    model: "Peugeot 3008",
    price: 1200,
    stock: 5,
    availability: "partial",
    eta: null,
    image: "/parts/mirror-glass.png",
  },
  {
    id: "p-014",
    partNumber: "8235GE",
    name: "Wiper Blade Set Front",
    nameAr: "طقم مساحات أمامية",
    category: "Body",
    categoryAr: "هيكل",
    model: "Peugeot 5008",
    price: 650,
    stock: 40,
    availability: "available",
    eta: null,
    image: "/parts/wiper-blade.png",
  },
  {
    id: "p-015",
    partNumber: "1007802380",
    name: "Radiator Assembly",
    nameAr: "رداتير كامل",
    category: "Engine",
    categoryAr: "محرك",
    model: "Peugeot 2008",
    price: 5600,
    stock: 0,
    availability: "unavailable_eta",
    eta: "2026-06-20",
    image: "/parts/radiator.png",
  },
  {
    id: "p-016",
    partNumber: "4545E2",
    name: "Steering Rack End",
    nameAr: "طرف مقص توجيه",
    category: "Steering",
    categoryAr: "توجيه",
    model: "Peugeot 508",
    price: 1100,
    stock: 14,
    availability: "available",
    eta: null,
    image: "/parts/rack-end.png",
  },
];

export const orders: Order[] = [
  {
    id: "ORD-2026-1284",
    dealerId: "dlr-001",
    orderType: "daily",
    status: "submitted",
    items: [
      { partId: "p-001", partNumber: "1607328280", name: "Front Brake Pad Set", qty: 10, unitPrice: 1850 },
      { partId: "p-002", partNumber: "1109CK", name: "Oil Filter", qty: 20, unitPrice: 320 },
    ],
    totalAmount: 24900,
    createdAt: "2026-05-17T09:30:00Z",
    invoiceNumber: null,
    trackingNumber: null,
  },
  {
    id: "ORD-2026-1283",
    dealerId: "dlr-001",
    orderType: "air_dhl",
    status: "approved",
    items: [
      { partId: "p-006", partNumber: "1611300280", name: "Timing Belt Kit", qty: 3, unitPrice: 4200 },
    ],
    totalAmount: 12600,
    createdAt: "2026-05-16T14:15:00Z",
    invoiceNumber: "INV-2026-0891",
    trackingNumber: null,
  },
  {
    id: "ORD-2026-1282",
    dealerId: "dlr-002",
    orderType: "stock",
    status: "under_review",
    items: [
      { partId: "p-010", partNumber: "1637756080", name: "Water Pump", qty: 5, unitPrice: 3200 },
      { partId: "p-004", partNumber: "1623775080", name: "Spark Plug Set (4pcs)", qty: 15, unitPrice: 960 },
      { partId: "p-008", partNumber: "9818232480", name: "Cabin Air Filter", qty: 25, unitPrice: 380 },
    ],
    totalAmount: 39900,
    createdAt: "2026-05-15T11:00:00Z",
    invoiceNumber: null,
    trackingNumber: null,
  },
  {
    id: "ORD-2026-1281",
    dealerId: "dlr-003",
    orderType: "daily",
    status: "partial",
    items: [
      { partId: "p-005", partNumber: "5271CC", name: "Rear Shock Absorber", qty: 8, unitPrice: 2400 },
    ],
    totalAmount: 19200,
    createdAt: "2026-05-14T08:45:00Z",
    invoiceNumber: "INV-2026-0889",
    trackingNumber: null,
  },
  {
    id: "ORD-2026-1280",
    dealerId: "dlr-001",
    orderType: "air_dhl",
    status: "rejected",
    items: [
      { partId: "p-009", partNumber: "3648A1", name: "Clutch Kit Complete", qty: 2, unitPrice: 6800 },
    ],
    totalAmount: 13600,
    createdAt: "2026-05-13T16:20:00Z",
    invoiceNumber: null,
    trackingNumber: null,
  },
  {
    id: "ORD-2026-1279",
    dealerId: "dlr-004",
    orderType: "daily",
    status: "invoiced",
    items: [
      { partId: "p-012", partNumber: "1614157280", name: "Battery 12V 60Ah", qty: 4, unitPrice: 3800 },
      { partId: "p-014", partNumber: "8235GE", name: "Wiper Blade Set Front", qty: 10, unitPrice: 650 },
    ],
    totalAmount: 21700,
    createdAt: "2026-05-12T10:00:00Z",
    invoiceNumber: "INV-2026-0887",
    trackingNumber: null,
  },
  {
    id: "ORD-2026-1278",
    dealerId: "dlr-005",
    orderType: "stock",
    status: "shipped",
    items: [
      { partId: "p-003", partNumber: "9806727880", name: "Air Filter Element", qty: 30, unitPrice: 450 },
      { partId: "p-011", partNumber: "4007VY", name: "Front Stabilizer Link", qty: 10, unitPrice: 750 },
    ],
    totalAmount: 21000,
    createdAt: "2026-05-11T13:30:00Z",
    invoiceNumber: "INV-2026-0885",
    trackingNumber: "DHL-EG-784521369",
  },
  {
    id: "ORD-2026-1277",
    dealerId: "dlr-002",
    orderType: "daily",
    status: "delivered",
    items: [
      { partId: "p-001", partNumber: "1607328280", name: "Front Brake Pad Set", qty: 6, unitPrice: 1850 },
    ],
    totalAmount: 11100,
    createdAt: "2026-05-10T09:15:00Z",
    invoiceNumber: "INV-2026-0883",
    trackingNumber: "DHL-EG-784521350",
  },
  {
    id: "ORD-2026-1276",
    dealerId: "dlr-003",
    orderType: "air_dhl",
    status: "done",
    items: [
      { partId: "p-007", partNumber: "6341T1", name: "Right Headlight Assembly", qty: 1, unitPrice: 8500 },
      { partId: "p-016", partNumber: "4545E2", name: "Steering Rack End", qty: 4, unitPrice: 1100 },
    ],
    totalAmount: 12900,
    createdAt: "2026-05-09T15:45:00Z",
    invoiceNumber: "INV-2026-0880",
    trackingNumber: "DHL-EG-784521340",
  },
  {
    id: "ORD-2026-1275",
    dealerId: "dlr-001",
    orderType: "stock",
    status: "backordered",
    items: [
      { partId: "p-015", partNumber: "1007802380", name: "Radiator Assembly", qty: 3, unitPrice: 5600 },
      { partId: "p-013", partNumber: "9816164280", name: "Side Mirror Glass Left", qty: 5, unitPrice: 1200 },
    ],
    totalAmount: 22800,
    createdAt: "2026-05-08T11:20:00Z",
    invoiceNumber: null,
    trackingNumber: null,
  },
  {
    id: "ORD-2026-1274",
    dealerId: "dlr-005",
    orderType: "daily",
    status: "approved",
    items: [
      { partId: "p-002", partNumber: "1109CK", name: "Oil Filter", qty: 50, unitPrice: 320 },
      { partId: "p-008", partNumber: "9818232480", name: "Cabin Air Filter", qty: 30, unitPrice: 380 },
    ],
    totalAmount: 27400,
    createdAt: "2026-05-07T08:00:00Z",
    invoiceNumber: "INV-2026-0878",
    trackingNumber: null,
  },
];

export const campaigns: Campaign[] = [
  {
    id: "camp-001",
    title: "Summer Brake Pads Special",
    titleAr: "عرض تيل الفرامل الصيفي",
    description: "Get 25% off all brake pads and discs for Peugeot 301 and 2008 models.",
    descriptionAr: "احصل على خصم 25% على جميع تيل وأقراص الفرامل لموديلات بيجو 301 و2008.",
    discountPercent: 25,
    validUntil: "2026-06-30",
    image: "/campaigns/brake-promo.png",
  },
  {
    id: "camp-002",
    title: "Oil Filter Bundle Deal",
    titleAr: "عرض حزمة فلاتر الزيت",
    description: "Buy 20 oil filters, get 3 free. Available for all Peugeot models.",
    descriptionAr: "اشترِ 20 فلتر زيت واحصل على 3 مجاناً. متاح لجميع موديلات بيجو.",
    discountPercent: 15,
    validUntil: "2026-07-15",
    image: "/campaigns/filter-promo.png",
  },
  {
    id: "camp-003",
    title: "Suspension Parts Promo",
    titleAr: "عرض قطع التعليق",
    description: "20% discount on shock absorbers and stabilizer links.",
    descriptionAr: "خصم 20% على المساعدات ووصلات المقصات.",
    discountPercent: 20,
    validUntil: "2026-06-15",
    image: "/campaigns/suspension-promo.png",
  },
  {
    id: "camp-004",
    title: "Battery Clearance Sale",
    titleAr: "تخفيضات البطاريات",
    description: "Up to 30% off on all batteries. Limited stock available.",
    descriptionAr: "خصم يصل إلى 30% على جميع البطاريات. الكمية محدودة.",
    discountPercent: 30,
    validUntil: "2026-05-31",
    image: "/campaigns/battery-promo.png",
  },
];

export const dashboardStats: DashboardStats = {
  totalOrders: 1284,
  totalOrdersTrend: 12.5,
  pendingOrders: 23,
  pendingOrdersTrend: -4.2,
  monthlyRevenue: 2450000,
  monthlyRevenueTrend: 8.3,
  backOrders: 7,
  backOrdersTrend: 2.1,
  targetPercent: 78,
  creditUtilization: 65,
  creditLimit: 5000000,
  creditUsed: 3250000,
  overdueBalance: 180000,
  availableCredit: 1750000,
  financialStatus: "active",
};

export const targetData: TargetData = {
  currentMonthTarget: 3000000,
  currentMonthActual: 2450000,
  ytdTarget: 15000000,
  ytdActual: 12800000,
  byType: [
    { name: "Daily", target: 1500000, actual: 1250000 },
    { name: "Air-DHL", target: 800000, actual: 650000 },
    { name: "Stock", target: 700000, actual: 550000 },
  ],
};

export const inquiries: Inquiry[] = [
  {
    id: "inq-001",
    dealerId: "dlr-001",
    partNumber: "1611300280",
    message: "When will the timing belt kit be back in stock?",
    createdAt: "2026-05-16T10:00:00Z",
    status: "open",
  },
  {
    id: "inq-002",
    dealerId: "dlr-003",
    partNumber: "3648A1",
    message: "Can you provide ETA for clutch kit? Customer is waiting.",
    createdAt: "2026-05-15T14:30:00Z",
    status: "replied",
  },
  {
    id: "inq-003",
    dealerId: "dlr-002",
    partNumber: "6341T1",
    message: "Need left headlight assembly for 3008. Is it available?",
    createdAt: "2026-05-14T09:00:00Z",
    status: "closed",
  },
];

export const lostSales: LostSale[] = [
  {
    id: "ls-001",
    dealerId: "dlr-001",
    partNumber: "3648A1",
    customerName: "Ahmed Hassan",
    reason: "Part unavailable, customer went to aftermarket",
    estimatedValue: 6800,
    createdAt: "2026-05-16T11:00:00Z",
  },
  {
    id: "ls-002",
    dealerId: "dlr-004",
    partNumber: "1007802380",
    customerName: "Mohamed Ali",
    reason: "Long ETA, customer could not wait",
    estimatedValue: 5600,
    createdAt: "2026-05-15T16:00:00Z",
  },
  {
    id: "ls-003",
    dealerId: "dlr-002",
    partNumber: "1611300280",
    customerName: "Fatma Ibrahim",
    reason: "Price too high compared to aftermarket alternative",
    estimatedValue: 4200,
    createdAt: "2026-05-13T10:30:00Z",
  },
];

// ── Admin-specific data & helpers ──

export type ItemAvailability =
  | Availability
  | "in_stock"
  | "backorder";

export interface AdminOrderItem {
  id: string;
  partNumber: string;
  name: string;
  partName?: string;
  qty: number;
  quantity?: number;
  unitPrice: number;
  total: number;
  availability?: ItemAvailability;
}

export interface AdminOrder {
  id: string;
  dealerId: string;
  dealerName: string;
  orderType: OrderType;
  type: OrderType;
  status: OrderStatus;
  items: AdminOrderItem[];
  itemCount: number;
  totalAmount: number;
  createdAt: string;
}

const dealerNameById = (id: string) =>
  dealers.find((d) => d.id === id)?.name ?? "Unknown Dealer";

export const adminOrders: AdminOrder[] = orders.map((o) => ({
  id: o.id,
  dealerId: o.dealerId,
  dealerName: dealerNameById(o.dealerId),
  orderType: o.orderType,
  type: o.orderType,
  status: o.status,
  items: o.items.map((item, idx) => ({
    id: `${o.id}-item-${idx}`,
    partNumber: item.partNumber,
    name: item.name,
    partName: item.name,
    qty: item.qty,
    quantity: item.qty,
    unitPrice: item.unitPrice,
    total: item.qty * item.unitPrice,
    availability: "available" as Availability,
  })),
  itemCount: o.items.length,
  totalAmount: o.totalAmount,
  createdAt: o.createdAt,
}));

// Detailed orders alias used by some pages
export const detailedOrders = orders.map((o) => ({
  ...o,
  type: o.orderType,
  date: o.createdAt,
  amount: o.totalAmount,
  itemCount: o.items.length,
}));

// Patch convenience fields on the base Order array
orders.forEach((o) => {
  o.type = o.orderType;
  o.date = o.createdAt;
  o.amount = o.totalAmount;
  o.itemCount = o.items.length;
});

// Ensure stockCount on every Part (mock-data may set only `stock`)
parts.forEach((p) => {
  if (p.stockCount === undefined) (p as Part).stockCount = p.stock;
});

// Patch DashboardStats
if (dashboardStats.targetAchievement === undefined) {
  dashboardStats.targetAchievement = dashboardStats.targetPercent;
}

// Patch Campaign convenience fields
campaigns.forEach((c) => {
  if (c.discount === undefined) c.discount = c.discountPercent;
  if (c.gradient === undefined) {
    c.gradient = "from-[#00A3E0] to-[#000000]";
  }
});

export interface AdminDashboardStats {
  totalDealers: number;
  pendingApprovals: number;
  todaysOrders: number;
  monthlyRevenue: number;
  activeCampaigns: number;
  avgTargetAchievement: number;
}

export const adminDashboardStats: AdminDashboardStats = {
  totalDealers: dealers.length,
  pendingApprovals: adminOrders.filter((o) => o.status === "under_review").length,
  todaysOrders: 18,
  monthlyRevenue: 4_280_000,
  activeCampaigns: campaigns.length,
  avgTargetAchievement: 76,
};

export function formatCurrency(value: number, locale: string = "en-EG"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(value);
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "#3B82F6",
  under_review: "#F59E0B",
  approved: "#10B981",
  rejected: "#EF4444",
  done: "#22C55E",
  partial: "#F59E0B",
  backordered: "#8B5CF6",
  invoiced: "#06B6D4",
  shipped: "#00A3E0",
  delivered: "#16A34A",
};

export function getOrdersByStatus(): { name: string; value: number; color: string }[] {
  const counts: Record<string, number> = {};
  for (const o of adminOrders) {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  }
  return Object.entries(counts).map(([status, value]) => ({
    name: status.replace(/_/g, " "),
    value,
    color: STATUS_COLORS[status] ?? "#6B6B6B",
  }));
}

export function getRevenueByType(): { type: string; revenue: number }[] {
  const totals: Record<string, number> = { daily: 0, air_dhl: 0, stock: 0 };
  for (const o of adminOrders) {
    totals[o.orderType] = (totals[o.orderType] ?? 0) + o.totalAmount;
  }
  return [
    { type: "Daily", revenue: totals.daily },
    { type: "Air/DHL", revenue: totals.air_dhl },
    { type: "Stock", revenue: totals.stock },
  ];
}

export function generateOrdersTrend(): { date: string; orders: number; revenue: number }[] {
  const days = 30;
  const out: { date: string; orders: number; revenue: number }[] = [];
  const seed = 13;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const base = 8 + Math.round(Math.sin((i + seed) / 3) * 5 + (i % 7));
    const orders = Math.max(2, base);
    out.push({
      date: dateStr,
      orders,
      revenue: orders * (40_000 + ((i * 1300) % 25_000)),
    });
  }
  return out;
}

export const partCategories = [...new Set(parts.map((p) => p.category))];
export const partModels = [...new Set(parts.map((p) => p.model))];

