import { useEffect, useState } from "react";
import { Search, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Reveal } from "@/components/Reveal";
import { peugeotModels, categories } from "@/lib/catalog";
import { Link } from "react-router-dom";

const VinFinder = () => {
  const [vin, setVin] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = "VIN Finder — Peugeot Spare Parts";
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <section className="pt-32 md:pt-40 pb-10 container-aura">
        <Reveal>
          <p className="eyebrow mb-6">VIN Finder</p>
          <h1 className="display-lg text-balance max-w-3xl">
            Find the <span className="text-primary">exact part</span><br />
            for your Peugeot.
          </h1>
          <p className="mt-5 text-muted-foreground max-w-xl">
            Enter your 17-character Vehicle Identification Number — or pick your model and
            year — and we'll surface guaranteed-fit parts.
          </p>
        </Reveal>
      </section>

      <section className="container-aura grid gap-8 lg:grid-cols-[1.4fr_1fr] pb-24">
        <Reveal>
          <form onSubmit={onSubmit} className="bg-gradient-card border border-[hsl(var(--hairline))] p-8 md:p-10 space-y-6">
            <div>
              <label htmlFor="vin" className="text-xs uppercase tracking-[0.2em] font-semibold mb-2 block">
                Vehicle Identification Number (VIN)
              </label>
              <div className="flex items-center bg-background border border-[hsl(var(--hairline))] focus-within:border-primary">
                <Search className="h-4 w-4 text-muted-foreground ml-3" />
                <Input
                  id="vin"
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase().slice(0, 17))}
                  placeholder="VF3CCBHY6KW123456"
                  className="border-0 h-12 bg-transparent font-mono tracking-wider focus-visible:ring-0"
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Info className="h-3 w-3" /> Found on your registration card or door frame sticker.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 hairline" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Or</span>
              <div className="flex-1 hairline" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-semibold mb-2 block">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full h-12 bg-background border border-[hsl(var(--hairline))] px-3 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Select model</option>
                  {peugeotModels.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-semibold mb-2 block">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full h-12 bg-background border border-[hsl(var(--hairline))] px-3 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Select year</option>
                  {Array.from({ length: 16 }, (_, i) => 2026 - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full sm:w-auto">Find Parts</Button>
          </form>

          {submitted && (
            <div className="mt-8 border border-primary/40 bg-primary/5 p-6 fade-in-up">
              <p className="eyebrow mb-3 text-primary">Vehicle Identified</p>
              <h3 className="font-display text-xl font-bold uppercase mb-2">
                {model || "Peugeot 3008"} {year || "2022"}
              </h3>
              <p className="text-sm text-muted-foreground mb-5">
                We've matched your vehicle to {categories.length} categories of compatible parts. Browse below to start ordering.
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {categories.slice(0, 6).map((c) => (
                  <Link
                    key={c.slug}
                    to={`/catalog/${c.slug}`}
                    className="flex items-center justify-between px-4 py-3 bg-background border border-[hsl(var(--hairline))] text-sm hover:border-primary hover:text-primary transition-colors"
                  >
                    {c.name}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Reveal>

        <Reveal delay={120}>
          <div className="border border-[hsl(var(--hairline))] p-6 bg-[hsl(var(--surface))] space-y-6">
            <div>
              <h3 className="font-display text-base uppercase font-bold mb-3">Why VIN matters</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The same Peugeot model can ship with different engine, trim and option codes —
                meaning brake discs, sensors and even filters vary between cars. Your VIN
                eliminates the guesswork.
              </p>
            </div>
            <div className="hairline" />
            <div>
              <h3 className="font-display text-base uppercase font-bold mb-3">Where to find it</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Vehicle registration card</li>
                <li>• Driver-side door frame sticker</li>
                <li>• Bottom-left corner of windshield</li>
                <li>• Service booklet, page one</li>
              </ul>
            </div>
            <div className="hairline" />
            <div>
              <h3 className="font-display text-base uppercase font-bold mb-3">Need help?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Call our parts specialists on 16404 — Sunday to Thursday, 9am – 7pm.
              </p>
              <Link to="/contact" className="text-xs uppercase tracking-[0.2em] text-primary hover:underline">
                Or message us →
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
};

export default VinFinder;
