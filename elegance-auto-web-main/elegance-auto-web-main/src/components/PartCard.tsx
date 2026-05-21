import { Link } from "react-router-dom";
import { ShoppingCart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Part } from "@/lib/catalog";
import { useCart, formatPrice } from "@/lib/cart";
import { toast } from "@/hooks/use-toast";

export const PartCard = ({ part }: { part: Part }) => {
  const { add } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add(part);
    toast({ title: "Added to cart", description: part.name });
  };

  return (
    <Link
      to={`/part/${part.sku}`}
      className="group flex flex-col bg-gradient-card border border-[hsl(var(--hairline))] hover:border-primary/50 transition-colors duration-500"
    >
      <div className="relative aspect-square overflow-hidden bg-[hsl(var(--surface))]">
        <img
          src={part.image}
          alt={part.name}
          loading="lazy"
          width={1000}
          height={800}
          className="image-zoom h-full w-full object-cover"
        />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] bg-background/70 backdrop-blur px-2 py-1 border border-foreground/10">
          <ShieldCheck className="h-3 w-3 text-primary" /> Genuine
        </div>
        {!part.inStock && (
          <div className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.2em] bg-destructive/90 text-destructive-foreground px-2 py-1">
            Backorder
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
          {part.category} · {part.sku}
        </p>
        <h3 className="font-display text-base font-bold uppercase leading-tight mb-3 line-clamp-2 min-h-[2.5em]">
          {part.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">{part.shipsIn}</p>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Price</p>
            <p className="font-display text-xl font-bold text-foreground">
              {formatPrice(part.price)}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            className="px-3"
            aria-label={`Add ${part.name} to cart`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>
    </Link>
  );
};
