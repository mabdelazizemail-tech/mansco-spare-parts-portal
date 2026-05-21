import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ChevronRight, Minus, Plus, ShieldCheck, ShoppingCart, Truck, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { getPart, parts } from "@/lib/catalog";
import { useCart, formatPrice } from "@/lib/cart";
import { toast } from "@/hooks/use-toast";
import { PartCard } from "@/components/PartCard";

const PartDetail = () => {
  const { sku } = useParams();
  const part = sku ? getPart(sku) : undefined;
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (part) document.title = `${part.name} — Peugeot Spare Parts`;
  }, [part]);

  if (!part) return <Navigate to="/catalog" replace />;

  const related = parts.filter((p) => p.categorySlug === part.categorySlug && p.sku !== part.sku).slice(0, 4);

  const handleAdd = () => {
    add(part, qty);
    toast({ title: "Added to cart", description: `${qty} × ${part.name}` });
  };

  return (
    <>
      <section className="pt-32 md:pt-36 pb-16 container-aura">
        <nav className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground mb-10 flex-wrap">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/catalog" className="hover:text-foreground">Catalog</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/catalog/${part.categorySlug}`} className="hover:text-foreground">{part.category}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground truncate max-w-[200px]">{part.sku}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="aspect-square bg-[hsl(var(--surface))] border border-[hsl(var(--hairline))] overflow-hidden">
              <img src={part.image} alt={part.name} width={1000} height={800} className="h-full w-full object-cover" />
            </div>
          </Reveal>

          <Reveal delay={120} className="flex flex-col">
            <p className="eyebrow mb-3">{part.category} · SKU {part.sku}</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold uppercase leading-tight tracking-tight mb-4">
              {part.name}
            </h1>
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] bg-primary/15 text-primary border border-primary/30 px-2.5 py-1">
                <ShieldCheck className="h-3 w-3" /> Genuine Peugeot
              </span>
              {part.inStock ? (
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> In stock
                </span>
              ) : (
                <span className="text-xs uppercase tracking-[0.18em] text-destructive">Backorder</span>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed mb-6">{part.description}</p>

            <div className="border-y border-[hsl(var(--hairline))] py-6 mb-6">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Price</p>
              <p className="font-display text-4xl font-bold mb-1">{formatPrice(part.price)}</p>
              <p className="text-xs text-muted-foreground">VAT included · {part.shipsIn}</p>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center border border-[hsl(var(--hairline))] h-12">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="h-full px-4 hover:bg-secondary transition-colors"
                  aria-label="Decrease"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-12 text-center font-display font-bold">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="h-full px-4 hover:bg-secondary transition-colors"
                  aria-label="Increase"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <Button size="lg" onClick={handleAdd} className="flex-1">
                <ShoppingCart className="h-4 w-4" /> Add to Cart
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="flex flex-col items-center text-center p-3 border border-[hsl(var(--hairline))]">
                <Truck className="h-4 w-4 text-primary mb-2" />
                <span className="uppercase tracking-wider text-muted-foreground">Fast Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 border border-[hsl(var(--hairline))]">
                <ShieldCheck className="h-4 w-4 text-primary mb-2" />
                <span className="uppercase tracking-wider text-muted-foreground">2-Yr Warranty</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 border border-[hsl(var(--hairline))]">
                <RotateCcw className="h-4 w-4 text-primary mb-2" />
                <span className="uppercase tracking-wider text-muted-foreground">30-Day Return</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Specs & Fits */}
      <section className="container-aura grid gap-8 lg:grid-cols-2 pb-24">
        <Reveal>
          <div className="border border-[hsl(var(--hairline))] bg-gradient-card">
            <div className="border-b border-[hsl(var(--hairline))] px-6 py-4">
              <h2 className="font-display text-sm uppercase tracking-[0.2em] font-bold">Specifications</h2>
            </div>
            <dl className="divide-y divide-[hsl(var(--hairline))]">
              <div className="flex justify-between px-6 py-3 text-sm">
                <dt className="text-muted-foreground uppercase tracking-wider text-xs">OEM Number</dt>
                <dd className="font-mono">{part.oem}</dd>
              </div>
              {part.specs.map((s) => (
                <div key={s.label} className="flex justify-between px-6 py-3 text-sm">
                  <dt className="text-muted-foreground uppercase tracking-wider text-xs">{s.label}</dt>
                  <dd className="font-medium">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="border border-[hsl(var(--hairline))] bg-gradient-card h-full">
            <div className="border-b border-[hsl(var(--hairline))] px-6 py-4">
              <h2 className="font-display text-sm uppercase tracking-[0.2em] font-bold">Compatible Models</h2>
            </div>
            <ul className="p-6 space-y-2">
              {part.fits.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="px-6 pb-6 pt-2">
              <Link to="/vin-finder" className="text-xs uppercase tracking-[0.2em] text-primary hover:underline">
                Verify with your VIN →
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="container-aura pb-24">
          <Reveal className="mb-8">
            <p className="eyebrow mb-3">You might also need</p>
            <h2 className="display-md">Related parts.</h2>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <PartCard key={p.sku} part={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
};

export default PartDetail;
