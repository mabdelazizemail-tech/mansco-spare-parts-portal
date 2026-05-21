import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { categories } from "@/lib/catalog";
import { Reveal } from "./Reveal";

export const CategoryGrid = () => (
  <section id="categories" className="container-aura py-24 md:py-32">
    <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
      <div>
        <p className="eyebrow mb-4">01 — Categories</p>
        <h2 className="display-lg text-balance max-w-2xl">
          Shop by<br /><span className="text-primary">category</span>.
        </h2>
      </div>
      <p className="text-muted-foreground max-w-md text-base leading-relaxed">
        Over 720 referenced parts across maintenance, performance and accessories — all
        cross-referenced to your exact model.
      </p>
    </Reveal>

    <div className="grid gap-px bg-[hsl(var(--hairline))] sm:grid-cols-2 lg:grid-cols-4 border border-[hsl(var(--hairline))]">
      {categories.map((c, i) => (
        <Reveal key={c.slug} delay={i * 60}>
          <Link
            to={`/catalog/${c.slug}`}
            className="group block bg-background h-full p-6 hover:bg-secondary transition-colors duration-300"
          >
            <div className="aspect-square overflow-hidden bg-[hsl(var(--surface))] mb-5">
              <img
                src={c.image}
                alt={c.name}
                loading="lazy"
                width={1000}
                height={800}
                className="image-zoom h-full w-full object-cover"
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold uppercase tracking-tight mb-1">
                  {c.name}
                </h3>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {c.count} references
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 mt-1 text-muted-foreground group-hover:text-primary group-hover:rotate-12 transition-all" />
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  </section>
);
