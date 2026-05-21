import { useMemo, useState } from "react";
import { Search, Filter, Plus, Info, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  allParts, getStock, isItemPriceable, formatEGP, availabilityTone, campaigns,
  usePortal,
} from "@/lib/portal-data";
import { categories } from "@/lib/catalog";
import { StatusBadge } from "@/components/portal/StatusBadge";

const PartsInquiry = () => {
  const { addToCart, recordInquiry } = usePortal();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | "all">("all");
  const [availOnly, setAvailOnly] = useState(false);

  const filtered = useMemo(() => {
    return allParts.filter((p) => {
      if (cat !== "all" && p.categorySlug !== cat) return false;
      if (availOnly && getStock(p.sku).status === "No ETA") return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        p.sku.toLowerCase().includes(q) ||
        p.oem.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.fits.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [query, cat, availOnly]);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Catalog</p>
        <h1 className="display-lg">Parts Inquiry</h1>
        <p className="text-muted-foreground mt-1.5 text-sm max-w-2xl">
          Search by part number, OEM reference, description or vehicle. Stock, ETA and pricing are pulled from SAP — items without availability are intentionally hidden from pricing.
        </p>
      </div>

      {/* Filter bar */}
      <div className="panel p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SKU, OEM, description, vehicle…"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value as typeof cat)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={availOnly} onChange={(e) => setAvailOnly(e.target.checked)} className="accent-primary" />
          Availability only
        </label>

        <p className="text-xs text-muted-foreground ml-auto">{filtered.length} result{filtered.length === 1 ? "" : "s"}</p>
      </div>

      {/* Results table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Part</th>
                <th>OEM / Fits</th>
                <th>Stock</th>
                <th>ETA</th>
                <th className="text-right">Unit price</th>
                <th className="w-[1%]"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const s = getStock(p.sku);
                const priceable = isItemPriceable(p.sku);
                const campaign = campaigns.find((c) => c.status === "Active" && c.skus.includes(p.sku));
                return (
                  <tr key={p.sku}>
                    <td>
                      <div className="flex items-center gap-3">
                        <img src={p.image} alt="" className="h-12 w-12 rounded object-cover bg-muted shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium leading-tight line-clamp-1">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                            <ShieldCheck className="h-3 w-3 text-primary" /> SKU {p.sku}
                            {campaign && <span className="text-success font-semibold">· -{campaign.discountPct}% campaign</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs">
                      <p className="font-mono">{p.oem}</p>
                      <p className="text-muted-foreground line-clamp-1">{p.fits.slice(0, 2).join(", ")}{p.fits.length > 2 && " …"}</p>
                    </td>
                    <td>
                      <StatusBadge tone={availabilityTone[s.status]}>{s.status}</StatusBadge>
                      <p className="text-[11px] text-muted-foreground mt-1">{s.atp} ATP · {s.location}</p>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {s.etaDays ? `${s.etaDays} days` : s.status === "Available" ? "Now" : "—"}
                    </td>
                    <td className="text-right">
                      {priceable ? (
                        <div>
                          <p className="font-semibold">{formatEGP(p.price)}</p>
                          {campaign && <p className="text-[11px] text-success">net {formatEGP(p.price * (1 - campaign.discountPct / 100))}</p>}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Info className="h-3 w-3" /> Price withheld</span>
                      )}
                    </td>
                    <td className="text-right">
                      {priceable ? (
                        <Button size="sm" onClick={() => { addToCart(p.sku, 1); toast({ title: "Added to cart", description: p.name }); }}>
                          <Plus className="h-3.5 w-3.5" /> Add
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { recordInquiry(p.sku, 1, "Saved"); toast({ title: "Inquiry saved", description: "We'll notify you when ETA updates." }); }}>
                          Save Inquiry
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted-foreground py-12">No parts match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PartsInquiry;
