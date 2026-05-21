import { Link } from "react-router-dom";
import {
  TrendingUp, ShoppingBag, AlertTriangle, Receipt, PackageX, Megaphone, Users, ArrowRight,
} from "lucide-react";
import { usePortal, dealers, formatEGP, statusTone, orderTypeMeta, allParts } from "@/lib/portal-data";
import { StatusBadge, Dot } from "@/components/portal/StatusBadge";

const AdminDashboard = () => {
  const { orders, inquiries } = usePortal();

  const totalNet = orders.reduce((s, o) => s + o.totalNet, 0);
  const inReview = orders.filter((o) => o.status === "Under Review");
  const backorderLines = orders.flatMap((o) => o.lines.filter((l) => l.status === "Backorder"));
  const openInvoices = orders.filter((o) => o.invoice && o.invoice.status !== "Paid").reduce((s, o) => s + o.invoice!.amount, 0);
  const lostSales = inquiries.filter((i) => i.outcome === "Lost Sale");
  const lostValue = lostSales.reduce((s, i) => {
    const p = allParts.find((x) => x.sku === i.sku);
    return s + (p?.price ?? 0) * i.qty;
  }, 0);

  const targetTotal = dealers.reduce((s, d) => s + d.targetMonthly, 0);
  const achievedTotal = dealers.reduce((s, d) => s + d.achievedMonthly, 0);
  const targetPct = Math.round((achievedTotal / targetTotal) * 100);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Administrator</p>
        <h1 className="display-lg">Operational Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Network-wide visibility on orders, finance, demand and campaign performance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon={ShoppingBag} label="Orders (MTD)" value={String(orders.length)} sub={formatEGP(totalNet)} tone="info" />
        <Tile icon={AlertTriangle} label="Awaiting Review" value={String(inReview.length)} sub="Routed for admin decision" tone="warning" />
        <Tile icon={PackageX} label="Back-Order Lines" value={String(backorderLines.length)} sub="Across the network" tone="warning" />
        <Tile icon={Receipt} label="Open Receivables" value={formatEGP(openInvoices)} sub="Unpaid + overdue" tone="destructive" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="panel lg:col-span-2 overflow-hidden">
          <header className="p-5 border-b border-[hsl(var(--hairline))] flex items-center justify-between">
            <h2 className="font-semibold">Network Target Achievement</h2>
            <span className="text-xs text-muted-foreground">{targetPct}% overall</span>
          </header>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dealer</th>
                  <th>Tier</th>
                  <th>Target</th>
                  <th>Achieved</th>
                  <th>Coverage</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {dealers.map((d) => {
                  const pct = Math.round((d.achievedMonthly / d.targetMonthly) * 100);
                  return (
                    <tr key={d.id}>
                      <td>
                        <p className="font-medium">{d.name}</p>
                        <p className="text-[11px] text-muted-foreground">{d.code} · {d.city}</p>
                      </td>
                      <td className="text-xs">{d.tier}</td>
                      <td className="text-xs text-muted-foreground">{formatEGP(d.targetMonthly)}</td>
                      <td className="text-sm font-medium">{formatEGP(d.achievedMonthly)}</td>
                      <td>
                        <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${pct >= 100 ? "bg-success" : pct >= 70 ? "bg-info" : "bg-warning"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{pct}%</p>
                      </td>
                      <td>
                        {d.status !== "Active" && <StatusBadge tone="bg-destructive/10 text-destructive border-destructive/30">{d.status}</StatusBadge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-5">
            <header className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Approvals queue</h2>
              <Link to="/admin/approvals" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight className="h-3 w-3" /></Link>
            </header>
            {inReview.length === 0 && <p className="text-xs text-muted-foreground">All clear.</p>}
            <ul className="space-y-2.5">
              {inReview.slice(0, 3).map((o) => (
                <li key={o.id} className="text-xs">
                  <Link to={`/admin/orders/${o.id}`} className="font-medium hover:text-primary">{o.id}</Link>
                  <p className="text-muted-foreground mt-0.5">{o.reviewReason}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel p-5">
            <header className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm flex items-center gap-2"><PackageX className="h-4 w-4 text-destructive" /> Lost-sale exposure</h2>
              <Link to="/admin/reports/lost-sales" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Report <ArrowRight className="h-3 w-3" /></Link>
            </header>
            <p className="font-display text-2xl font-bold">{formatEGP(lostValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{lostSales.length} unfulfilled inquiries this month</p>
          </div>

          <div className="panel p-5">
            <header className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> Campaign uptake</h2>
              <Link to="/admin/campaigns" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Manage <ArrowRight className="h-3 w-3" /></Link>
            </header>
            <p className="text-xs text-muted-foreground">2 active · 1 planned · best performer: Q2 Filter Promotion</p>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="panel overflow-hidden">
        <header className="p-5 border-b border-[hsl(var(--hairline))] flex items-center justify-between">
          <h2 className="font-semibold">Latest network orders</h2>
          <Link to="/admin/orders" className="text-xs text-primary hover:underline inline-flex items-center gap-1">All orders <ArrowRight className="h-3 w-3" /></Link>
        </header>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Dealer</th>
                <th>Type</th>
                <th>Status</th>
                <th className="text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 6).map((o) => {
                const d = dealers.find((x) => x.id === o.dealerId);
                return (
                  <tr key={o.id}>
                    <td><Link to={`/admin/orders/${o.id}`} className="font-medium hover:text-primary">{o.id}</Link></td>
                    <td className="text-xs">{d?.code} <span className="text-muted-foreground">· {d?.name}</span></td>
                    <td><StatusBadge tone={orderTypeMeta[o.type].tone}>{o.type}</StatusBadge></td>
                    <td><StatusBadge tone={statusTone[o.status]}><Dot className="pulse-dot" /> {o.status}</StatusBadge></td>
                    <td className="text-right font-semibold">{formatEGP(o.totalNet)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Tile = ({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub: string; tone: "info" | "warning" | "destructive" | "success" }) => {
  const c = { info: "text-info", warning: "text-warning", destructive: "text-destructive", success: "text-success" }[tone];
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        <Icon className={`h-4 w-4 ${c}`} />
      </div>
      <p className="font-display text-3xl font-bold mt-2">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
};

export default AdminDashboard;
