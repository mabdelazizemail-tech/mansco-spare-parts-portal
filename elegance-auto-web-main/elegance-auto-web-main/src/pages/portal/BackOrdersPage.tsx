import { Link } from "react-router-dom";
import { PackageX, Clock } from "lucide-react";
import { usePortal, formatEGP } from "@/lib/portal-data";
import { StatusBadge } from "@/components/portal/StatusBadge";

const BackOrdersPage = () => {
  const { orders, dealer, role } = usePortal();
  const data = (role === "admin" ? orders : orders.filter((o) => o.dealerId === dealer.id))
    .flatMap((o) => o.lines.filter((l) => l.status === "Backorder").map((l) => ({ order: o, line: l })));

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Operations</p>
        <h1 className="display-lg">Back Orders</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Lines awaiting replenishment with current ETAs.</p>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Part</th>
                <th>Order</th>
                <th className="text-center">Pending qty</th>
                <th>ETA</th>
                <th className="text-right">Net value</th>
              </tr>
            </thead>
            <tbody>
              {data.map(({ order, line }) => (
                <tr key={`${order.id}-${line.sku}`}>
                  <td>
                    <p className="font-medium leading-tight">{line.name}</p>
                    <p className="text-[11px] text-muted-foreground">SKU {line.sku}</p>
                  </td>
                  <td><Link to={`/portal/orders/${order.id}`} className="hover:text-primary text-sm">{order.id}</Link></td>
                  <td className="text-center font-medium">{line.qty - line.qtyConfirmed}</td>
                  <td>
                    {line.etaDays ? (
                      <StatusBadge tone="bg-info/10 text-info border-info/30"><Clock className="h-3 w-3" /> {line.etaDays} days</StatusBadge>
                    ) : (
                      <StatusBadge tone="bg-destructive/10 text-destructive border-destructive/30">No ETA</StatusBadge>
                    )}
                  </td>
                  <td className="text-right font-semibold">{formatEGP((line.qty - line.qtyConfirmed) * line.unitPrice)}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground"><PackageX className="h-6 w-6 mx-auto mb-2" /> No open back orders.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BackOrdersPage;
