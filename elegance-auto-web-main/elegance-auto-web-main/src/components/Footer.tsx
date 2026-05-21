import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube, Linkedin, Mail, Phone } from "lucide-react";
import { Logo } from "./Logo";

const cols = [
  {
    title: "Shop",
    links: [
      { label: "All Categories", to: "/catalog" },
      { label: "Brakes", to: "/catalog/brakes" },
      { label: "Filters", to: "/catalog/filters" },
      { label: "Wheels & Tyres", to: "/catalog/wheels" },
      { label: "Lighting", to: "/catalog/lighting" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "VIN Finder", to: "/vin-finder" },
      { label: "Workshop Booking", to: "/services" },
      { label: "Roadside Assistance", to: "/services" },
      { label: "Warranty", to: "/services" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Track Order", to: "/contact" },
      { label: "Returns", to: "/contact" },
      { label: "Shipping Info", to: "/contact" },
      { label: "Help Center", to: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Sale", to: "/contact" },
      { label: "Privacy Policy", to: "/contact" },
      { label: "Cookie Settings", to: "/contact" },
      { label: "Counterfeit Notice", to: "/contact" },
    ],
  },
];

export const Footer = () => (
  <footer className="bg-[hsl(var(--surface))] border-t border-[hsl(var(--hairline))] mt-24">
    <div className="container-aura py-16 md:py-24">
      <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
        <div>
          <Link to="/" className="inline-block mb-6">
            <Logo />
          </Link>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
            The official source for genuine Peugeot spare parts in Egypt.
            Backed by manufacturer warranty, delivered nationwide.
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground mb-6">
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-primary" /> 16404 (Customer Care)
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-primary" /> parts@peugeot-eg.com
            </li>
          </ul>
          <div className="flex items-center gap-3">
            {[Instagram, Facebook, Youtube, Linkedin].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="Social link"
                className="h-9 w-9 grid place-items-center rounded-sm border border-[hsl(var(--hairline))] hover:border-primary hover:text-primary transition-colors"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs uppercase tracking-[0.2em] font-semibold mb-4 text-foreground">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="hairline mt-16 pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-muted-foreground uppercase tracking-wider">
        <p>© {new Date().getFullYear()} Peugeot Egypt — Spare Parts Division.</p>
        <p>Authorized Distributor · Stellantis Group</p>
      </div>
    </div>
  </footer>
);
