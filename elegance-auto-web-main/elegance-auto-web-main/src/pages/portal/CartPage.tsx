import { useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, ShoppingCart, ArrowRight, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  usePortal, allParts, getStock, formatEGP, orderTypeMeta, campaigns,
  availabilityTone, type OrderType,
} from "@/lib/portal-data";
import { StatusBadge } from "@/components/portal/StatusBadge";

const types: OrderType[] = ["Daily", "Air/DHL", "Stock"];

const CartPage = () => {
  const { cart, cartType, setCartType, updateCart, removeFromCart, clearCart, submitOrder, dealer } = usePortal();
  const nav = useNavigate();

  const lines = cart.map((l) => {
    const part = allParts.find((p) => p.sku === l.sku)!;
    const s = getStock(l.sku);
    const campaign = campaigns.find((c) => c.status === "Active" && c.skus.includes(l.sku));
    const discount = campaign?.discountPct ?? 0;
    const lineNet = part.price * l.qty * (1 - discount / 100);
    return { line: l, part, stock: s, campaign, discount, lineNet };
  });

  const subtotal = lines.reduce((s, x) => s + x.lineNet, 0);
  const overLimit = dealer.outstanding + subtotal > dealer.creditLimit;

  const handleSubmit = () => {
    if (cart.length === 0) return;
    const o = submitOrder();
    toast({
      title: `Order ${o.id} ${o.status === "Under Review" ? "sent for review" : "submitted"}`,
      description: o.reviewReason ?? `${o.lines.length} line${o.lines.length === 1 ? "" : "s"} · ${formatEGP(o.totalNet)}`,
    });
    nav(`/portal/orders/${o.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">New Order</p>
        <h1 className="display-lg">Cart & Order Submission</h1>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {types.map((t) => {
          const meta = orderTypeMeta[t];
          const active = cartType === t;
          return (
            <button
              key={t}
              onClick={() => setCartType(t)}
              className={`text-left panel p-5 transition-all ${active ? "border-primary ring-1 ring-primary" : "hover:border-primary/40"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold">{meta.label}</p>
                <StatusBadge tone={meta.tone}>{meta.eta}</StatusBadge>
              </div>
              <p className="text-xs text-muted-foreground">{meta.description}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="panel overflow-hidden">
          <header className="p-5 border-b border-[hsl(var(--hairline))] flex items-center justify-between">
            <h2 className="font-semibold">Order Lines ({cart.length})</h2>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-muted-foreground hover:text-destructive">Clear all</button>
            )}
          </header>

          {cart.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium mb-1">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mb-4">Browse the catalog to add parts.</p>
              <Button onClick={() => nav("/portal/parts")}>Open Parts Inquiry</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>Availability</th>
                    <th className="w-32">Qty</th>
                    <th className="text-right">Net</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(({ line, part, stock, campaign, lineNet }) => {
                    const willBackorder = line.qty > stock.atp;
                    return (
                      <tr key={line.sku}>
                        <td>
                          <div className="flex items-center gap-3">
                            <img src={part.image} alt="" className="h-12 w-12 rounded object-cover bg-muted shrink-0" />
                            <div>
                              <p className="font-medium leading-tight">{part.name}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">SKU {part.sku} · {formatEGP(part.price)}{campaign && <span className="text-success ml-1">-{campaign.discountPct}%</span>}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <StatusBadge tone={availabilityTone[stock.status]}>{stock.status}</StatusBadge>
                          <p className="text-[11px] text-muted-foreground mt-1">{stock.atp} ATP</p>
                        </td>
                        <td>
                          <div className="flex items-center border border-input rounded-md h-9 w-28">
                            <button onClick={() => updateCart(line.sku, line.qty - 1)} className="px-2 hover:bg-muted h-full" aria-label="Decrease"><Minus className="h-3 w-3" /></button>
                            <input
                              value={line.qty}
                              onChange={(e) => updateCart(line.sku, parseInt(e.target.value) || 1)}
                              className="flex-1 h-full text-center text-sm bg-transparent focus:outline-none"
                            />
                            <button onClick={() => updateCart(line.sku, line.qty + 1)} className="px-2 hover:bg-muted h-full" aria-label="Increase"><Plus className="h-3 w-3" /></button>
                          </div>
                          {willBackorder && (
                            <p className="text-[11px] text-warning mt-1">{line.qty - stock.atp} pcs → backorder</p>
                          )}
                        </td>
                        <td className="text-right font-semibold">{formatEGP(lineNet)}</td>
                        <td className="text-right">
                          <button onClick={() => removeFromCart(line.sku)} className="text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="panel p-5">
            <h2 className="font-semibold mb-4">Order Summary</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Order type</dt><dd className="font-medium">{orderTypeMeta[cartType].label}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Default ETA</dt><dd>{orderTypeMeta[cartType].eta}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Lines</dt><dd>{cart.length}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal (net)</dt><dd className="font-semibold">{formatEGP(subtotal)}</dd></div>
            </dl>

            <div className="border-t border-[hsl(var(--hairline))] my-4" />

            <p className="text-xs text-muted-foreground mb-1">Credit headroom</p>
            <p className="text-sm font-medium">
              {formatEGP(Math.max(0, dealer.creditLimit - dealer.outstanding))} available · {formatEGP(dealer.creditLimit)} limit
            </p>

            {overLimit && (
              <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-md flex items-start gap-2 text-xs">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <span>Order exceeds credit limit. It will be routed to admin review.</span>
              </div>
            )}

            <Button className="w-full mt-5" disabled={cart.length === 0} onClick={handleSubmit}>
              Submit Order <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="panel p-4 text-xs text-muted-foreground space-y-2">
            <div className="flex items-start gap-2"><Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /><span>SAP validates stock, pricing, eligibility and credit before confirming each line.</span></div>
            <div className="flex items-start gap-2"><Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /><span>Unavailable items without ETA are recorded as lost-sale candidates.</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CartPage;
