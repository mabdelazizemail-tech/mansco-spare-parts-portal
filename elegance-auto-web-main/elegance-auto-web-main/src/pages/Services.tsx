import { useEffect } from "react";
import { Wrench, ShieldCheck, LifeBuoy, Sparkles, Cog, BatteryCharging } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import interiorImg from "@/assets/detail-interior.jpg";

const services = [
  { icon: Wrench, title: "Workshop Booking", description: "Reserve a slot at any authorized Peugeot service center across Egypt." },
  { icon: ShieldCheck, title: "Extended Warranty", description: "Up to 5 years of comprehensive coverage on parts and labor." },
  { icon: LifeBuoy, title: "Roadside Assistance", description: "24/7 emergency support nationwide. Average response under 60 minutes." },
  { icon: Sparkles, title: "Maintenance Plans", description: "Pre-paid service contracts that lock in today's prices for up to 4 years." },
  { icon: Cog, title: "Genuine Parts Fitting", description: "Free fitting at our service centers when you order through this catalog." },
  { icon: BatteryCharging, title: "EV Care", description: "Battery diagnostics, software updates and charging support for e-208 & e-2008." },
];

const Services = () => {
  useEffect(() => {
    document.title = "Services — Peugeot Spare Parts Egypt";
  }, []);

  return (
    <>
      <section className="relative pt-32 md:pt-40 pb-20 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={interiorImg} alt="" className="h-full w-full object-cover opacity-30" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>
        <div className="container-aura">
          <Reveal>
            <p className="eyebrow mb-6">Owner Services</p>
            <h1 className="display-xl text-balance max-w-4xl">
              Care that<br /><span className="text-primary">never sleeps</span>.
            </h1>
            <p className="mt-6 text-muted-foreground max-w-xl text-base md:text-lg">
              Beyond parts — Peugeot Egypt's certified network keeps your vehicle running
              exactly as it was engineered to.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="container-aura py-16">
        <div className="grid gap-px bg-[hsl(var(--hairline))] md:grid-cols-2 lg:grid-cols-3 border border-[hsl(var(--hairline))]">
          {services.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <div className="bg-background p-8 h-full group hover:bg-secondary transition-colors duration-300">
                <s.icon className="h-7 w-7 text-primary mb-6 transition-transform duration-500 group-hover:scale-110" />
                <h3 className="font-display text-xl font-bold uppercase tracking-tight mb-3">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-aura pb-24 md:pb-32">
        <div className="border border-[hsl(var(--hairline))] p-10 md:p-16 bg-gradient-card text-center">
          <p className="eyebrow mb-4">Need assistance?</p>
          <h3 className="display-md mb-8">Book a service in 60 seconds.</h3>
          <Button asChild size="lg">
            <Link to="/contact">Schedule Now</Link>
          </Button>
        </div>
      </section>
    </>
  );
};

export default Services;
