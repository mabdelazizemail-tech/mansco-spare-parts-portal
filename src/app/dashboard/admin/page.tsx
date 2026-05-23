"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  ShoppingCart,
  Clock,
  AlertTriangle,
  Banknote,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  Pencil,
  ChevronRight,
} from "lucide-react";
import {
  adminOrders,
  adminDashboardStats,
  campaigns,
  lostSales,
  formatCurrency,
} from "@/lib/mock-data";

type Dealer = {
  id: string;
  code: string | null;
  company_name: string;
  branch_address: string | null;
  financial_status: string | null;
  credit_limit: number | null;
};
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

const statusStyles: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  under_review: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial: "bg-orange-50 text-orange-700 border-orange-200",
  backordered: "bg-purple-50 text-purple-700 border-purple-200",
  invoiced: "bg-cyan-50 text-cyan-700 border-cyan-200",
  shipped: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

interface TileProps {
  label: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  accent?: string;
}

function Tile({ label, value, trend, icon, accent = "bg-blue-100 text-blue-700" }: TileProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`rounded-lg p-3 ${accent}`}>{icon}</div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
            {label}
          </p>
          <div className="mt-1 flex items-end justify-between">
            <p className="text-2xl font-bold text-white">{value}</p>
            {trend !== undefined && (
              <span
                className={`flex items-center gap-0.5 text-xs font-semibold ${
                  trend >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {trend >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {trend >= 0 ? "+" : ""}
                {trend}%
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const pendingOrders = adminOrders.filter((o) => o.status === "under_review");
const backorderLines = adminOrders.filter((o) => o.status === "backordered");
const lostRevenue = lostSales.reduce((s, l) => s + l.estimatedValue, 0);
const latestOrders = adminOrders.slice(0, 8);

export default function AdminDashboardPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);

  useEffect(() => {
    fetch("/api/dealers")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body) => setDealers(body.data ?? []))
      .catch(() => setDealers([]));
  }, []);

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
          value={adminDashboardStats.todaysOrders}
          trend={12.5}
          icon={<ShoppingCart className="h-5 w-5" />}
          accent="bg-blue-100 text-blue-700"
        />
        <Tile
          label="Awaiting Review"
          value={pendingOrders.length}
          icon={<Clock className="h-5 w-5" />}
          accent="bg-amber-100 text-amber-700"
        />
        <Tile
          label="Back-Order Lines"
          value={backorderLines.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="bg-purple-100 text-purple-700"
        />
        <Tile
          label="Monthly Revenue"
          value={formatCurrency(adminDashboardStats.monthlyRevenue)}
          trend={8.3}
          icon={<Banknote className="h-5 w-5" />}
          accent="bg-emerald-100 text-emerald-700"
        />
      </div>

      {/* Two-column: Network Target Achievement + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Network Target Achievement */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              Network Target Achievement
            </CardTitle>
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
                  <TableHead className="w-40">Target</TableHead>
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
                  dealers.map((d) => (
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
                          <Progress value={0} className="h-2 flex-1" />
                          <span className="text-xs font-semibold">—</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-end font-mono text-sm">
                        {formatCurrency(d.credit_limit ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))
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
                  {pendingOrders.length} pending
                </Badge>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingOrders.slice(0, 3).map((o) => (
                <Link
                  key={o.id}
                  href={`/dashboard/orders/${o.id}`}
                  className="flex items-center justify-between rounded-md border p-2.5 text-sm transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-mono text-xs font-semibold">{o.id}</p>
                    <p className="text-xs text-[#6B6B6B]">{o.dealerName}</p>
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(o.totalAmount)}
                  </p>
                </Link>
              ))}
              {pendingOrders.length === 0 && (
                <p className="py-4 text-center text-xs text-[#6B6B6B]">
                  No pending approvals
                </p>
              )}
            </CardContent>
          </Card>

          {/* Lost-sale exposure */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm">Lost-Sale Exposure</CardTitle>
              <Link href="/dashboard/admin/reports/lost-sales">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  View
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(lostRevenue)}
              </p>
              <p className="text-xs text-[#6B6B6B]">
                {lostSales.length} lost sale{lostSales.length !== 1 ? "s" : ""}{" "}
                this month
              </p>
            </CardContent>
          </Card>

          {/* Campaign uptake */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm">Campaign Uptake</CardTitle>
              <Link href="/dashboard/admin/campaigns">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Manage
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-[#000000]">
                {campaigns.length}
              </p>
              <p className="text-xs text-[#6B6B6B]">
                Active campaigns running
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
              {latestOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="font-mono text-xs font-semibold text-[#00A3E0] hover:underline"
                    >
                      {order.id}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{order.dealerName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase text-xs">
                      {order.orderType.replace("_", "/")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[#6B6B6B]">
                    {new Date(order.createdAt).toLocaleDateString("en-GB", {
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
                    {formatCurrency(order.totalAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
