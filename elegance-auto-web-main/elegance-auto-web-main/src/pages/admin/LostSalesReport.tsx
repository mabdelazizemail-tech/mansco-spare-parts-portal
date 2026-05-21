import { Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePortal, dealers, allParts, formatEGP } from "@/lib/portal-data";
import { StatusBadge } from "@/components/portal/StatusBadge";

const LostSalesReport = () => {
  const { inquiries } = usePortal();
  const lost = inquiries.filter((i) => i.outcome === "Lost Sale");
  const value = lost.reduce((s, i) => {
    const p = allParts.find((x) => x.sku === i.sku);
    return s + (p?.price ?? 0) * i.qty;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Reports</p>
          <h1 className="display-lg">Lost Sales</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Demand we could not fulfil — by quantity, dealer and reason.</p>
        </div>
        <Button variant="outline"><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="panel p-5">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-display text-2xl font-bold">{formatEGP(value)}</p>
            <p className="text-xs text-muted-foreground">across {lost.length} unmet inquiries</p>
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Inquiry</th>
                <th>Part</th>
                <th>Qty</th>
                <th>Dealer</th>
                <th>Date</th>
                <th>Reason</th>
                <th className="text-right">Lost value</th>
              </tr>
            </thead>
            <tbody>
              {lost.map((i) => {
                const d = dealers.find((x) => x.id === i.dealerId);
                const p = allParts.find((x) => x.sku === i.sku);
                return (
                  <tr key={i.id}>
                    <td className="font-mono text-xs">{i.id}</td>
                    <td><p className="font-medium leading-tight">{i.name}</p><p className="text-[11px] text-muted-foreground">SKU {i.sku}</p></td>
                    <td>{i.qty}</td>
                    <td className="text-xs">{d?.code}<p className="text-muted-foreground">{d?.name}</p></td>
                    <td className="text-xs text-muted-foreground">{i.createdAt}</td>
                    <td className="text-xs text-muted-foreground">{i.reason ?? "—"}</td>
                    <td className="text-right font-semibold">{formatEGP((p?.price ?? 0) * i.qty)}</td>
                  </tr>
                );
              })}
              {lost.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No lost sales recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LostSalesReport;
