import { NavLink, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Search, ShoppingCart, ClipboardList, Megaphone, FileText,
  Receipt, AlertTriangle, BarChart3, Users, Settings, Building2, ChevronRight,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortal, dealers } from "@/lib/portal-data";
import { useI18n } from "@/lib/i18n";
import peugeotLogo from "@/assets/peugeot-logo.png";

type NavItem = { labelKey: string; to: string; icon: typeof LayoutDashboard };

const dealerNav: { groupKey: string; items: NavItem[] }[] = [
  {
    groupKey: "nav.group.workspace",
    items: [
      { labelKey: "nav.dashboard", to: "/portal", icon: LayoutDashboard },
      { labelKey: "nav.partsInquiry", to: "/portal/parts", icon: Search },
      { labelKey: "nav.cart", to: "/portal/cart", icon: ShoppingCart },
    ],
  },
  {
    groupKey: "nav.group.operations",
    items: [
      { labelKey: "nav.orders", to: "/portal/orders", icon: ClipboardList },
      { labelKey: "nav.invoices", to: "/portal/invoices", icon: Receipt },
      { labelKey: "nav.backorders", to: "/portal/backorders", icon: AlertTriangle },
    ],
  },
  {
    groupKey: "nav.group.commercial",
    items: [
      { labelKey: "nav.campaigns", to: "/portal/campaigns", icon: Megaphone },
      { labelKey: "nav.inquiryLog", to: "/portal/inquiries", icon: FileText },
    ],
  },
];

const adminNav: { groupKey: string; items: NavItem[] }[] = [
  {
    groupKey: "nav.group.overview",
    items: [
      { labelKey: "nav.opsDashboard", to: "/admin", icon: BarChart3 },
      { labelKey: "nav.approvals", to: "/admin/approvals", icon: AlertTriangle },
    ],
  },
  {
    groupKey: "nav.group.network",
    items: [
      { labelKey: "nav.dealers", to: "/admin/dealers", icon: Users },
      { labelKey: "nav.campaigns", to: "/admin/campaigns", icon: Megaphone },
    ],
  },
  {
    groupKey: "nav.group.reports",
    items: [
      { labelKey: "nav.inquiryReport", to: "/admin/reports/inquiries", icon: FileText },
      { labelKey: "nav.lostSales", to: "/admin/reports/lost-sales", icon: AlertTriangle },
    ],
  },
];

export const PortalSidebar = () => {
  const { role } = usePortal();
  const { t, dir } = useI18n();
  const nav = role === "admin" ? adminNav : dealerNav;
  const location = useLocation();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-sidebar-border ltr:border-r rtl:border-l">
      <Link to={role === "admin" ? "/admin" : "/portal"} className="h-16 px-5 flex items-center gap-3 border-b border-sidebar-border">
        <img src={peugeotLogo} alt="Peugeot" className="h-9 w-auto invert" />
        <div className="flex flex-col leading-tight">
          <span className="font-display text-sm font-bold tracking-tight">{t("chrome.brand")}</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">{t("chrome.tagline")}</span>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {nav.map((g) => (
          <div key={g.groupKey}>
            <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50 font-semibold">
              {t(g.groupKey)}
            </p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to || (item.to !== "/portal" && item.to !== "/admin" && location.pathname.startsWith(item.to));
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/portal" || item.to === "/admin"}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        active
                          ? "bg-sidebar-primary/15 text-white font-medium"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active && "text-sidebar-primary")} />
                      <span className="flex-1 truncate">{t(item.labelKey)}</span>
                      {active && (
                        <ChevronRight
                          className={cn("h-3.5 w-3.5 text-sidebar-primary", dir === "rtl" && "rotate-180")}
                        />
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <NavLink
          to="/portal/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white transition-colors"
        >
          <Settings className="h-4 w-4" /> {t("chrome.settings")}
        </NavLink>
      </div>
    </aside>
  );
};

export const PortalTopbar = () => {
  const { role, setRole, dealer, setDealerId } = usePortal();
  const { t, lang, toggleLang } = useI18n();

  return (
    <header className="h-16 shrink-0 bg-card border-b border-[hsl(var(--hairline))] flex items-center px-4 md:px-6 gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{role === "admin" ? t("chrome.operations") : dealer.name}</span>
        <span className="text-muted-foreground hidden sm:inline">· {role === "admin" ? t("chrome.adminConsole") : `${dealer.tier} · ${dealer.city}`}</span>
      </div>

      <div className="flex-1" />

      {role === "dealer" && (
        <div className="hidden md:block">
          <label className="sr-only" htmlFor="dealer-switch">{t("chrome.activeDealer")}</label>
          <select
            id="dealer-switch"
            value={dealer.id}
            onChange={(e) => setDealerId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {dealers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="button"
        onClick={toggleLang}
        aria-label={lang === "en" ? t("chrome.toggleLanguage") : t("chrome.toggleLanguageBack")}
        title={lang === "en" ? "العربية" : "English"}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-xs font-semibold uppercase tracking-wider text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{lang === "en" ? "AR" : "EN"}</span>
      </button>

      <div className="flex items-center gap-1 rounded-md border border-input bg-background p-1 text-xs">
        <button
          onClick={() => setRole("dealer")}
          className={cn("px-3 py-1 rounded font-medium transition-colors", role === "dealer" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {t("chrome.dealer")}
        </button>
        <button
          onClick={() => setRole("admin")}
          className={cn("px-3 py-1 rounded font-medium transition-colors", role === "admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {t("chrome.admin")}
        </button>
      </div>

      <div className="hidden md:flex items-center gap-2 ps-3 border-s border-[hsl(var(--hairline))]">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] grid place-items-center text-primary-foreground text-xs font-bold">
          {role === "admin" ? "AD" : dealer.contact.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="text-xs leading-tight">
          <p className="font-medium">{role === "admin" ? t("chrome.opsAdmin") : dealer.contact}</p>
          <p className="text-muted-foreground">{role === "admin" ? "ops@mansco.eg" : dealer.email}</p>
        </div>
      </div>
    </header>
  );
};
