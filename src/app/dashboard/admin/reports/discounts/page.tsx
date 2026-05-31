"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Tag,
  TrendingDown,
  Users,
  Package,
  Loader2,
  RefreshCw,
  Download,
  Calendar,
  Percent,
  ShoppingCart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

type Summary = {
  from: string;
  to: string;
  total_discount_given: number;
  total_orders_in_range: number;
  total_orders_with_discount: number;
  total_lines_with_discount: number;
  total_qty_discounted: number;
  avg_discount_per_order: number;
  adoption_rate: number;
  active_campaigns: number;
  total_campaigns_used: number;
};

type CampaignRow = {
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  total_discount: number;
  total_orders: number;
  total_lines: number;
  total_qty: number;
  unique_dealers: number;
};

type PartRow = {
  part_number: string;
  part_name: string;
  total_discount: number;
  total_qty: number;
  total_lines: number;
  unique_orders: number;
};

type DealerRow = {
  dealer_id: string;
  dealer_name: string;
  total_discount: number;
  total_orders: number;
  total_lines: number;
  total_qty: number;
};

type TrendPoint = {
  date: string;
  discount_given: number;
  orders: number;
  lines: number;
};

type Report = {
  summary: Summary;
  by_campaign: CampaignRow[];
  by_part: PartRow[];
  by_dealer: DealerRow[];
  trend: TrendPoint[];
};

function formatEGP(value: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  draft: "bg-white/5 text-white/50 border-[#2A2A2A]",
  paused: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ended: "bg-white/5 text-white/40 border-[#2A2A2A]",
  unknown: "bg-white/5 text-white/40 border-[#2A2A2A]",
};

export default function DiscountAnalyticsDashboard() {
  const [from, setFrom] = useState(daysAgoIso(90));
  const [to, setTo] = useState(todayIso());
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/reports/discounts?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Failed to load report");
      }
      const body = await res.json();
      setReport(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const setPreset = (days: number) => {
    setFrom(daysAgoIso(days));
    setTo(todayIso());
  };

  const handleExport = () => {
    if (!report) return;
    const rows: string[] = [];
    rows.push("Section,Key,Value");
    rows.push(`Summary,Date Range,${report.summary.from} to ${report.summary.to}`);
    rows.push(`Summary,Total Discount Given (EGP),${report.summary.total_discount_given}`);
    rows.push(`Summary,Total Orders in Range,${report.summary.total_orders_in_range}`);
    rows.push(`Summary,Orders With Discount,${report.summary.total_orders_with_discount}`);
    rows.push(`Summary,Adoption Rate,${(report.summary.adoption_rate * 100).toFixed(2)}%`);
    rows.push(`Summary,Avg Discount Per Order (EGP),${report.summary.avg_discount_per_order}`);
    rows.push("");
    rows.push("By Campaign,Campaign,Status,Total Discount,Orders,Lines,Qty,Unique Dealers");
    for (const c of report.by_campaign) {
      rows.push(
        `,${c.campaign_name},${c.campaign_status},${c.total_discount},${c.total_orders},${c.total_lines},${c.total_qty},${c.unique_dealers}`
      );
    }
    rows.push("");
    rows.push("By Part,Part Number,Part Name,Total Discount,Qty,Lines,Orders");
    for (const p of report.by_part) {
      rows.push(
        `,${p.part_number},"${p.part_name.replace(/"/g, '""')}",${p.total_discount},${p.total_qty},${p.total_lines},${p.unique_orders}`
      );
    }
    rows.push("");
    rows.push("By Dealer,Dealer ID,Dealer Name,Total Discount,Orders,Lines,Qty");
    for (const d of report.by_dealer) {
      rows.push(
        `,${d.dealer_id},"${d.dealer_name.replace(/"/g, '""')}",${d.total_discount},${d.total_orders},${d.total_lines},${d.total_qty}`
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `discount-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartCampaigns = useMemo(() => {
    if (!report) return [];
    return report.by_campaign.slice(0, 8).map((c) => ({
      name: c.campaign_name.length > 22 ? c.campaign_name.slice(0, 22) + "…" : c.campaign_name,
      discount: c.total_discount,
      orders: c.total_orders,
    }));
  }, [report]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin/reports">
            <Button variant="ghost" size="icon" className="text-white/50 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
              <Tag className="h-6 w-6 text-emerald-400" />
              Discount Analytics
            </h1>
            <p className="mt-1 text-sm text-white/40">
              Campaign-based discounts across orders, campaigns, parts, and dealers.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={!report || loading}
            onClick={handleExport}
            className="border-[#2A2A2A] bg-[#1A1A1A] text-white/60 hover:border-[#3A3A3A] hover:bg-[#1A1A1A] hover:text-white"
          >
            <Download className="me-2 h-4 w-4" /> Export CSV
          </Button>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-xs font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Date range controls */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Calendar className="h-4 w-4 text-white/40" />
            <label className="font-medium">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              max={to}
              className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-1.5 text-sm text-white"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <label className="font-medium">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              min={from}
              max={todayIso()}
              className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-1.5 text-sm text-white"
            />
          </div>
          <div className="flex items-center gap-1 ms-auto">
            {[
              { label: "7d", days: 7 },
              { label: "30d", days: 30 },
              { label: "90d", days: 90 },
              { label: "1y", days: 365 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => setPreset(p.days)}
                className="rounded-md border border-[#2A2A2A] bg-[#0D0D0D] px-2.5 py-1 text-[11px] font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white"
              >
                {p.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && !report ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-white/30" />
        </div>
      ) : !report ? (
        <div className="py-20 text-center text-white/40">No data available.</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={<TrendingDown className="h-5 w-5 text-emerald-400" />}
              label="Total Discount Given"
              value={formatEGP(report.summary.total_discount_given)}
              hint={`Across ${report.summary.total_lines_with_discount.toLocaleString()} line${report.summary.total_lines_with_discount === 1 ? "" : "s"}`}
              accent="emerald"
            />
            <KpiCard
              icon={<ShoppingCart className="h-5 w-5 text-sky-400" />}
              label="Orders With Discount"
              value={report.summary.total_orders_with_discount.toLocaleString()}
              hint={`of ${report.summary.total_orders_in_range.toLocaleString()} total orders`}
              accent="sky"
            />
            <KpiCard
              icon={<Percent className="h-5 w-5 text-violet-400" />}
              label="Adoption Rate"
              value={`${(report.summary.adoption_rate * 100).toFixed(1)}%`}
              hint="Orders receiving any discount"
              accent="violet"
            />
            <KpiCard
              icon={<Tag className="h-5 w-5 text-amber-400" />}
              label="Avg Discount / Order"
              value={formatEGP(report.summary.avg_discount_per_order)}
              hint={`${report.summary.total_campaigns_used} campaign${report.summary.total_campaigns_used === 1 ? "" : "s"} used`}
              accent="amber"
            />
          </div>

          {/* Trend chart */}
          <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
            <CardHeader className="border-b border-[#2A2A2A]">
              <CardTitle className="text-white">Daily Discount Trend</CardTitle>
              <p className="text-xs text-white/40">
                EGP discounted per day across the selected range.
              </p>
            </CardHeader>
            <CardContent className="p-4">
              {report.trend.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-white/30">
                  No discounted orders in this range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={report.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => d.slice(5)}
                      tick={{ fill: "#888", fontSize: 11 }}
                      stroke="#2A2A2A"
                    />
                    <YAxis
                      tickFormatter={formatCompact}
                      tick={{ fill: "#888", fontSize: 11 }}
                      stroke="#2A2A2A"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1A1A1A",
                        border: "1px solid #2A2A2A",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#fff" }}
                      formatter={((value: number, name: string) =>
                        name === "discount_given" ? [formatEGP(value), "Discount"] : [value, name]) as never
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="discount_given"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#10B981" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Campaigns chart */}
          <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
            <CardHeader className="border-b border-[#2A2A2A]">
              <CardTitle className="text-white">Top Campaigns by Discount Given</CardTitle>
              <p className="text-xs text-white/40">
                Showing top {chartCampaigns.length} campaign{chartCampaigns.length === 1 ? "" : "s"} by total EGP discounted.
              </p>
            </CardHeader>
            <CardContent className="p-4">
              {chartCampaigns.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-white/30">
                  No campaign discounts in this range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartCampaigns} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis
                      type="number"
                      tickFormatter={formatCompact}
                      tick={{ fill: "#888", fontSize: 11 }}
                      stroke="#2A2A2A"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "#ccc", fontSize: 11 }}
                      width={140}
                      stroke="#2A2A2A"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1A1A1A",
                        border: "1px solid #2A2A2A",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={((value: number, name: string) =>
                        name === "discount" ? [formatEGP(value), "Discount"] : [value, "Orders"]) as never
                      }
                    />
                    <Bar dataKey="discount" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Campaigns table */}
          <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
            <CardHeader className="border-b border-[#2A2A2A]">
              <CardTitle className="flex items-center gap-2 text-white">
                <Tag className="h-4 w-4 text-emerald-400" /> Campaign Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {report.by_campaign.length === 0 ? (
                <div className="py-12 text-center text-white/30">
                  No campaign discounts in this range.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                      <TableHead className="text-white/50">Campaign</TableHead>
                      <TableHead className="text-white/50">Status</TableHead>
                      <TableHead className="text-end text-white/50">Discount Given</TableHead>
                      <TableHead className="text-end text-white/50">Orders</TableHead>
                      <TableHead className="text-end text-white/50">Lines</TableHead>
                      <TableHead className="text-end text-white/50">Qty</TableHead>
                      <TableHead className="text-end text-white/50">Dealers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.by_campaign.map((c) => (
                      <TableRow key={c.campaign_id} className="border-[#2A2A2A]">
                        <TableCell>
                          <Link
                            href={`/dashboard/admin/campaigns/${c.campaign_id}`}
                            className="text-sm font-medium text-[#00BFA6] hover:underline"
                          >
                            {c.campaign_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`uppercase text-[10px] font-semibold ${
                              STATUS_COLORS[c.campaign_status] ?? STATUS_COLORS.unknown
                            }`}
                          >
                            {c.campaign_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end font-mono font-semibold text-emerald-400">
                          {formatEGP(c.total_discount)}
                        </TableCell>
                        <TableCell className="text-end text-white">{c.total_orders}</TableCell>
                        <TableCell className="text-end text-white/70">{c.total_lines}</TableCell>
                        <TableCell className="text-end text-white/70">{c.total_qty}</TableCell>
                        <TableCell className="text-end text-white/70">{c.unique_dealers}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top parts */}
            <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
              <CardHeader className="border-b border-[#2A2A2A]">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Package className="h-4 w-4 text-sky-400" /> Top Discounted Parts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {report.by_part.length === 0 ? (
                  <div className="py-12 text-center text-white/30">No discounted parts.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                        <TableHead className="text-white/50">Part</TableHead>
                        <TableHead className="text-end text-white/50">Discount</TableHead>
                        <TableHead className="text-end text-white/50">Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.by_part.slice(0, 10).map((p) => (
                        <TableRow key={p.part_number} className="border-[#2A2A2A]">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm text-white">{p.part_name}</span>
                              <span className="font-mono text-[11px] text-white/30">
                                {p.part_number}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-end font-mono font-semibold text-emerald-400">
                            {formatEGP(p.total_discount)}
                          </TableCell>
                          <TableCell className="text-end text-white/70">{p.total_qty}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Top dealers */}
            <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
              <CardHeader className="border-b border-[#2A2A2A]">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="h-4 w-4 text-violet-400" /> Top Dealers Using Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {report.by_dealer.length === 0 ? (
                  <div className="py-12 text-center text-white/30">No dealer activity.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                        <TableHead className="text-white/50">Dealer</TableHead>
                        <TableHead className="text-end text-white/50">Discount</TableHead>
                        <TableHead className="text-end text-white/50">Orders</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.by_dealer.slice(0, 10).map((d) => (
                        <TableRow key={d.dealer_id} className="border-[#2A2A2A]">
                          <TableCell className="text-sm text-white">{d.dealer_name}</TableCell>
                          <TableCell className="text-end font-mono font-semibold text-emerald-400">
                            {formatEGP(d.total_discount)}
                          </TableCell>
                          <TableCell className="text-end text-white/70">{d.total_orders}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent: "emerald" | "sky" | "violet" | "amber";
}) {
  const accentBg = {
    emerald: "bg-emerald-500/10",
    sky: "bg-sky-500/10",
    violet: "bg-violet-500/10",
    amber: "bg-amber-500/10",
  }[accent];

  return (
    <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`rounded-lg ${accentBg} p-2`}>{icon}</div>
        </div>
        <p className="mt-3 text-xs uppercase font-semibold tracking-wider text-white/40">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        <p className="mt-1 text-xs text-white/40">{hint}</p>
      </CardContent>
    </Card>
  );
}
