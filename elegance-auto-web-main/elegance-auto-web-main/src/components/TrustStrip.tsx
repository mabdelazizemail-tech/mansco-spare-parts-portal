import { ShieldCheck, Truck, RotateCcw, Headphones } from "lucide-react";
import { Reveal } from "./Reveal";

const trust = [
  { icon: ShieldCheck, title: "100% Genuine Parts", description: "Every component sourced directly from Stellantis with full traceability." },
  { icon: Truck, title: "24h Cairo Delivery", description: "Same-day dispatch on in-stock orders. Nationwide in 2–4 working days." },
  { icon: RotateCcw, title: "30-Day Returns", description: "Hassle-free returns on unopened items in original packaging." },
  { icon: Headphones, title: "Expert Support", description: "Certified parts advisors available 7 days a week — call 16404." },
];

export const TrustStrip = () => (
  <section className="bg-[hsl(var(--surface))] border-y border-[hsl(var(--hairline))]">
    <div className="container-aura py-16 md:py-20">
      <div className="grid gap-px bg-[hsl(var(--hairline))] sm:grid-cols-2 lg:grid-cols-4 border border-[hsl(var(--hairline))]">
        {trust.map((t, i) => (
          <Reveal key={t.title} delay={i * 60}>
            <div className="bg-background p-7 h-full">
              <t.icon className="h-6 w-6 text-primary mb-4" />
              <h3 className="font-display text-sm font-bold uppercase tracking-tight mb-2">
                {t.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);
