import brakeImg from "@/assets/part-brake.jpg";
import filterImg from "@/assets/part-filter.jpg";
import sparkImg from "@/assets/part-sparkplug.jpg";
import wheelImg from "@/assets/part-wheel.jpg";
import batteryImg from "@/assets/part-battery.jpg";
import headlightImg from "@/assets/part-headlight.jpg";
import oilImg from "@/assets/part-oil.jpg";
import shockImg from "@/assets/part-shock.jpg";

export type Category = {
  slug: string;
  name: string;
  description: string;
  image: string;
  count: number;
};

export type Part = {
  sku: string;
  name: string;
  category: string;
  categorySlug: string;
  price: number;
  oem: string;
  fits: string[];
  image: string;
  inStock: boolean;
  shipsIn: string;
  description: string;
  specs: { label: string; value: string }[];
};

export const categories: Category[] = [
  { slug: "brakes", name: "Brakes", description: "Discs, pads, calipers and brake fluid for every model.", image: brakeImg, count: 184 },
  { slug: "filters", name: "Filters", description: "Air, oil, fuel and cabin filtration for clean performance.", image: filterImg, count: 96 },
  { slug: "ignition", name: "Ignition", description: "Spark plugs, coils, and ignition modules.", image: sparkImg, count: 58 },
  { slug: "wheels", name: "Wheels & Tyres", description: "Genuine alloy wheels and approved tyre fitments.", image: wheelImg, count: 72 },
  { slug: "battery", name: "Battery & Electrics", description: "Starter batteries, alternators, sensors.", image: batteryImg, count: 110 },
  { slug: "lighting", name: "Lighting", description: "LED headlights, tail lamps, indicators.", image: headlightImg, count: 64 },
  { slug: "fluids", name: "Fluids & Oils", description: "Engine oils, coolants, transmission fluids.", image: oilImg, count: 48 },
  { slug: "suspension", name: "Suspension", description: "Shock absorbers, springs, control arms.", image: shockImg, count: 88 },
];

const COMMON_FITS = ["Peugeot 208 (2019+)", "Peugeot 2008 (2020+)", "Peugeot 3008 (2017+)", "Peugeot 308 (2021+)", "Peugeot 508 (2018+)"];

export const parts: Part[] = [
  {
    sku: "PG-BR-4248K9",
    name: "Front Brake Disc Set — Ventilated 283mm",
    category: "Brakes",
    categorySlug: "brakes",
    price: 142.00,
    oem: "424891 / 4249.K9",
    fits: ["Peugeot 308 (2021+)", "Peugeot 3008 (2017+)", "Peugeot 508 (2018+)"],
    image: brakeImg,
    inStock: true,
    shipsIn: "Ships in 24h",
    description: "Genuine Peugeot ventilated front brake discs engineered to OEM tolerances. Sold as a matched pair, ready for direct fitment.",
    specs: [
      { label: "Diameter", value: "283 mm" },
      { label: "Thickness", value: "26 mm" },
      { label: "Bolt Pattern", value: "5 × 108" },
      { label: "Sold As", value: "Pair (2 discs)" },
      { label: "Warranty", value: "2 Years" },
    ],
  },
  {
    sku: "PG-FL-1444TT",
    name: "Engine Air Filter — Premium",
    category: "Filters",
    categorySlug: "filters",
    price: 24.50,
    oem: "1444.TT",
    fits: COMMON_FITS,
    image: filterImg,
    inStock: true,
    shipsIn: "Ships in 24h",
    description: "High-flow paper element with reinforced gasket. Maintains airflow and protects intake from contaminants.",
    specs: [
      { label: "Type", value: "Panel Filter" },
      { label: "Material", value: "Cellulose / Synthetic" },
      { label: "Service Interval", value: "20,000 km" },
      { label: "Warranty", value: "1 Year" },
    ],
  },
  {
    sku: "PG-IG-5960L1",
    name: "Iridium Spark Plug Set (×4)",
    category: "Ignition",
    categorySlug: "ignition",
    price: 58.00,
    oem: "5960.L1",
    fits: ["Peugeot 208 (2019+)", "Peugeot 2008 (2020+)", "Peugeot 308 (2021+)"],
    image: sparkImg,
    inStock: true,
    shipsIn: "Ships in 24h",
    description: "Iridium-tipped spark plugs deliver longer life and consistent ignition for PureTech engines.",
    specs: [
      { label: "Tip", value: "Iridium" },
      { label: "Gap", value: "0.8 mm" },
      { label: "Quantity", value: "4 units" },
      { label: "Service Interval", value: "60,000 km" },
    ],
  },
  {
    sku: "PG-WH-17BLK",
    name: 'Alloy Wheel "Sirius" 17" — Diamond Cut',
    category: "Wheels & Tyres",
    categorySlug: "wheels",
    price: 389.00,
    oem: "98 261 729 80",
    fits: ["Peugeot 308 (2021+)", "Peugeot 3008 (2017+)"],
    image: wheelImg,
    inStock: true,
    shipsIn: "Ships in 3–5 days",
    description: "Genuine 17-inch diamond-cut alloy with anthracite finish. Sold individually, balanced and ready to fit.",
    specs: [
      { label: "Size", value: '17" × 7.5J' },
      { label: "Offset (ET)", value: "44" },
      { label: "Bolt Pattern", value: "5 × 108" },
      { label: "Finish", value: "Diamond Cut / Anthracite" },
    ],
  },
  {
    sku: "PG-EL-BTRY70",
    name: "Starter Battery 70Ah AGM",
    category: "Battery & Electrics",
    categorySlug: "battery",
    price: 189.00,
    oem: "98 027 595 80",
    fits: COMMON_FITS,
    image: batteryImg,
    inStock: true,
    shipsIn: "Ships in 24h",
    description: "Maintenance-free AGM battery designed for vehicles with stop-and-start technology.",
    specs: [
      { label: "Capacity", value: "70 Ah" },
      { label: "Cold Crank", value: "760 A" },
      { label: "Technology", value: "AGM" },
      { label: "Warranty", value: "3 Years" },
    ],
  },
  {
    sku: "PG-LT-LEDFR",
    name: "Full LED Headlight — Right",
    category: "Lighting",
    categorySlug: "lighting",
    price: 612.00,
    oem: "98 372 615 80",
    fits: ["Peugeot 3008 (2017+)", "Peugeot 5008 (2017+)"],
    image: headlightImg,
    inStock: false,
    shipsIn: "Ships in 7–10 days",
    description: "Genuine matrix LED headlight assembly with adaptive beam pattern and integrated daytime running light.",
    specs: [
      { label: "Side", value: "Right (Driver Side EU)" },
      { label: "Technology", value: "Matrix LED" },
      { label: "Connector", value: "OEM Plug & Play" },
      { label: "Warranty", value: "2 Years" },
    ],
  },
  {
    sku: "PG-FL-OIL5W30",
    name: "Premium Synthetic Engine Oil 5W-30 — 5L",
    category: "Fluids & Oils",
    categorySlug: "fluids",
    price: 64.00,
    oem: "9979.A3",
    fits: COMMON_FITS,
    image: oilImg,
    inStock: true,
    shipsIn: "Ships in 24h",
    description: "Approved fully synthetic engine oil for Peugeot PureTech and BlueHDi engines.",
    specs: [
      { label: "Grade", value: "5W-30" },
      { label: "Volume", value: "5 Litres" },
      { label: "Specification", value: "ACEA C2" },
      { label: "Approval", value: "PSA B71 2312" },
    ],
  },
  {
    sku: "PG-SP-SH9001",
    name: "Front Shock Absorber — Gas",
    category: "Suspension",
    categorySlug: "suspension",
    price: 124.00,
    oem: "5208.E5",
    fits: ["Peugeot 208 (2019+)", "Peugeot 2008 (2020+)"],
    image: shockImg,
    inStock: true,
    shipsIn: "Ships in 24h",
    description: "Gas-pressurised shock absorber engineered to factory ride characteristics. Sold individually.",
    specs: [
      { label: "Type", value: "Twin-Tube Gas" },
      { label: "Position", value: "Front (Left or Right)" },
      { label: "Sold As", value: "Single Unit" },
      { label: "Warranty", value: "2 Years" },
    ],
  },
];

export const featured = parts.slice(0, 4);

export const getPart = (sku: string) => parts.find((p) => p.sku === sku);
export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
export const partsByCategory = (slug: string) => parts.filter((p) => p.categorySlug === slug);

export const peugeotModels = [
  "Peugeot 208", "Peugeot 2008", "Peugeot 308", "Peugeot 3008", "Peugeot 508", "Peugeot 5008", "Peugeot Partner", "Peugeot Expert", "Peugeot e-208", "Peugeot e-2008",
];
