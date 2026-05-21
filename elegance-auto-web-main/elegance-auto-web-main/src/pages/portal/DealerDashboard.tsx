import { Link } from "react-router-dom";
import {
  TrendingUp, AlertTriangle, Wallet, Target, Megaphone, Truck, ArrowRight,
  ClipboardList, PackageX, Receipt, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePortal, formatEGP, statusTone, orderTypeMeta, campaigns } from "@/lib/portal-data";
import { StatusBadge, Dot } from "@/components/portal/StatusBadge";

const DealerDashboard = () => {
  const { dealer, orders, inquiries } = usePortal();
  const myOrders = orders.filter((o) => o.dealerId === dealer.id);
  const recent = myOrders.slice(0, 5);
  const openOrders = myOrders.filter((o) => !["Delivered", "Rejected"].includes(o.status));
  const backorders = myOrders.flatMap((o) => o.lines.filter((l) => l.status === "Backorder").map((l) => ({ order: o, line: l })));
  const lostSales = inquiries.filter((i) => i.dealerId === dealer.id && i.outcome === "Lost Sale");
  const targetPct = Math.min(100, Math.round((dealer.achievedMonthly / dealer.targetMonthly) * 100));
  const creditUsedPct = Math.min(100, Math.round((dealer.outstanding / dealer.creditLimit) * 100));
  const activeCampaigns = campaigns.filter((c) => c.status === "Active");

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Dealer Workspace</p>
          <h1 className="display-lg">Welcome back, {dealer.contact.split(" ")[0]}</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {dealer.code} · {dealer.tier} · {dealer.city}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/portal/parts"><ClipboardList className="h-4 w-4" /> Parts Inquiry</Link>
          </Button>
          <Button asChild>
            <Link to="/portal/cart"><Plus className="h-4 w-4" /> New Order</Link>
          </Button>
        </div>
      </div>

      {/* Financial block alert */}
      {dealer.status !== "Active" && (
        <div className="panel p-4 border-destructive/40 bg-destructive/5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-destructive">Account on financial block</p>
            <p className="text-sm text-muted-foreground">
              Outstanding overdue balance: {formatEGP(dealer.overdue)}. New orders require admin approval until cleared.
            </p>
          </div>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Credit Usage"
          value={`${creditUsedPct}%`}
          sub={`${formatEGP(dealer.outstanding)} of ${formatEGP(dealer.creditLimit)}`}
          progress={creditUsedPct}
          tone={creditUsedPct > 85 ? "destructive" : creditUsedPct > 65 ? "warning" : "success"}
        />
        <KpiCard
          icon={<Target className="h-4 w-4" />}
          label="Monthly Target"
          value={`${targetPct}%`}
          sub={`${formatEGP(dealer.achievedMonthly)} of ${formatEGP(dealer.targetMonthly)}`}
          progress={targetPct}
          tone={targetPct >= 100 ? "success" : targetPct >= 70 ? "info" : "warning"}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Financial Covering"
          value={`${dealer.covering}%`}
          sub={dealer.overdue > 0 ? `Overdue ${formatEGP(dealer.overdue)}` : "All balances current"}
          progress={dealer.covering}
          tone={dealer.covering >= 90 ? "success" : dealer.covering >= 60 ? "warning" : "destructive"}
        />
        <KpiCard
          icon={<Truck className="h-4 w-4" />}
          label="Open Orders"
          value={String(openOrders.length)}
          sub={`${backorders.length} back-order line${backorders.length === 1 ? "" : "s"}`}
        />
      </div>

      {/* Two column grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="panel lg:col-span-2 overflow-hidden">
          <header className="flex items-center justify-between p-5 border-b border-[hsl(var(--hairline))]">
            <div>
              <h2 className="font-semibold">Recent Orders</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Submitted in the last 14 days</p>
            </div>
            <Link to="/portal/orders" className="text-xs font-medium text-primary inline-flex items-center gap-1 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </header>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Type</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th className="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-10">No orders yet — start one from <Link className="text-primary hover:underline" to="/portal/parts">Parts Inquiry</Link>.</td></tr>
                )}
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/portal/orders/${o.id}`} className="font-medium hover:text-primary">{o.id}</Link>
                      <p className="text-xs text-muted-foreground">{o.lines.length} line{o.lines.length === 1 ? "" : "s"}</p>
                    </td>
                    <td><StatusBadge tone={orderTypeMeta[o.type].tone}>{o.type}</StatusBadge></td>
                    <td className="text-muted-foreground text-xs">{o.createdAt}</td>
                    <td><StatusBadge tone={statusTone[o.status]}><Dot className="pulse-dot" /> {o.status}</StatusBadge></td>
                    <td className="text-right font-semibold">{formatEGP(o.totalNet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          {/* Active campaigns */}
          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Active Campaigns</h2>
            </div>
            <ul className="space-y-3">
              {activeCampaigns.map((c) => (
                <li key={c.id} className="border border-[hsl(var(--hairline))] rounded-md p-3 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium leading-tight">{c.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">until {c.endDate}</p>
                    </div>
                    <span className="text-xs font-bold text-success">-{c.discountPct}%</span>
                  </div>
                </li>
              ))}
            </ul>
            <Link to="/portal/campaigns" className="text-xs font-medium text-primary inline-flex items-center gap-1 hover:underline mt-3">
              All campaigns <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Backorder watchlist */}
          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <PackageX className="h-4 w-4 text-warning" />
              <h2 className="font-semibold text-sm">Back Orders</h2>
            </div>
            {backorders.length === 0 && <p className="text-xs text-muted-foreground">No open back orders.</p>}
            <ul className="space-y-2">
              {backorders.slice(0, 4).map(({ order, line }) => (
                <li key={`${order.id}-${line.sku}`} className="text-xs">
                  <p className="font-medium line-clamp-1">{line.name}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {line.qty - line.qtyConfirmed} pcs · ETA {line.etaDays ? `${line.etaDays}d` : "—"} · {order.id}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Lost sale awareness */}
          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-4 w-4 text-info" />
              <h2 className="font-semibold text-sm">Inquiry Activity</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {inquiries.filter((i) => i.dealerId === dealer.id).length} inquiries logged this month · {lostSales.length} lost sale{lostSales.length === 1 ? "" : "s"}
            </p>
            <Link to="/portal/inquiries" className="text-xs font-medium text-primary inline-flex items-center gap-1 hover:underline mt-2">
              View log <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const toneClass = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  destructive: "text-destructive",
} as const;

const KpiCard = ({ icon, label, value, sub, progress, tone = "info" }: {
  icon: React.ReactNode; label: string; value: string; sub: string; progress?: number; tone?: keyof typeof toneClass;
}) => (
  <div className="stat-card">
    <div className="flex items-center justify-between">
      <p className="eyebrow">{label}</p>
      <span className={`${toneClass[tone]}`}>{icon}</span>
    </div>
    <p className="font-display text-3xl font-bold mt-2">{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    {progress !== undefined && (
      <Progress value={progress} className="h-1.5 mt-3" />
    )}
  </div>
);

export default DealerDashboard;
