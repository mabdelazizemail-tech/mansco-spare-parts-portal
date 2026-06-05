"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  usePortal,
  formatEGP,
  statusTone,
  statusLabel,
  orderTypeMeta,
} from "@/lib/portal-data";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ShoppingCart,
  Search,
  CreditCard,
  Target,
  ShieldCheck,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { CampaignBanner } from "@/components/dashboard/campaign-banner";

/* ── KPI Card ── */
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  progress,
  tone = "info",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  progress?: number;
  tone?: string;
}) {
  const toneMap: Record<string, string> = {
    info: "text-blue-400 bg-blue-500/10",
    success: "text-green-400 bg-green-500/10",
    warning: "text-yellow-400 bg-yellow-500/10",
    destructive: "text-red-400 bg-red-500/10",
    accent: "text-purple-400 bg-purple-500/10",
    muted: "text-white/40 bg-white/5",
  };
  const iconClasses = toneMap[tone] ?? toneMap.info;

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm text-white/50">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {progress !== undefined && (
        <Progress value={progress} className="h-1.5" />
      )}
      {sub && <p className="text-xs text-white/40">{sub}</p>}
    </div>
  );
}

type ActiveCampaign = { id: string; name: string; end_date: string; discountLabel: string | null };

export default function DealerDashboard() {
  const router = useRouter();
  const { dealer, orders: myOrders, stats, inquiries } = usePortal();
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<ActiveCampaign[]>([]);

  useEffect(() => {
    const supabase = createClient();
    // getSession() reads from local cache — no network round-trip, no flash
    supabase.auth.getSession().then(({ data: { session } }) => {
      const name = session?.user?.user_metadata?.company_name ?? "";
      setCompanyName(name || dealer.name);
    });
  }, [dealer.name]);

  // Live active campaigns targeted to this dealer.
  useEffect(() => {
    fetch("/api/campaigns/active")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body) => setCampaigns(body.data ?? []))
      .catch(() => setCampaigns([]));
  }, []);

  const recentOrders = myOrders.slice(0, 5);
  const openOrders = myOrders.filter(
    (o) => !["done", "delivered", "rejected"].includes(o.status)
  ).length;
  const backOrders = myOrders.filter((o) => o.status === "backordered").length;

  const creditUsedPct = stats.creditLimit
    ? Math.round((stats.creditUsed / stats.creditLimit) * 100)
    : 0;

  const financialBlocked = dealer.financialStatus === "blocked";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {companyName === null ? (
              <span className="inline-block h-7 w-56 animate-pulse rounded-md bg-white/10" />
            ) : (
              <>Welcome back, {companyName}</>
            )}
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Dealer Code: <span className="font-mono text-white/60">{dealer.code}</span>
            {" · "}
            {dealer.branch}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/dashboard/parts")}
          >
            <Search className="h-4 w-4" /> Search Parts
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-[#00BFA6] hover:bg-[#00A892]"
            onClick={() => router.push("/dashboard/orders/new")}
          >
            <ShoppingCart className="h-4 w-4" /> New Order
          </Button>
        </div>
      </div>

      {/* ── Featured Campaign Banner ── */}
      <CampaignBanner />

      {/* ── Financial Block Alert ── */}
      {financialBlocked && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-400">
              Financial Block Active
            </p>
            <p className="text-xs text-red-400/70">
              Your account has an overdue balance of {formatEGP(dealer.overdueBalance)}. New orders require admin approval.
            </p>
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={CreditCard}
          label="Credit Usage"
          value={formatEGP(stats.creditUsed)}
          sub={`of ${formatEGP(stats.creditLimit)} limit`}
          progress={creditUsedPct}
          tone={creditUsedPct > 80 ? "destructive" : creditUsedPct > 60 ? "warning" : "success"}
        />
        <KpiCard
          icon={Target}
          label="Revenue (MTD)"
          value={formatEGP(stats.monthlyRevenue)}
          sub="No target set"
          tone="info"
        />
        <KpiCard
          icon={ShieldCheck}
          label="Financial Covering"
          value={formatEGP(stats.availableCredit)}
          sub={dealer.overdueBalance > 0 ? `Overdue: ${formatEGP(dealer.overdueBalance)}` : "No overdue balance"}
          tone={dealer.overdueBalance > 0 ? "warning" : "success"}
        />
        <KpiCard
          icon={Package}
          label="Open Orders"
          value={String(openOrders)}
          sub={`${backOrders} back-ordered`}
          tone="info"
        />
      </div>

      {/* ── Two-Column Grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Recent Orders */}
        <div className="lg:col-span-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
            <h2 className="font-semibold text-white">Recent Orders</h2>
            <Link
              href="/dashboard/orders"
              className="text-xs text-[#00BFA6] hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Order</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => router.push(`/dashboard/orders/${o.id}`)}
                  >
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-white">
                      {o.orderNumber ?? o.id}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={orderTypeMeta[o.orderType]?.tone} label={orderTypeMeta[o.orderType]?.label} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={statusTone(o.status)} label={statusLabel(o.status)} />
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-white">
                      {formatEGP(o.totalAmount)}
                    </td>
                    <td className="px-5 py-3">
                      <ChevronRight className="h-4 w-4 text-white/20" />
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-white/30">
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Campaigns */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white text-sm">Active Campaigns</h3>
              <Link href="/dashboard/campaigns" className="text-xs text-[#00BFA6] hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {campaigns.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-[#2A2A2A] bg-[#111] p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10 text-[#00BFA6] text-xs font-bold shrink-0">
                    {c.discountLabel ?? "★"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{c.name}</p>
                    <p className="text-xs text-white/40">
                      Until {new Date(c.end_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && (
                <p className="py-4 text-center text-xs text-white/30">No active campaigns.</p>
              )}
            </div>
          </div>

          {/* Back Orders */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-400" /> Back Orders
              </h3>
              <Link href="/dashboard/backorders" className="text-xs text-[#00BFA6] hover:underline">
                View all
              </Link>
            </div>
            <p className="text-3xl font-bold text-white">{backOrders}</p>
            <p className="text-xs text-white/40 mt-1">items pending fulfillment</p>
          </div>

          {/* Inquiry Activity */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-400" /> Inquiry Activity
              </h3>
              <Link href="/dashboard/inquiries" className="text-xs text-[#00BFA6] hover:underline">
                View log
              </Link>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-2xl font-bold text-white">{inquiries.length}</p>
                <p className="text-xs text-white/40">Total searches</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {inquiries.filter((i) => i.inquiryType === "order_attempt").length}
                </p>
                <p className="text-xs text-white/40">Order attempts</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
