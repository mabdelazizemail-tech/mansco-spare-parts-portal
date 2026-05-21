import { ArrowRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import bannerImg from "@/assets/banner-promo.jpg";
import { Reveal } from "./Reveal";

export const PromoBanner = () => (
  <section id="offers" className="container-aura">
    <Reveal className="relative overflow-hidden border border-[hsl(var(--hairline))]">
      <img
        src={bannerImg}
        alt="Peugeot maintenance package"
        loading="lazy"
        width={1920}
        height={900}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />

      <div className="relative grid md:grid-cols-2 gap-8 items-center p-8 md:p-16 lg:p-20 min-h-[420px]">
        <div>
          <p className="eyebrow mb-4 text-primary">Maintenance Bundle · Spring 2026</p>
          <h2 className="display-md text-balance mb-5">
            Save 15% on full<br />service packages.
          </h2>
          <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
            Bundle your oil, filter and brake replacements in a single order — and get
            free fitting at any authorized Peugeot Egypt service center.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="group">
              <Link to="/catalog">
                Shop Bundles
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/vin-finder"><Search className="h-4 w-4" /> Find by VIN</Link>
            </Button>
          </div>
        </div>
      </div>
    </Reveal>
  </section>
);
