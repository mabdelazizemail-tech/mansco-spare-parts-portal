import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { featured } from "@/lib/catalog";
import { PartCard } from "./PartCard";
import { Reveal } from "./Reveal";

export const FeaturedParts = () => (
  <section className="container-aura py-24 md:py-32">
    <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
      <div>
        <p className="eyebrow mb-4">02 — Bestsellers</p>
        <h2 className="display-lg text-balance">
          Most ordered<br />this <span className="text-primary">month</span>.
        </h2>
      </div>
      <Button asChild variant="outline" size="lg">
        <Link to="/catalog">
          View Full Catalog
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </Reveal>

    <div className="grid gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {featured.map((p, i) => (
        <Reveal key={p.sku} delay={i * 80}>
          <PartCard part={p} />
        </Reveal>
      ))}
    </div>
  </section>
);
