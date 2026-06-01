"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Download, TrendingDown, TrendingUp, FileText, Tag, Loader2, RefreshCw, ArrowUpRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { downloadCsv } from "@/lib/export-csv";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

type Order = { id: string; status: string; order_type: string; total_amount: number };
type Inquiry = { id: string; dealer_id: string; part_number: string; quantity: number; inquiry_type: string; availability_at_inquiry: string | null; created_at: string };
type LostSale = { id: string; dealer_id: string; part_number: string; quantity: number; reason: string; estimated_value: number; created_at: string };
type DealerInfo = { id: string; code: string | null; company_name: string };

const STATUS_COLORS: Record<string, string> = {
  submitted: "#3b82f6", under_review: "#eab308", approved: "#22c55e", rejected: "#ef4444",
  partial: "#f97316", back_ordered: "#a855f7", done: "#16a34a", invoiced: "#14b8a6",
  shipped: "#6366f1", delivered: "#10b981", cancelled: "#6b7280", pending_dealer_confirmation: "#f59e0b",
};
const ORDER_TYPE_LABEL: Record<string, string> = { daily: "Daily", air_dhl: "Air/DHL", stock: "Stock" };
const reasonLabels: Record<string, string> = {
  partial_stock: "Partial Stock", out_of_stock: "Out of Stock", no_eta: "No ETA",
  credit_block: "Credit Block", quota_exceeded: "Quota Exceeded",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function AdminReportsPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquirySummary, setInquirySummary] = useState({ total: 0, order_attempt: 0, converted: 0 });
  const [lostSales, setLostSales] = useState<LostSale[]>([]);
  const [lostSummary, setLostSummary] = useState({ total: 0, estimated_lost_revenue: 0, dealers_reporting: 0 });
  const [dealers, setDealers] = useState<DealerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Recent rows + exact summaries (summaries come from meta count-queries,
      // so limit=10 is enough for the previews here).
      const [ordersRes, inqRes, lsRes, dealersRes] = await Promise.all([
        fetch("/api/orders?limit=200"),
        fetch("/api/inquiries?limit=10"),
        fetch("/api/lost-sales?limit=10"),
        fetch("/api/dealers").catch(() => null),
      ]);
      if (!ordersRes.ok) throw new Error("Failed to load orders");
      setOrders((await ordersRes.json()).data ?? []);
      if (inqRes.ok) {
        const b = await inqRes.json();
        setInquiries(b.data ?? []);
        setInquirySummary(b.meta?.summary ?? { total: 0, order_attempt: 0, converted: 0 });
      }
      if (lsRes.ok) {
        const b = await lsRes.json();
        setLostSales(b.data ?? []);
        setLostSummary(b.meta?.summary ?? { total: 0, estimated_lost_revenue: 0, dealers_reporting: 0 });
      }
      if (dealersRes?.ok) setDealers((await dealersRes.json()).data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dealerName = useMemo(() => {
    const map = new Map<string, string>();
    dealers.forEach((d) => {
      if (d.id) map.set(d.id, d.company_name);
      if (d.code) map.set(d.code, d.company_name);
    });
    return (id: string) => map.get(id) ?? id;
  }, [dealers]);

  // Operational aggregates from live orders (capped at 200 — indicative).
  const ordersByStatus = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((o) => counts.set(o.status, (counts.get(o.status) ?? 0) + 1));
    return [...counts.entries()].map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] ?? "#6b7280" }));
  }, [orders]);

  const revenueByType = useMemo(() => {
    const sums = new Map<string, number>();
    orders.forEach((o) => {
      if (o.status === "rejected" || o.status === "cancelled") return;
      sums.set(o.order_type, (sums.get(o.order_type) ?? 0) + Number(o.total_amount));
    });
    return [...sums.entries()].map(([type, revenue]) => ({ type: ORDER_TYPE_LABEL[type] ?? type, revenue: Math.round(revenue) }));
  }, [orders]);

  const exportOperational = () => {
    downloadCsv(
      `operational-report-${new Date().toISOString().slice(0, 10)}`,
      [
        ...ordersByStatus.map((r) => ({ metric: "orders_by_status", key: r.name, value: r.value })),
        ...revenueByType.map((r) => ({ metric: "revenue_by_type", key: r.type, value: r.revenue })),
      ],
      [
        { header: "Metric", value: (r) => r.metric },
        { header: "Key", value: (r) => r.key },
        { header: "Value", value: (r) => r.value },
      ]
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{t("admin.reports")}</h1>
          <p className="mt-1 text-sm text-white/40">Operational analytics, inquiries, and lost-sales tracking.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="border-[#2A2A2A] bg-[#1A1A1A] text-white/60 hover:border-[#3A3A3A] hover:bg-[#1A1A1A] hover:text-white"
          >
            <RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Link href="/dashboard/admin/reports/discounts">
            <Button
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              <Tag className="me-2 h-4 w-4" /> Discount Analytics
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={exportOperational}
            disabled={orders.length === 0}
            className="border-[#2A2A2A] bg-[#1A1A1A] text-white/60 hover:border-[#3A3A3A] hover:bg-[#1A1A1A] hover:text-white"
          >
            <Download className="me-2 h-4 w-4" /> {t("common.export")}
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>
      ) : (
        <Tabs defaultValue="operational" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 border border-[#2A2A2A] bg-[#1A1A1A]">
            <TabsTrigger value="operational" className="text-white/60 data-[state=active]:bg-[#00BFA6]/10 data-[state=active]:text-[#00BFA6]">Operational</TabsTrigger>
            <TabsTrigger value="inquiries" className="text-white/60 data-[state=active]:bg-[#00BFA6]/10 data-[state=active]:text-[#00BFA6]">Inquiries</TabsTrigger>
            <TabsTrigger value="lost-sales" className="text-white/60 data-[state=active]:bg-[#00BFA6]/10 data-[state=active]:text-[#00BFA6]">Lost Sales</TabsTrigger>
          </TabsList>

          {/* OPERATIONAL */}
          <TabsContent value="operational" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
                <CardHeader><CardTitle className="text-base text-white">Orders by Status</CardTitle></CardHeader>
                <CardContent>
                  {ordersByStatus.length === 0 ? (
                    <p className="py-16 text-center text-sm text-white/30">No orders yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={95} dataKey="value" nameKey="name" paddingAngle={3}>
                          {ordersByStatus.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "#0D0D0D", border: "1px solid #2A2A2A", borderRadius: "8px", color: "#fff" }} labelStyle={{ color: "#fff" }} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
                <CardHeader><CardTitle className="text-base text-white">Revenue by Order Type</CardTitle></CardHeader>
                <CardContent>
                  {revenueByType.length === 0 ? (
                    <p className="py-16 text-center text-sm text-white/30">No revenue yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={revenueByType}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                        <XAxis dataKey="type" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.6)" }} stroke="#2A2A2A" />
                        <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }} stroke="#2A2A2A" />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0D0D0D", border: "1px solid #2A2A2A", borderRadius: "8px", color: "#fff" }}
                          labelStyle={{ color: "#fff" }}
                          cursor={{ fill: "rgba(255,255,255,0.05)" }}
                          formatter={((value: number) => formatCurrency(value)) as never}
                        />
                        <Bar dataKey="revenue" fill="#00BFA6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
            <p className="text-[11px] text-white/30">Aggregated over the most recent 200 orders.</p>
          </TabsContent>

          {/* INQUIRIES */}
          <TabsContent value="inquiries" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Total Inquiries", value: inquirySummary.total, cls: "text-white" },
                { label: "Order Attempts", value: inquirySummary.order_attempt, cls: "text-blue-400" },
                { label: "Converted to Orders", value: inquirySummary.converted, cls: "text-emerald-400" },
              ].map((c) => (
                <Card key={c.label} className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
                  <CardContent className="p-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{c.label}</p>
                    <p className={`mt-2 text-2xl font-bold ${c.cls}`}>{c.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base text-white">Recent Inquiries</CardTitle>
                <Link href="/dashboard/admin/reports/inquiries" className="flex items-center gap-1 text-xs text-[#00BFA6] hover:underline">
                  Full report <ArrowUpRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                      <TableHead className="font-semibold text-white/50">Date</TableHead>
                      <TableHead className="font-semibold text-white/50">Dealer</TableHead>
                      <TableHead className="font-semibold text-white/50">Part #</TableHead>
                      <TableHead className="font-semibold text-white/50">Qty</TableHead>
                      <TableHead className="font-semibold text-white/50">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inquiries.map((inq) => (
                      <TableRow key={inq.id} className="border-[#2A2A2A] transition hover:bg-white/[0.02]">
                        <TableCell className="text-sm text-white/70">{inq.created_at.slice(0, 10)}</TableCell>
                        <TableCell className="text-white">{dealerName(inq.dealer_id)}</TableCell>
                        <TableCell className="font-mono text-xs text-white/70">{inq.part_number}</TableCell>
                        <TableCell className="text-white/70">{inq.quantity}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-[#2A2A2A] text-[10px] font-semibold uppercase text-white/60">
                            {inq.inquiry_type === "order_attempt" ? "order attempt" : "search"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {inquiries.length === 0 && (
                      <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                        <TableCell colSpan={5} className="py-12 text-center text-white/30">No inquiries logged yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LOST SALES */}
          <TabsContent value="lost-sales" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-lg bg-red-500/10 p-3"><TrendingDown className="h-5 w-5 text-red-400" /></div>
                  <div><p className="text-2xl font-bold text-white">{lostSummary.total}</p><p className="text-xs uppercase tracking-wider text-white/40">Lost Sales</p></div>
                </CardContent>
              </Card>
              <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-lg bg-amber-500/10 p-3"><FileText className="h-5 w-5 text-amber-400" /></div>
                  <div><p className="text-2xl font-bold text-white">{formatCurrency(lostSummary.estimated_lost_revenue)}</p><p className="text-xs uppercase tracking-wider text-white/40">Est. Lost Revenue</p></div>
                </CardContent>
              </Card>
              <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-lg bg-emerald-500/10 p-3"><TrendingUp className="h-5 w-5 text-emerald-400" /></div>
                  <div><p className="text-2xl font-bold text-white">{lostSummary.dealers_reporting}</p><p className="text-xs uppercase tracking-wider text-white/40">Dealers Reporting</p></div>
                </CardContent>
              </Card>
            </div>
            <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base text-white">Recent Lost Sales</CardTitle>
                <Link href="/dashboard/admin/reports/lost-sales" className="flex items-center gap-1 text-xs text-[#00BFA6] hover:underline">
                  Full report <ArrowUpRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                      <TableHead className="font-semibold text-white/50">Date</TableHead>
                      <TableHead className="font-semibold text-white/50">Dealer</TableHead>
                      <TableHead className="font-semibold text-white/50">Part #</TableHead>
                      <TableHead className="font-semibold text-white/50">Reason</TableHead>
                      <TableHead className="text-end font-semibold text-white/50">Est. Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lostSales.map((ls) => (
                      <TableRow key={ls.id} className="border-[#2A2A2A] transition hover:bg-white/[0.02]">
                        <TableCell className="text-sm text-white/70">{ls.created_at.slice(0, 10)}</TableCell>
                        <TableCell className="text-white">{dealerName(ls.dealer_id)}</TableCell>
                        <TableCell className="font-mono text-xs text-white/70">{ls.part_number}</TableCell>
                        <TableCell className="text-sm text-white/60">{reasonLabels[ls.reason] ?? ls.reason}</TableCell>
                        <TableCell className="text-end font-mono font-semibold text-red-400">
                          {ls.estimated_value > 0 ? formatCurrency(ls.estimated_value) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {lostSales.length === 0 && (
                      <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                        <TableCell colSpan={5} className="py-12 text-center text-white/30">No lost sales logged yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
