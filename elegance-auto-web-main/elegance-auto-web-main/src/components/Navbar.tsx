import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, Globe, ShoppingCart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { Logo } from "./Logo";

const navItems = [
  { label: "Catalog", to: "/catalog" },
  { label: "Categories", to: "/catalog" },
  { label: "VIN Finder", to: "/vin-finder" },
  { label: "Services", to: "/services" },
  { label: "Support", to: "/contact" },
];

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"EN" | "AR">("EN");
  const location = useLocation();
  const { totalQty } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled || open
          ? "bg-background/90 backdrop-blur-xl border-b border-[hsl(var(--hairline))]"
          : "bg-gradient-to-b from-background/70 to-transparent",
      )}
    >
      <div className="container-aura flex h-16 md:h-20 items-center justify-between gap-4">
        <Link to="/" aria-label="Peugeot Egypt — Spare Parts">
          <Logo />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors",
                  "text-foreground/75 hover:text-foreground",
                  isActive && "text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1 md:gap-2">
          <Link
            to="/catalog"
            className="hidden md:grid h-10 w-10 place-items-center text-foreground/80 hover:text-foreground transition-colors"
            aria-label="Search parts"
          >
            <Search className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setLang(lang === "EN" ? "AR" : "EN")}
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground transition-colors px-2 py-1"
            aria-label="Toggle language"
          >
            <Globe className="h-3.5 w-3.5" />
            {lang}
          </button>
          <Link
            to="/cart"
            className="relative h-10 w-10 grid place-items-center text-foreground hover:text-primary transition-colors"
            aria-label={`Cart (${totalQty} items)`}
          >
            <ShoppingCart className="h-4 w-4" />
            {totalQty > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] grid place-items-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                {totalQty}
              </span>
            )}
          </Link>
          <Button asChild size="sm" className="hidden md:inline-flex ml-1">
            <Link to="/vin-finder">Find My Part</Link>
          </Button>
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 -mr-2"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-[hsl(var(--hairline))] bg-background/95 backdrop-blur-xl">
          <nav className="container-aura py-6 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="py-3 text-base font-semibold uppercase tracking-[0.18em] border-b border-[hsl(var(--hairline))] last:border-0"
              >
                {item.label}
              </Link>
            ))}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setLang(lang === "EN" ? "AR" : "EN")}
                className="flex items-center gap-1.5 text-xs uppercase tracking-wider"
              >
                <Globe className="h-3.5 w-3.5" /> {lang}
              </button>
              <Button asChild size="sm">
                <Link to="/vin-finder">Find My Part</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
