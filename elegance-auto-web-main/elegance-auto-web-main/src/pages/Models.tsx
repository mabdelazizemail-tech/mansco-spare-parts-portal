import { useEffect } from "react";
import { models } from "@/lib/models";
import { ModelCard } from "@/components/ModelCard";
import { Reveal } from "@/components/Reveal";

const Models = () => {
  useEffect(() => {
    document.title = "Models — Aura Motors";
  }, []);

  return (
    <>
      <section className="pt-32 md:pt-40 pb-16 container-aura">
        <Reveal>
          <p className="eyebrow mb-6">Range · 2026</p>
          <h1 className="display-xl text-balance max-w-4xl">
            The complete<br />Aura <span className="text-primary">collection</span>.
          </h1>
          <p className="mt-6 text-muted-foreground max-w-xl">
            Four distinct silhouettes. One unified design language. Find the Aura that
            fits your way of moving.
          </p>
        </Reveal>
      </section>

      <section className="container-aura pb-24">
        <div className="grid gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m, i) => (
            <Reveal key={m.slug} delay={i * 80}>
              <ModelCard model={m} />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
};

export default Models;
