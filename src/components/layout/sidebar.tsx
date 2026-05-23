"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  ShoppingCart,
  ClipboardList,
  Megaphone,
  FileText,
  Receipt,
  AlertTriangle,
  BarChart3,
  Users,
  Settings,
  ChevronRight,
  UserCheck,
  Database,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { usePortal } from "@/lib/portal-data";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: "pendingRegistrations";
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const dealerNav: NavSection[] = [
  {
    label: "WORKSPACE",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/parts", label: "Parts Inquiry", icon: Search },
      { href: "/dashboard/orders/new", label: "Cart & New Order", icon: ShoppingCart },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { href: "/dashboard/orders", label: "Orders", icon: ClipboardList },
      { href: "/dashboard/invoices", label: "Invoices", icon: Receipt },
      { href: "/dashboard/backorders", label: "Back Orders", icon: AlertTriangle },
    ],
  },
  {
    label: "COMMERCIAL",
    items: [
      { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/dashboard/inquiries", label: "Inquiry Log", icon: FileText },
    ],
  },
];

const adminNav: NavSection[] = [
  {
    label: "OVERVIEW",
    items: [
      { href: "/dashboard/admin", label: "Operational Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/admin/approvals", label: "Approvals Queue", icon: ClipboardList },
    ],
  },
  {
    label: "FULFILLMENT",
    items: [
      { href: "/dashboard/admin/orders", label: "Order History", icon: FileText },
      { href: "/dashboard/admin/invoicing", label: "Invoicing", icon: Receipt },
    ],
  },
  {
    label: "NETWORK",
    items: [
      { href: "/dashboard/admin/registrations", label: "Registrations", icon: UserCheck, badge: "pendingRegistrations" },
      { href: "/dashboard/admin/dealers", label: "Dealers", icon: Users },
      { href: "/dashboard/admin/campaigns", label: "Campaigns", icon: Megaphone },
    ],
  },
  {
    label: "REPORTS",
    items: [
      { href: "/dashboard/admin/reports/inquiries", label: "Inquiry Report", icon: BarChart3 },
      { href: "/dashboard/admin/reports/lost-sales", label: "Lost Sales Report", icon: BarChart3 },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { href: "/dashboard/admin/sync", label: "SAP CSV Sync", icon: Database },
    ],
  },
];

export function Sidebar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { role } = usePortal();

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (role !== "admin") return;
    fetch("/api/registration/list")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body) => {
        const count = (body.data ?? []).filter(
          (r: { review_status: string }) => r.review_status === "pending"
        ).length;
        setPendingCount(count);
      })
      .catch(() => {});
  }, [role, pathname]);

  const badgeCounts: Record<string, number> = {
    pendingRegistrations: pendingCount,
  };

  const navSections = role === "admin" ? adminNav : dealerNav;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    if (href === "/dashboard/admin") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden w-[264px] shrink-0 flex-col border-e border-sidebar-border bg-sidebar lg:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden">
          <Image
            src="/logo.png"
            alt="MANSCO"
            width={32}
            height={32}
            className="object-contain"
          />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-[0.1em] text-white">
            MANSCO
          </span>
          <span className="text-[9px] font-medium tracking-[0.15em] text-white/40">
            SPARE PARTS PORTAL
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navSections.map((section) => (
          <div key={section.label} className="mb-2">
            <div className="px-6 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
              {section.label}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const count = item.badge ? badgeCounts[item.badge] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 px-6 py-2.5 text-sm transition-all ${
                    active
                      ? "bg-sidebar-primary/15 font-medium text-white"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {count > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-black">
                      {count}
                    </span>
                  )}
                  {active && !count && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-sidebar-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Settings link at bottom */}
      <div className="border-t border-sidebar-border px-6 py-4">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 text-sm text-sidebar-foreground transition hover:text-white"
        >
          <Settings className="h-4 w-4" strokeWidth={1.5} />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
