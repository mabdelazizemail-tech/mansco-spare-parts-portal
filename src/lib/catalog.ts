/* ─── Parts Catalog Data ─────────────────────────────────── */

export interface CatalogPart {
  partNumber: string;
  name: string;
  nameAr: string;
  category: string;
  categoryAr: string;
  model: string;
  image: string;
  weight?: string;
  oem?: string;
}

export const categories = [
  { id: "brakes", en: "Brakes & Suspension", ar: "الفرامل والتعليق" },
  { id: "engine", en: "Engine & Drivetrain", ar: "المحرك ونقل الحركة" },
  { id: "electrical", en: "Electrical & Lighting", ar: "الكهرباء والإضاءة" },
  { id: "body", en: "Body & Trim", ar: "الهيكل والتجهيزات" },
  { id: "filters", en: "Filters & Fluids", ar: "الفلاتر والسوائل" },
  { id: "cooling", en: "Cooling System", ar: "نظام التبريد" },
  { id: "transmission", en: "Transmission", ar: "ناقل الحركة" },
  { id: "steering", en: "Steering", ar: "التوجيه" },
  { id: "exhaust", en: "Exhaust System", ar: "نظام العادم" },
  { id: "accessories", en: "Accessories", ar: "الإكسسوارات" },
] as const;

export const models = [
  "Peugeot 301",
  "Peugeot 508",
  "Peugeot 2008",
  "Peugeot 3008",
  "Peugeot 5008",
  "Peugeot 208",
  "Peugeot Partner",
  "Peugeot Expert",
  "Peugeot Boxer",
] as const;

export const catalog: CatalogPart[] = [
  // Brakes & Suspension
  { partNumber: "PSA-4254.22", name: "Front Brake Pad Set", nameAr: "طقم تيل فرامل أمامي", category: "brakes", categoryAr: "الفرامل والتعليق", model: "Peugeot 301", image: "/parts/brake-pad.jpg", weight: "1.2 kg", oem: "4254.22" },
  { partNumber: "PSA-4249.34", name: "Front Brake Disc", nameAr: "قرص فرامل أمامي", category: "brakes", categoryAr: "الفرامل والتعليق", model: "Peugeot 301", image: "/parts/brake-disc.jpg", weight: "5.8 kg", oem: "4249.34" },
  { partNumber: "PSA-5271.E5", name: "Front Shock Absorber", nameAr: "ممتص صدمات أمامي", category: "brakes", categoryAr: "الفرامل والتعليق", model: "Peugeot 2008", image: "/parts/shock.jpg", weight: "3.1 kg", oem: "5271.E5" },
  { partNumber: "PSA-5040.R0", name: "Rear Suspension Spring", nameAr: "ياي خلفي", category: "brakes", categoryAr: "الفرامل والتعليق", model: "Peugeot 3008", image: "/parts/spring.jpg", weight: "2.4 kg", oem: "5040.R0" },
  { partNumber: "PSA-4254.68", name: "Rear Brake Pad Set", nameAr: "طقم تيل فرامل خلفي", category: "brakes", categoryAr: "الفرامل والتعليق", model: "Peugeot 508", image: "/parts/brake-pad-rear.jpg", weight: "1.0 kg", oem: "4254.68" },

  // Engine & Drivetrain
  { partNumber: "PSA-1109.CK", name: "Oil Filter", nameAr: "فلتر زيت", category: "engine", categoryAr: "المحرك ونقل الحركة", model: "Peugeot 301", image: "/parts/oil-filter.jpg", weight: "0.3 kg", oem: "1109.CK" },
  { partNumber: "PSA-V861.7B", name: "Timing Belt Kit", nameAr: "طقم سير كاتينة", category: "engine", categoryAr: "المحرك ونقل الحركة", model: "Peugeot 508", image: "/parts/timing-belt.jpg", weight: "1.8 kg", oem: "V861.7B" },
  { partNumber: "PSA-1007.49", name: "Cylinder Head Gasket", nameAr: "وجه راس سلندر", category: "engine", categoryAr: "المحرك ونقل الحركة", model: "Peugeot 208", image: "/parts/gasket.jpg", weight: "0.5 kg", oem: "1007.49" },
  { partNumber: "PSA-5970.98", name: "Spark Plug Set (4)", nameAr: "طقم بوجيهات (4)", category: "engine", categoryAr: "المحرك ونقل الحركة", model: "Peugeot 2008", image: "/parts/spark-plug.jpg", weight: "0.2 kg", oem: "5970.98" },
  { partNumber: "PSA-1201.G9", name: "Water Pump", nameAr: "طلمبة مياه", category: "engine", categoryAr: "المحرك ونقل الحركة", model: "Peugeot 3008", image: "/parts/water-pump.jpg", weight: "1.5 kg", oem: "1201.G9" },

  // Electrical & Lighting
  { partNumber: "PSA-6216.E0", name: "Headlight Assembly LH", nameAr: "كشاف أمامي يسار", category: "electrical", categoryAr: "الكهرباء والإضاءة", model: "Peugeot 301", image: "/parts/headlight.jpg", weight: "2.8 kg", oem: "6216.E0" },
  { partNumber: "PSA-6351.HH", name: "Tail Light Assembly RH", nameAr: "لمبة خلفية يمين", category: "electrical", categoryAr: "الكهرباء والإضاءة", model: "Peugeot 208", image: "/parts/taillight.jpg", weight: "1.2 kg", oem: "6351.HH" },
  { partNumber: "PSA-5978.P0", name: "Alternator", nameAr: "دينامو", category: "electrical", categoryAr: "الكهرباء والإضاءة", model: "Peugeot 508", image: "/parts/alternator.jpg", weight: "5.5 kg", oem: "5978.P0" },
  { partNumber: "PSA-5983.F5", name: "Starter Motor", nameAr: "مارش", category: "electrical", categoryAr: "الكهرباء والإضاءة", model: "Peugeot 2008", image: "/parts/starter.jpg", weight: "4.2 kg", oem: "5983.F5" },

  // Body & Trim
  { partNumber: "PSA-7104.GG", name: "Front Bumper", nameAr: "اكصدام أمامي", category: "body", categoryAr: "الهيكل والتجهيزات", model: "Peugeot 301", image: "/parts/bumper.jpg", weight: "4.5 kg", oem: "7104.GG" },
  { partNumber: "PSA-8231.PN", name: "Side Mirror LH", nameAr: "مراية جانبية يسار", category: "body", categoryAr: "الهيكل والتجهيزات", model: "Peugeot 3008", image: "/parts/mirror.jpg", weight: "0.9 kg", oem: "8231.PN" },
  { partNumber: "PSA-7111.LN", name: "Front Grille", nameAr: "شبك أمامي", category: "body", categoryAr: "الهيكل والتجهيزات", model: "Peugeot 208", image: "/parts/grille.jpg", weight: "0.7 kg", oem: "7111.LN" },

  // Filters & Fluids
  { partNumber: "PSA-1444.TJ", name: "Air Filter", nameAr: "فلتر هواء", category: "filters", categoryAr: "الفلاتر والسوائل", model: "Peugeot 301", image: "/parts/air-filter.jpg", weight: "0.4 kg", oem: "1444.TJ" },
  { partNumber: "PSA-9809.72", name: "Cabin Filter", nameAr: "فلتر تكييف", category: "filters", categoryAr: "الفلاتر والسوائل", model: "Peugeot 2008", image: "/parts/cabin-filter.jpg", weight: "0.2 kg", oem: "9809.72" },
  { partNumber: "PSA-1906.E6", name: "Fuel Filter", nameAr: "فلتر بنزين", category: "filters", categoryAr: "الفلاتر والسوائل", model: "Peugeot 508", image: "/parts/fuel-filter.jpg", weight: "0.6 kg", oem: "1906.E6" },

  // Cooling System
  { partNumber: "PSA-1330.Q1", name: "Radiator", nameAr: "رادياتير", category: "cooling", categoryAr: "نظام التبريد", model: "Peugeot 301", image: "/parts/radiator.jpg", weight: "6.0 kg", oem: "1330.Q1" },
  { partNumber: "PSA-1336.X2", name: "Thermostat", nameAr: "ثرموستات", category: "cooling", categoryAr: "نظام التبريد", model: "Peugeot 2008", image: "/parts/thermostat.jpg", weight: "0.3 kg", oem: "1336.X2" },

  // Transmission
  { partNumber: "PSA-2150.CW", name: "Clutch Kit", nameAr: "طقم دبرياج", category: "transmission", categoryAr: "ناقل الحركة", model: "Peugeot 301", image: "/parts/clutch.jpg", weight: "4.8 kg", oem: "2150.CW" },
  { partNumber: "PSA-2313.H6", name: "Gearbox Mount", nameAr: "حامل فتيس", category: "transmission", categoryAr: "ناقل الحركة", model: "Peugeot 508", image: "/parts/gearbox-mount.jpg", weight: "1.1 kg", oem: "2313.H6" },

  // Steering
  { partNumber: "PSA-4048.L7", name: "Tie Rod End", nameAr: "مقص توجيه", category: "steering", categoryAr: "التوجيه", model: "Peugeot 301", image: "/parts/tie-rod.jpg", weight: "0.8 kg", oem: "4048.L7" },
  { partNumber: "PSA-4062.R4", name: "Power Steering Pump", nameAr: "طلمبة باور", category: "steering", categoryAr: "التوجيه", model: "Peugeot 3008", image: "/parts/ps-pump.jpg", weight: "3.0 kg", oem: "4062.R4" },

  // Exhaust
  { partNumber: "PSA-1731.AN", name: "Catalytic Converter", nameAr: "محول حفاز", category: "exhaust", categoryAr: "نظام العادم", model: "Peugeot 301", image: "/parts/catalytic.jpg", weight: "7.0 kg", oem: "1731.AN" },
  { partNumber: "PSA-1726.S4", name: "Exhaust Muffler", nameAr: "شكمان", category: "exhaust", categoryAr: "نظام العادم", model: "Peugeot 208", image: "/parts/muffler.jpg", weight: "5.5 kg", oem: "1726.S4" },

  // Accessories
  { partNumber: "PSA-6438.JA", name: "Wiper Blade Set", nameAr: "طقم مساحات", category: "accessories", categoryAr: "الإكسسوارات", model: "Peugeot 301", image: "/parts/wipers.jpg", weight: "0.5 kg", oem: "6438.JA" },
  { partNumber: "PSA-1608.F9", name: "Battery 70Ah", nameAr: "بطارية 70 أمبير", category: "accessories", categoryAr: "الإكسسوارات", model: "Peugeot 2008", image: "/parts/battery.jpg", weight: "18 kg", oem: "1608.F9" },
];
