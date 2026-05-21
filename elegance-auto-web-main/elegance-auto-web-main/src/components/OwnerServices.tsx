import { Wrench, LifeBuoy, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";

const services = [
  { icon: Wrench, title: "Maintenance Booking", description: "Schedule routine service in seconds." },
  { icon: LifeBuoy, title: "Roadside Assistance", description: "24/7 support, anywhere you drive." },
  { icon: ShieldCheck, title: "Service Request", description: "Diagnostics, repairs, and recalls." },
  { icon: Sparkles, title: "Detailing & Care", description: "Keep your Aura in showroom condition." },
];

export const OwnerServices = () => (
  <section className="bg-[hsl(var(--surface))] border-y border-[hsl(var(--hairline))]">
    <div className="container-aura py-24 md:py-32">
      <Reveal className="grid md:grid-cols-2 gap-8 items-end mb-12 md:mb-16">
        <div>
          <p className="eyebrow mb-4">03 — Owner Services</p>
          <h2 className="display-md text-balance">
            Beyond the<br />key handover.
          </h2>
        </div>
        <p className="text-muted-foreground max-w-md md:justify-self-end leading-relaxed">
          Every Aura comes with a network of certified specialists, ready to keep your
          machine performing at its peak — for the long road ahead.
        </p>
      </Reveal>

      <div className="grid gap-px bg-[hsl(var(--hairline))] sm:grid-cols-2 lg:grid-cols-4 border border-[hsl(var(--hairline))]">
        {services.map((s, i) => (
          <Reveal key={s.title} delay={i * 70}>
            <Link
              to="/services"
              className="group block p-8 bg-background h-full hover:bg-secondary transition-colors duration-300"
            >
              <s.icon className="h-7 w-7 text-primary mb-6 transition-transform duration-500 group-hover:scale-110" />
              <h3 className="font-display text-lg font-bold uppercase tracking-tight mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s.description}
              </p>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);
