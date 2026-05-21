import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePortal, formatEGP, statusTone, orderTypeMeta, type OrderStatus, type OrderType } from "@/lib/portal-data";
import { StatusBadge, Dot } from "@/components/portal/StatusBadge";

const statuses: (OrderStatus | "All")[] = ["All", "Submitted", "Under Review", "Approved", "Partial", "Back Ordered", "Invoiced", "Shipped", "Delivered", "Rejected"];
const types: (OrderType | "All")[] = ["All", "Daily", "Air/DHL", "Stock"];

const OrdersList = () => {
  const { orders, dealer, role } = usePortal();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [type, setType] = useState<(typeof types)[number]>("All");

  const data = role === "admin" ? orders : orders.filter((o) => o.dealerId === dealer.id);

  const filtered = useMemo(() => data.filter((o) => {
    if (status !== "All" && o.status !== status) return false;
    if (type !== "All" && o.type !== type) return false;
    if (q && !o.id.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [data, q, status, type]);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Operations</p>
        <h1 className="display-lg">Orders</h1>
      </div>

      <div className="panel p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by order id…" className="pl-9" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "All")} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          {statuses.map((s) => <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as OrderType | "All")} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          {types.map((t) => <option key={t} value={t}>{t === "All" ? "All types" : t}</option>)}
        </select>
        <p className="text-xs text-muted-foreground ml-auto">{filtered.length} order{filtered.length === 1 ? "" : "s"}</p>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Type</th>
                <th>Created</th>
                <th>Requested</th>
                <th>Status</th>
                <th className="text-right">Net</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={role === "admin" ? `/admin/orders/${o.id}` : `/portal/orders/${o.id}`} className="font-medium hover:text-primary">{o.id}</Link>
                    <p className="text-[11px] text-muted-foreground">{o.lines.length} line{o.lines.length === 1 ? "" : "s"} · Dealer {o.dealerId}</p>
                  </td>
                  <td><StatusBadge tone={orderTypeMeta[o.type].tone}>{o.type}</StatusBadge></td>
                  <td className="text-xs text-muted-foreground">{o.createdAt}</td>
                  <td className="text-xs text-muted-foreground">{o.requestedDate}</td>
                  <td><StatusBadge tone={statusTone[o.status]}><Dot className="pulse-dot" /> {o.status}</StatusBadge></td>
                  <td className="text-right font-semibold">{formatEGP(o.totalNet)}</td>
                  <td className="text-right">
                    <Link to={role === "admin" ? `/admin/orders/${o.id}` : `/portal/orders/${o.id}`} className="text-primary hover:underline text-xs inline-flex items-center gap-1">
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted-foreground py-12">No orders match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrdersList;
