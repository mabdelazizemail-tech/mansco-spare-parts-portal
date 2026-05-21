import { Download, FileText } from "lucide-react";
import { usePortal, dealers } from "@/lib/portal-data";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Button } from "@/components/ui/button";

const outcomeTone = {
  "Converted": "bg-success/10 text-success border-success/30",
  "Saved": "bg-info/10 text-info border-info/30",
  "Backorder Requested": "bg-warning/10 text-warning border-warning/40",
  "Lost Sale": "bg-destructive/10 text-destructive border-destructive/30",
} as const;

const InquiriesLog = ({ adminMode = false }: { adminMode?: boolean }) => {
  const { inquiries, dealer, role } = usePortal();
  const data = (adminMode || role === "admin") ? inquiries : inquiries.filter((i) => i.dealerId === dealer.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">{adminMode ? "Reports" : "Commercial"}</p>
          <h1 className="display-lg">{adminMode ? "Inquiry Report" : "Inquiry Log"}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">All inquiries — converted, saved, back-ordered or lost.</p>
        </div>
        <Button variant="outline"><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Inquiry</th>
                <th>Part</th>
                <th>Qty</th>
                {(adminMode || role === "admin") && <th>Dealer</th>}
                <th>Date</th>
                <th>Outcome</th>
                <th>Reason / ETA</th>
              </tr>
            </thead>
            <tbody>
              {data.map((i) => {
                const d = dealers.find((x) => x.id === i.dealerId);
                return (
                  <tr key={i.id}>
                    <td className="font-mono text-xs">{i.id}</td>
                    <td>
                      <p className="font-medium leading-tight">{i.name}</p>
                      <p className="text-[11px] text-muted-foreground">SKU {i.sku}</p>
                    </td>
                    <td>{i.qty}</td>
                    {(adminMode || role === "admin") && <td className="text-xs">{d?.code}<p className="text-muted-foreground">{d?.name}</p></td>}
                    <td className="text-xs text-muted-foreground">{i.createdAt}</td>
                    <td><StatusBadge tone={outcomeTone[i.outcome]}>{i.outcome}</StatusBadge></td>
                    <td className="text-xs text-muted-foreground">{i.reason ?? (i.etaDays ? `ETA ${i.etaDays} days` : "—")}</td>
                  </tr>
                );
              })}
              {data.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-muted-foreground"><FileText className="h-6 w-6 mx-auto mb-2" /> No inquiries.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InquiriesLog;
