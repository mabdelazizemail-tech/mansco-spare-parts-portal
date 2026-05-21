import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Model } from "@/lib/models";

export const ModelCard = ({ model }: { model: Model }) => (
  <Link
    to={`/models/${model.slug}`}
    className="group relative flex flex-col overflow-hidden bg-gradient-card border border-[hsl(var(--hairline))] hover:border-primary/50 transition-colors duration-500"
  >
    <div className="relative aspect-[4/3] overflow-hidden bg-[hsl(var(--surface))]">
      <img
        src={model.image}
        alt={model.name}
        loading="lazy"
        width={1280}
        height={800}
        className="image-zoom h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500" />
      <div className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.25em] text-foreground/80 bg-background/40 backdrop-blur-md px-2.5 py-1 border border-foreground/10">
        {model.category}
      </div>
    </div>

    <div className="p-6 flex items-end justify-between gap-4">
      <div>
        <h3 className="font-display text-2xl font-bold uppercase tracking-tight">
          {model.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{model.tagline}</p>
        <p className="text-xs uppercase tracking-wider text-primary mt-3">
          {model.startingPrice}
        </p>
      </div>
      <div className="h-11 w-11 shrink-0 grid place-items-center border border-[hsl(var(--hairline))] group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground transition-all duration-300">
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-12" />
      </div>
    </div>
  </Link>
);
