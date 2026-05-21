import { Wrench, FileText, Calendar, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";

const actions = [
  { icon: Wrench, title: "Book Workshop Visit", description: "Reserve a slot at any authorized Peugeot service center.", to: "/services" },
  { icon: FileText, title: "Request a Quote", description: "Bulk pricing for fleets, workshops and resellers.", to: "/contact" },
  { icon: Calendar, title: "Track an Order", description: "Real-time status from dispatch to your door.", to: "/contact" },
  { icon: Download, title: "Download Catalog", description: "Full PDF parts catalog organized by model & system.", to: "/contact" },
];

export const QuickActions = () => (
  <section className="container-aura py-24 md:py-32">
    <Reveal className="mb-12 md:mb-16">
      <p className="eyebrow mb-4">03 — Owner Services</p>
      <h2 className="display-md text-balance max-w-2xl">
        Beyond the<br />parts counter.
      </h2>
    </Reveal>

    <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((a, i) => (
        <Reveal key={a.title} delay={i * 70}>
          <Link
            to={a.to}
            className="group flex flex-col h-full p-7 bg-gradient-card border border-[hsl(var(--hairline))] hover:border-primary/60 transition-all duration-500 glow-on-hover"
          >
            <div className="h-11 w-11 grid place-items-center border border-[hsl(var(--hairline))] mb-6 group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground transition-all duration-300">
              <a.icon className="h-4 w-4" />
            </div>
            <h3 className="font-display text-base font-bold uppercase tracking-tight mb-2">
              {a.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {a.description}
            </p>
          </Link>
        </Reveal>
      ))}
    </div>
  </section>
);
