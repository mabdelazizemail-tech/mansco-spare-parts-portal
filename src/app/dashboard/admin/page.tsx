"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Shield,
  ShoppingCart,
  Clock,
  AlertTriangle,
  Banknote,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Dealer = {
  id: string;
  code: string | null;
  company_name: string;
  branch_address: string | null;
  financial_status: string | null;
  credit_limit: number | null;
};

type Order = {
  id: string;
  order_number: string;
  dealer_id: string;
  order_type: string;
  status: string;
  submitted_at: string;
  total_amount: number;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const statusStyles: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  under_review: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial: "bg-orange-50 text-orange-700 border-orange-200",
  back_ordered: "bg-purple-50 text-purple-700 border-purple-200",
  invoiced: "bg-cyan-50 text-cyan-700 border-cyan-200",
  shipped: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

interface TileProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  sub?: string;
  trend?: number;
}

function Tile({ label, value, icon, accent = "bg-blue-100 text-blue-700", sub, trend }: TileProps) {
  return (
    <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111] overflow-hidden">
      <CardContent className="flex items-center gap-5 p-6">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${accent}`}>
          <span className="[&_svg]:h-7 [&_svg]:w-7">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
            {label}
          </p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight text-white truncate">
            {value}
          </p>
          {trend !== undefined ? (
            <div
              className={`mt-1 flex items-center gap-1 text-sm font-semibold ${
                trend >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {trend >= 0 ? "+" : ""}
                {trend.toFixed(1)}%
              </span>
            </div>
          ) : sub ? (
            <p className="mt-1 text-xs text-white/40">{sub}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/dealers").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/orders?admin_view=true&limit=200").then((r) =>
        r.ok ? r.json() : { data: [] }
      ),
    ])
      .then(([dealersBody, ordersBody]) => {
        setDealers(dealersBody.data ?? []);
        setOrders(ordersBody.data ?? []);
      })
      .catch(() => {
        setDealers([]);
        setOrders([]);
      });
  }, []);

  // Build dealer name lookup (id or code -> name)
  const dealerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    dealers.forEach((d) => {
      if (d.id) map.set(d.id, d.company_name);
      if (d.code) map.set(d.code, d.company_name);
    });
    return map;
  }, [dealers]);

  const getDealerName = (dealerId: string) => dealerNameMap.get(dealerId) ?? dealerId;

  // Calculate real KPIs from orders
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const mtdOrders = orders.filter((o) => new Date(o.submitted_at) >= monthStart);
    const prevMonthOrders = orders.filter((o) => {
      const d = new Date(o.submitted_at);
      return d >= prevMonthStart && d <= prevMonthEnd;
    });

    const pendingOrders = orders.filter(
      (o) => o.status === "submitted" || o.status === "under_review"
    );
    const backorderOrders = orders.filter(
      (o) => o.status === "back_ordered" || o.status === "partial"
    );
    const monthlyRevenue = mtdOrders
      .filter((o) => o.status !== "rejected" && o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const prevMonthRevenue = prevMonthOrders
      .filter((o) => o.status !== "rejected" && o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // % change vs previous month
    const ordersTrend =
      prevMonthOrders.length > 0
        ? ((mtdOrders.length - prevMonthOrders.length) / prevMonthOrders.length) * 100
        : undefined;
    const revenueTrend =
      prevMonthRevenue > 0
        ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
        : undefined;

    return {
      mtdOrders: mtdOrders.length,
      pending: pendingOrders.length,
      backorders: backorderOrders.length,
      monthlyRevenue,
      pendingList: pendingOrders.slice(0, 3),
      ordersTrend,
      revenueTrend,
    };
  }, [orders]);

  const latestOrders = orders.slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
          <Shield className="h-6 w-6 text-[#00A3E0]" />
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Network overview, exceptions, and operational KPIs.
        </p>
      </div>

      {/* KPI Tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Orders (MTD)"
          value={stats.mtdOrders}
          icon={<ShoppingCart />}
          accent="bg-blue-100 text-blue-700"
          trend={stats.ordersTrend}
          sub="Month-to-date"
        />
        <Tile
          label="Awaiting Review"
          value={stats.pending}
          icon={<Clock />}
          accent="bg-amber-100 text-amber-700"
          sub="Submitted or under review"
        />
        <Tile
          label="Back-Order / Partial"
          value={stats.backorders}
          icon={<AlertTriangle />}
          accent="bg-purple-100 text-purple-700"
          sub="Requires attention"
        />
        <Tile
          label="Monthly Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={<Banknote />}
          accent="bg-emerald-100 text-emerald-700"
          trend={stats.revenueTrend}
          sub="MTD, excludes rejected"
        />
      </div>

      {/* Two-column: Network Target Achievement + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dealers list */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Dealer Network</CardTitle>
            <Link href="/dashboard/admin/dealers">
              <Button variant="ghost" size="sm" className="text-xs">
                View All <ChevronRight className="ms-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-40">Credit Used</TableHead>
                  <TableHead className="text-end">Credit Limit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-white/40 py-8">
                      No dealers found
                    </TableCell>
                  </TableRow>
                ) : (
                  dealers.slice(0, 5).map((d) => {
                    // Calculate credit utilization from this dealer's active orders
                    const dealerOrders = orders.filter(
                      (o) =>
                        (o.dealer_id === d.id || o.dealer_id === d.code) &&
                        o.status !== "rejected" &&
                        o.status !== "cancelled"
                    );
                    const used = dealerOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
                    const limit = d.credit_limit ?? 0;
                    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-semibold">{d.company_name}</TableCell>
                        <TableCell className="text-sm text-[#6B6B6B]">
                          {d.branch_address ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`uppercase font-semibold ${
                              d.financial_status === "active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : d.financial_status === "blocked"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {d.financial_status ?? "unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-2 flex-1" />
                            <span className="text-xs font-semibold">{pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-end font-mono text-sm">
                          {formatCurrency(limit)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Approvals queue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm">Approvals Queue</CardTitle>
              <Link href="/dashboard/admin/approvals">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  {stats.pending} pending
                </Badge>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.pendingList.map((o) => (
                <Link
                  key={o.id}
                  href={`/dashboard/orders/${o.id}`}
                  className="flex items-center justify-between rounded-md border p-2.5 text-sm transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-mono text-xs font-semibold">{o.order_number}</p>
                    <p className="text-xs text-[#6B6B6B]">{getDealerName(o.dealer_id)}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(o.total_amount)}</p>
                </Link>
              ))}
              {stats.pending === 0 && (
                <p className="py-4 text-center text-xs text-[#6B6B6B]">
                  No pending approvals
                </p>
              )}
            </CardContent>
          </Card>

          {/* Active dealers count */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm">Active Dealers</CardTitle>
              <Link href="/dashboard/admin/dealers">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Manage
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">
                {dealers.filter((d) => d.financial_status === "active").length}
              </p>
              <p className="text-xs text-[#6B6B6B]">
                of {dealers.length} total dealer{dealers.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          {/* Credit at risk */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm">Blocked Dealers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">
                {dealers.filter((d) => d.financial_status === "blocked").length}
              </p>
              <p className="text-xs text-[#6B6B6B]">
                Credit blocks in effect
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Latest Network Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Latest Network Orders</CardTitle>
          <Link href="/dashboard/admin/orders">
            <Button variant="ghost" size="sm" className="text-xs">
              View All <ChevronRight className="ms-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Dealer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-end">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-white/40 py-8">
                    No orders yet
                  </TableCell>
                </TableRow>
              ) : (
                latestOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-mono text-xs font-semibold text-[#00A3E0] hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{getDealerName(order.dealer_id)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-xs">
                        {order.order_type.replace("_", "/")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-[#6B6B6B]">
                      {new Date(order.submitted_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`uppercase text-xs font-semibold ${
                          statusStyles[order.status] ?? ""
                        }`}
                      >
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end font-semibold">
                      {formatCurrency(order.total_amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
