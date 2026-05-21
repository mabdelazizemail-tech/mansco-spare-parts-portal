import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Truck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, formatPrice } from "@/lib/cart";
import { toast } from "@/hooks/use-toast";

const Cart = () => {
  const { items, subtotal, setQty, remove, clear } = useCart();

  useEffect(() => {
    document.title = "Cart — Peugeot Spare Parts";
  }, []);

  const shipping = items.length === 0 ? 0 : subtotal > 100 ? 0 : 6;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <section className="pt-40 pb-32 container-aura">
        <div className="max-w-md mx-auto text-center">
          <div className="h-16 w-16 mx-auto mb-6 grid place-items-center border border-[hsl(var(--hairline))]">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="display-md mb-4">Your cart is empty.</h1>
          <p className="text-muted-foreground mb-8">
            Browse the catalog or use the VIN finder to discover parts that fit your Peugeot.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link to="/catalog">Browse Catalog</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/vin-finder">VIN Finder</Link></Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="pt-32 md:pt-40 pb-10 container-aura">
        <p className="eyebrow mb-4">Your Order</p>
        <h1 className="display-lg text-balance">
          Cart <span className="text-primary">({items.length})</span>
        </h1>
      </section>

      <section className="container-aura grid gap-8 lg:grid-cols-[1.6fr_1fr] pb-24">
        <div className="border border-[hsl(var(--hairline))] divide-y divide-[hsl(var(--hairline))]">
          {items.map((item) => (
            <div key={item.sku} className="flex gap-4 p-5 sm:p-6">
              <Link to={`/part/${item.sku}`} className="shrink-0">
                <img src={item.image} alt={item.name} width={120} height={120} className="h-24 w-24 sm:h-28 sm:w-28 object-cover bg-[hsl(var(--surface))]" />
              </Link>
              <div className="flex-1 min-w-0 flex flex-col">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">SKU {item.sku}</p>
                <Link to={`/part/${item.sku}`} className="font-display text-sm sm:text-base font-bold uppercase leading-tight hover:text-primary transition-colors line-clamp-2">
                  {item.name}
                </Link>
                <div className="mt-auto pt-3 flex items-end justify-between gap-3">
                  <div className="flex items-center border border-[hsl(var(--hairline))] h-9">
                    <button onClick={() => setQty(item.sku, item.qty - 1)} className="h-full px-3 hover:bg-secondary" aria-label="Decrease">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-10 text-center text-sm font-bold">{item.qty}</span>
                    <button onClick={() => setQty(item.sku, item.qty + 1)} className="h-full px-3 hover:bg-secondary" aria-label="Increase">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold">{formatPrice(item.price * item.qty)}</p>
                    <button
                      onClick={() => { remove(item.sku); toast({ title: "Removed from cart" }); }}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors mt-1"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="p-4 flex justify-between items-center text-xs uppercase tracking-wider">
            <button onClick={() => { clear(); toast({ title: "Cart cleared" }); }} className="text-muted-foreground hover:text-destructive">
              Clear Cart
            </button>
            <Link to="/catalog" className="text-foreground hover:text-primary">Continue Shopping →</Link>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="border border-[hsl(var(--hairline))] bg-gradient-card p-6">
            <h2 className="font-display text-sm uppercase tracking-[0.2em] font-bold mb-5">Order Summary</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{shipping === 0 ? "Free" : formatPrice(shipping)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">VAT (14%)</dt><dd className="text-muted-foreground">Included</dd></div>
            </dl>
            <div className="border-t border-[hsl(var(--hairline))] mt-5 pt-5 flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
              <span className="font-display text-2xl font-bold">{formatPrice(total)}</span>
            </div>
            <Button size="lg" className="w-full mt-6" onClick={() => toast({ title: "Checkout coming soon", description: "Connect Lovable Cloud to enable orders." })}>
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="border border-[hsl(var(--hairline))] p-5 bg-[hsl(var(--surface))] space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Truck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">Free Cairo delivery on orders over $100.</span>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">Every part backed by Peugeot warranty.</span>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
};

export default Cart;
