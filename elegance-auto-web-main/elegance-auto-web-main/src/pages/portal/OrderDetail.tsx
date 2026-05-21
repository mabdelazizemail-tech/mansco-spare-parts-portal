import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Truck, Receipt, CheckCircle2, Clock, AlertTriangle, Package, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  usePortal, formatEGP, statusTone, orderTypeMeta, dealers,
} from "@/lib/portal-data";
import { StatusBadge, Dot } from "@/components/portal/StatusBadge";

const lineToneMap = {
  Confirmed: "bg-success/10 text-success border-success/30",
  Backorder: "bg-warning/10 text-warning border-warning/40",
  Rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

const OrderDetail = () => {
  const { id } = useParams();
  const { orders, role, approveOrder, rejectOrder } = usePortal();
  const order = orders.find((o) => o.id === id);
  if (!order) return <div className="p-12 text-center text-muted-foreground">Order not found.</div>;
  const dealerInfo = dealers.find((d) => d.id === order.dealerId)!;
  const meta = orderTypeMeta[order.type];

  const timeline: { label: string; date?: string; done: boolean; icon: typeof Clock }[] = [
    { label: "Submitted", date: order.createdAt, done: true, icon: CheckCircle2 },
    { label: order.status === "Under Review" ? "Under review" : "Validated", date: order.createdAt, done: order.status !== "Submitted", icon: order.status === "Under Review" ? AlertTriangle : CheckCircle2 },
    { label: "Invoiced", date: order.invoice?.date, done: !!order.invoice, icon: Receipt },
    { label: "Shipped", date: order.shipment?.shippedAt, done: !!order.shipment?.shippedAt, icon: Truck },
    { label: "Delivered", date: order.shipment?.deliveredAt, done: !!order.shipment?.deliveredAt, icon: Package },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link to={role === "admin" ? "/admin/orders" : "/portal/orders"} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Back to orders
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display-md">{order.id}</h1>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <StatusBadge tone={meta.tone}>{order.type}</StatusBadge>
              <StatusBadge tone={statusTone[order.status]}><Dot className="pulse-dot" /> {order.status}</StatusBadge>
              <span className="text-muted-foreground">· Created {order.createdAt} · Requested {order.requestedDate}</span>
            </div>
          </div>
          {role === "admin" && order.status === "Under Review" && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { rejectOrder(order.id, "Rejected by ops"); toast({ title: "Order rejected" }); }}>
                Reject
              </Button>
              <Button onClick={() => { approveOrder(order.id); toast({ title: "Order approved" }); }}>
                Approve
              </Button>
            </div>
          )}
        </div>
      </div>

      {order.reviewReason && (
        <div className="panel p-4 border-warning/40 bg-warning/5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Pending admin review</p>
            <p className="text-sm text-muted-foreground">{order.reviewReason}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {/* Lines */}
          <div className="panel overflow-hidden">
            <header className="p-5 border-b border-[hsl(var(--hairline))]">
              <h2 className="font-semibold">Order lines</h2>
            </header>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th className="text-center">Requested</th>
                    <th className="text-center">Confirmed</th>
                    <th className="text-center">ETA</th>
                    <th>Line status</th>
                    <th className="text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((l) => {
                    const net = l.qtyConfirmed * l.unitPrice * (1 - (l.discountPct ?? 0) / 100);
                    return (
                      <tr key={l.sku}>
                        <td>
                          <p className="font-medium leading-tight">{l.name}</p>
                          <p className="text-[11px] text-muted-foreground">SKU {l.sku} · {formatEGP(l.unitPrice)}{l.discountPct && <span className="text-success ml-1">-{l.discountPct}%</span>}</p>
                        </td>
                        <td className="text-center">{l.qty}</td>
                        <td className="text-center font-medium">{l.qtyConfirmed}</td>
                        <td className="text-center text-xs text-muted-foreground">{l.etaDays ? `${l.etaDays}d` : "—"}</td>
                        <td><StatusBadge tone={lineToneMap[l.status]}>{l.status}</StatusBadge></td>
                        <td className="text-right font-semibold">{formatEGP(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="text-right text-muted-foreground py-3 px-4">Total net</td>
                    <td className="text-right font-bold py-3 px-4">{formatEGP(order.totalNet)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Shipment */}
          {order.shipment && (
            <div className="panel p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Shipment</h2>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <DLItem label="Carrier" value={order.shipment.carrier} />
                <DLItem label="Tracking / AWB" value={order.shipment.awb} mono />
                <DLItem label="Shipped" value={order.shipment.shippedAt ?? "—"} />
                <DLItem label="ETA / Delivered" value={order.shipment.deliveredAt ?? order.shipment.etaDate ?? "—"} />
              </dl>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="panel p-5">
            <h2 className="font-semibold mb-3 text-sm">Timeline</h2>
            <ul className="space-y-3.5">
              {timeline.map((t) => {
                const Icon = t.icon;
                return (
                  <li key={t.label} className="flex items-start gap-3 text-sm">
                    <div className={`h-7 w-7 rounded-full grid place-items-center shrink-0 ${t.done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className={`font-medium ${t.done ? "" : "text-muted-foreground"}`}>{t.label}</p>
                      {t.date && <p className="text-[11px] text-muted-foreground">{t.date}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {order.invoice && (
            <div className="panel p-5">
              <h2 className="font-semibold mb-3 text-sm flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Invoice</h2>
              <dl className="space-y-2 text-sm">
                <DLItem label="Number" value={order.invoice.number} mono />
                <DLItem label="Date" value={order.invoice.date} />
                <DLItem label="Amount" value={formatEGP(order.invoice.amount)} />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Status</span>
                  <StatusBadge tone={order.invoice.status === "Paid" ? "bg-success/10 text-success border-success/30" : order.invoice.status === "Overdue" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-info/10 text-info border-info/30"}>{order.invoice.status}</StatusBadge>
                </div>
              </dl>
            </div>
          )}

          <div className="panel p-5">
            <h2 className="font-semibold mb-3 text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Dealer</h2>
            <p className="font-medium text-sm">{dealerInfo.name}</p>
            <p className="text-xs text-muted-foreground">{dealerInfo.code} · {dealerInfo.tier} · {dealerInfo.city}</p>
            <p className="text-xs text-muted-foreground mt-2">{dealerInfo.contact} · {dealerInfo.email}</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

const DLItem = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</dd>
  </div>
);

export default OrderDetail;
