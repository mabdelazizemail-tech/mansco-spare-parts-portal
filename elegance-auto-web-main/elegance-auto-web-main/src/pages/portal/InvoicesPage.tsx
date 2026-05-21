import { Link } from "react-router-dom";
import { Receipt, Download } from "lucide-react";
import { usePortal, formatEGP } from "@/lib/portal-data";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Button } from "@/components/ui/button";

const InvoicesPage = () => {
  const { orders, dealer, role } = usePortal();
  const data = (role === "admin" ? orders : orders.filter((o) => o.dealerId === dealer.id))
    .filter((o) => o.invoice)
    .map((o) => ({ order: o, invoice: o.invoice! }));

  const open = data.filter((d) => d.invoice.status === "Open").reduce((s, d) => s + d.invoice.amount, 0);
  const overdue = data.filter((d) => d.invoice.status === "Overdue").reduce((s, d) => s + d.invoice.amount, 0);
  const paid = data.filter((d) => d.invoice.status === "Paid").reduce((s, d) => s + d.invoice.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Operations</p>
        <h1 className="display-lg">Invoices</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Open" amount={open} tone="info" />
        <Tile label="Overdue" amount={overdue} tone="destructive" />
        <Tile label="Paid (last 30d)" amount={paid} tone="success" />
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Order</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map(({ order, invoice }) => (
                <tr key={invoice.number}>
                  <td className="font-mono text-sm">{invoice.number}</td>
                  <td><Link to={`/portal/orders/${order.id}`} className="hover:text-primary">{order.id}</Link></td>
                  <td className="text-xs text-muted-foreground">{invoice.date}</td>
                  <td>
                    <StatusBadge tone={invoice.status === "Paid" ? "bg-success/10 text-success border-success/30" : invoice.status === "Overdue" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-info/10 text-info border-info/30"}>
                      {invoice.status}
                    </StatusBadge>
                  </td>
                  <td className="text-right font-semibold">{formatEGP(invoice.amount)}</td>
                  <td className="text-right">
                    <Button size="sm" variant="ghost"><Download className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No invoices yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Tile = ({ label, amount, tone }: { label: string; amount: number; tone: "info" | "destructive" | "success" }) => {
  const c = { info: "text-info", destructive: "text-destructive", success: "text-success" }[tone];
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        <Receipt className={`h-4 w-4 ${c}`} />
      </div>
      <p className="font-display text-2xl font-bold mt-2">{formatEGP(amount)}</p>
    </div>
  );
};

export default InvoicesPage;
