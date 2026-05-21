import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";
export type Dir = "ltr" | "rtl";

type Dict = Record<string, string>;

const en: Dict = {
  // Top bar / chrome
  "chrome.operations": "MANSCO Operations",
  "chrome.adminConsole": "Administrator console",
  "chrome.activeDealer": "Active dealer",
  "chrome.dealer": "Dealer",
  "chrome.admin": "Admin",
  "chrome.opsAdmin": "Operations Admin",
  "chrome.brand": "MANSCO",
  "chrome.tagline": "Spare Parts Portal",
  "chrome.settings": "Settings",
  "chrome.language": "Language",
  "chrome.toggleLanguage": "Switch to Arabic",
  "chrome.toggleLanguageBack": "Switch to English",

  // Nav groups
  "nav.group.workspace": "Workspace",
  "nav.group.operations": "Operations",
  "nav.group.commercial": "Commercial",
  "nav.group.overview": "Overview",
  "nav.group.network": "Network",
  "nav.group.reports": "Reports",

  // Nav items
  "nav.dashboard": "Dashboard",
  "nav.partsInquiry": "Parts Inquiry",
  "nav.cart": "Cart & New Order",
  "nav.orders": "Orders",
  "nav.invoices": "Invoices",
  "nav.backorders": "Back Orders",
  "nav.campaigns": "Campaigns",
  "nav.inquiryLog": "Inquiry Log",
  "nav.opsDashboard": "Operational Dashboard",
  "nav.approvals": "Approvals Queue",
  "nav.dealers": "Dealers & Sub-Dealers",
  "nav.inquiryReport": "Inquiry Report",
  "nav.lostSales": "Lost Sales Report",
};

const ar: Dict = {
  "chrome.operations": "عمليات مانسكو",
  "chrome.adminConsole": "وحدة تحكم المسؤول",
  "chrome.activeDealer": "الموزع النشط",
  "chrome.dealer": "موزع",
  "chrome.admin": "مسؤول",
  "chrome.opsAdmin": "مسؤول العمليات",
  "chrome.brand": "مانسكو",
  "chrome.tagline": "بوابة قطع الغيار",
  "chrome.settings": "الإعدادات",
  "chrome.language": "اللغة",
  "chrome.toggleLanguage": "التبديل إلى العربية",
  "chrome.toggleLanguageBack": "Switch to English",

  "nav.group.workspace": "مساحة العمل",
  "nav.group.operations": "العمليات",
  "nav.group.commercial": "تجاري",
  "nav.group.overview": "نظرة عامة",
  "nav.group.network": "الشبكة",
  "nav.group.reports": "التقارير",

  "nav.dashboard": "لوحة التحكم",
  "nav.partsInquiry": "استعلام القطع",
  "nav.cart": "السلة وطلب جديد",
  "nav.orders": "الطلبات",
  "nav.invoices": "الفواتير",
  "nav.backorders": "الطلبات المؤجلة",
  "nav.campaigns": "الحملات",
  "nav.inquiryLog": "سجل الاستعلامات",
  "nav.opsDashboard": "لوحة التشغيل",
  "nav.approvals": "قائمة الموافقات",
  "nav.dealers": "الموزعون والوكلاء الفرعيون",
  "nav.inquiryReport": "تقرير الاستعلامات",
  "nav.lostSales": "تقرير المبيعات المفقودة",
};

const dictionaries: Record<Lang, Dict> = { en, ar };

type Ctx = {
  lang: Lang;
  dir: Dir;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: string) => string;
};

const I18nCtx = createContext<Ctx | undefined>(undefined);

const STORAGE_KEY = "mansco.lang";

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    return saved === "ar" || saved === "en" ? saved : "en";
  });

  const dir: Dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = dir;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir]);

  const value = useMemo<Ctx>(() => {
    const dict = dictionaries[lang];
    return {
      lang,
      dir,
      setLang: setLangState,
      toggleLang: () => setLangState((l) => (l === "en" ? "ar" : "en")),
      t: (key: string) => dict[key] ?? dictionaries.en[key] ?? key,
    };
  }, [lang, dir]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
};
