import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { getModel } from "@/lib/models";

const ModelDetail = () => {
  const { slug } = useParams();
  const model = slug ? getModel(slug) : undefined;
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (model) document.title = `${model.name} — Aura Motors`;
  }, [model]);

  if (!model) return <Navigate to="/models" replace />;

  return (
    <>
      {/* Hero */}
      <section className="relative h-[80vh] min-h-[560px] w-full overflow-hidden">
        <img
          src={model.image}
          alt={model.name}
          width={1280}
          height={800}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/30" />
        <div className="absolute inset-0 container-aura flex flex-col justify-end pb-16 md:pb-24">
          <Link
            to="/models"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-foreground/70 hover:text-primary transition-colors mb-6 fade-in-up"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Range
          </Link>
          <p className="eyebrow mb-4 fade-in-up">{model.category}</p>
          <h1 className="display-xl fade-in-up text-balance">{model.name}</h1>
          <p className="mt-4 text-lg text-foreground/80 fade-in-up">{model.tagline}</p>
        </div>
      </section>

      {/* Key features */}
      <section className="container-aura py-24 md:py-32">
        <Reveal className="mb-12">
          <p className="eyebrow mb-4">Key Features</p>
          <h2 className="display-md max-w-2xl">Designed around the driver.</h2>
        </Reveal>
        <div className="grid gap-px bg-[hsl(var(--hairline))] md:grid-cols-3 border border-[hsl(var(--hairline))]">
          {model.features.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <div className="bg-background p-8 h-full">
                <span className="font-display text-primary text-xs uppercase tracking-[0.25em]">
                  0{i + 1}
                </span>
                <h3 className="font-display text-xl font-bold uppercase mt-4 mb-3">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Specs */}
      <section className="bg-[hsl(var(--surface))] border-y border-[hsl(var(--hairline))]">
        <div className="container-aura py-24 md:py-32">
          <Reveal className="mb-12 grid md:grid-cols-2 gap-8 items-end">
            <div>
              <p className="eyebrow mb-4">Specifications</p>
              <h2 className="display-md">{model.startingPrice}.</h2>
            </div>
            <p className="text-muted-foreground max-w-md md:justify-self-end leading-relaxed">
              Real numbers. Real performance. Every figure benchmarked at independent
              European testing facilities.
            </p>
          </Reveal>
          <div className="grid gap-px bg-[hsl(var(--hairline))] sm:grid-cols-2 lg:grid-cols-3 border border-[hsl(var(--hairline))]">
            {model.specs.map((s) => (
              <div key={s.label} className="bg-background p-8 flex flex-col justify-between min-h-[140px]">
                <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {s.label}
                </span>
                <span className="font-display text-3xl md:text-4xl font-bold mt-4">
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="container-aura py-24 md:py-32">
        <Reveal className="mb-10 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="eyebrow mb-4">Gallery</p>
            <h2 className="display-md">Up close.</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActive((a) => (a - 1 + model.gallery.length) % model.gallery.length)}
              className="h-11 w-11 grid place-items-center border border-[hsl(var(--hairline))] hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActive((a) => (a + 1) % model.gallery.length)}
              className="h-11 w-11 grid place-items-center border border-[hsl(var(--hairline))] hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>

        <div className="relative aspect-[16/9] overflow-hidden bg-[hsl(var(--surface))] border border-[hsl(var(--hairline))]">
          {model.gallery.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${model.name} view ${i + 1}`}
              loading="lazy"
              width={1920}
              height={1080}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                i === active ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute bottom-4 left-4 flex gap-2">
            {model.gallery.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-1 transition-all ${i === active ? "w-10 bg-primary" : "w-6 bg-foreground/30"}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-aura pb-24 md:pb-32">
        <div className="border border-[hsl(var(--hairline))] p-10 md:p-16 bg-gradient-card text-center">
          <p className="eyebrow mb-4">Ready to drive?</p>
          <h3 className="display-md mb-8">Make the {model.name} yours.</h3>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="group">
              <Link to="/contact">
                Request a Quote
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/contact">Book Test Drive</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default ModelDetail;
