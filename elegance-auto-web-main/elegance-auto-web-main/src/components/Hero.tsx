import { ArrowRight, Search, ShieldCheck, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/parts-hero.jpg";

export const Hero = () => {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/catalog?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <section className="relative min-h-[680px] md:min-h-[760px] w-full overflow-hidden">
      <img
        src={heroImg}
        alt="Genuine Peugeot spare parts"
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-background/30" />

      <div className="relative z-10 container-aura pt-32 md:pt-40 pb-16 md:pb-24">
        <div className="max-w-3xl fade-in-up">
          <p className="eyebrow mb-6 flex items-center gap-3">
            <span className="h-px w-10 bg-primary" />
            Genuine Parts · Nationwide Delivery
          </p>
          <h1 className="display-xl text-balance">
            Built for your<br />
            <span className="text-primary">Peugeot</span>. Always.
          </h1>
          <p className="mt-6 max-w-xl text-base md:text-lg text-foreground/80 leading-relaxed">
            Order original Peugeot spare parts online — backed by manufacturer warranty,
            shipped from our Cairo distribution centre to anywhere in Egypt.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-10 flex max-w-xl bg-background/80 backdrop-blur border border-[hsl(var(--hairline))] focus-within:border-primary transition-colors"
          >
            <div className="flex items-center pl-4">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by part name, OEM number, or SKU"
              className="flex-1 bg-transparent px-3 py-4 text-sm placeholder:text-muted-foreground focus:outline-none"
              aria-label="Search parts"
            />
            <Button type="submit" size="default" className="rounded-none h-auto px-6">
              Search
            </Button>
          </form>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs uppercase tracking-[0.2em] text-foreground/70">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> 100% Genuine</span>
            <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> 24h Cairo Delivery</span>
            <span className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" /> 2-Year Warranty</span>
          </div>
        </div>

        <div className="mt-12">
          <Link
            to="/vin-finder"
            className="group inline-flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-foreground/80 hover:text-primary transition-colors"
          >
            Don't know your part? Use the VIN finder
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
};
