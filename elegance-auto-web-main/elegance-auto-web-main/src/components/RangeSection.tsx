import { models } from "@/lib/models";
import { ModelCard } from "./ModelCard";
import { Reveal } from "./Reveal";

export const RangeSection = () => (
  <section id="range" className="container-aura py-24 md:py-32">
    <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
      <div>
        <p className="eyebrow mb-4">01 — Our Range</p>
        <h2 className="display-lg text-balance max-w-2xl">
          Built for every<br /><span className="text-primary">drive</span> ahead.
        </h2>
      </div>
      <p className="text-muted-foreground max-w-md text-base leading-relaxed">
        From compact city machines to long-range electric crossovers — explore the full
        Aura lineup, engineered to match every ambition.
      </p>
    </Reveal>

    <div className="grid gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {models.map((m, i) => (
        <Reveal key={m.slug} delay={i * 80}>
          <ModelCard model={m} />
        </Reveal>
      ))}
    </div>
  </section>
);
