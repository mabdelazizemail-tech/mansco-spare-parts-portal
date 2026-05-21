"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  User,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n";
import { usePortal } from "@/lib/portal-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function Header() {
  const router = useRouter();
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const { role, currentDealer } = usePortal();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Real user from Supabase — loaded from local session cache (no network flash)
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userInitials, setUserInitials] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    // getSession() reads from localStorage — synchronous-like, avoids visible flash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const meta = session.user.user_metadata ?? {};
      const name: string = meta.contact_person ?? meta.full_name ?? session.user.email ?? "";
      const company: string = meta.company_name ?? "";
      const email: string = session.user.email ?? "";
      setUserName(name);
      setUserEmail(email);
      setCompanyName(company);
      const parts = name.trim().split(/\s+/);
      setUserInitials(
        parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase()
      );
    });
  }, []);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setSigningOut(false);
    }
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  const handleSettingsClick = () => {
    router.push("/settings");
  };

  return (
    <header className="sticky top-0 z-40 h-16 w-full border-b border-border bg-card">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left: Context label */}
        <div className="flex items-center gap-3">
          {/* Left label: company name for dealers, MANSCO Operations for admin */}
          {/* Mobile menu trigger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.05] lg:hidden">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar">
              <SheetTitle className="px-6 pt-6 text-sm font-semibold text-white">
                {t("nav.menu")}
              </SheetTitle>
              <nav className="mt-6 flex flex-col px-4">
                {[
                  { href: "/dashboard", label: "Dashboard" },
                  { href: "/dashboard/parts", label: "Parts Inquiry" },
                  { href: "/dashboard/orders/new", label: "Cart & New Order" },
                  { href: "/dashboard/orders", label: "Orders" },
                  { href: "/dashboard/invoices", label: "Invoices" },
                  { href: "/dashboard/backorders", label: "Back Orders" },
                  { href: "/dashboard/campaigns", label: "Campaigns" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="border-b border-white/5 px-3 py-3.5 text-sm text-white/50 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <div className="text-sm font-medium text-white">
            {role === "admin"
              ? "MANSCO Operations"
              : companyName || <span className="inline-block h-4 w-28 animate-pulse rounded bg-white/10" />}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Dealer code badge */}
          {role === "dealer" && currentDealer.code && (
            <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-white/70 lg:inline-flex items-center gap-1">
              <span className="font-mono">{currentDealer.code}</span>
              <span className="text-white/30">&mdash;</span>
              <span>{companyName || currentDealer.name}</span>
            </span>
          )}

          {/* Language toggle */}
          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="flex h-8 items-center rounded-md border border-white/10 px-2.5 text-xs font-medium text-white/60 transition hover:bg-white/[0.05] hover:text-white"
          >
            {locale === "en" ? "AR" : "EN"}
          </button>

          <div className="mx-1 hidden h-7 w-px bg-white/10 sm:block" />

          {/* Avatar / user menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-10 items-center gap-2.5 rounded-lg px-2 transition-colors hover:bg-white/[0.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFA6]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00BFA6]/20 text-[11px] font-bold text-[#00BFA6]">
                {userInitials}
              </div>
              <div className="hidden text-start sm:block">
                <p className="text-sm font-semibold leading-tight text-white">
                  {userName || "—"}
                </p>
                <p className="text-[11px] leading-tight text-white/40">
                  {userEmail}
                </p>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-white/40 sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs font-semibold">
                  {userName || userEmail}
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="me-2 h-4 w-4" /> {t("nav.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsClick}>
                  <Settings className="me-2 h-4 w-4" /> {t("nav.settings")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={handleLogout} disabled={signingOut}>
                  <LogOut className={`me-2 h-4 w-4 ${signingOut ? "animate-spin" : ""}`} />
                  {signingOut ? "Signing out..." : t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
