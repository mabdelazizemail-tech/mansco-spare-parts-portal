"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Download, TrendingDown, FileText, TrendingUp, Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { downloadCsv } from "@/lib/export-csv";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LostSale {
  id: string;
  dealer_id: string;
  part_number: string;
  quantity: number;
  reason: string;
  eta_if_available: string | null;
  estimated_value: number;
  created_at: string;
}

interface DealerInfo {
  id: string;
  code: string | null;
  company_name: string;
}

const reasonLabels: Record<string, string> = {
  partial_stock: "Partial Stock",
  out_of_stock: "Out of Stock",
  no_eta: "No ETA",
  credit_block: "Credit Block",
  quota_exceeded: "Quota Exceeded",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function LostSalesReportPage() {
  const { t } = useTranslation();
  const [lostSales, setLostSales] = useState<LostSale[]>([]);
  const [dealers, setDealers] = useState<DealerInfo[]>([]);
  const [summary, setSummary] = useState({ total: 0, estimated_lost_revenue: 0, dealers_reporting: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [lsRes, dealersRes] = await Promise.all([
        fetch("/api/lost-sales?limit=500"),
        fetch("/api/dealers").catch(() => null),
      ]);
      if (!lsRes.ok) throw new Error("Failed to load lost sales");
      const lsBody = await lsRes.json();
      setLostSales(lsBody.data ?? []);
      setSummary(lsBody.meta?.summary ?? { total: 0, estimated_lost_revenue: 0, dealers_reporting: 0 });
      if (dealersRes?.ok) {
        const dealersBody = await dealersRes.json();
        setDealers(dealersBody.data ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load lost sales");
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

  const handleExport = () => {
    downloadCsv(`lost-sales-report-${new Date().toISOString().slice(0, 10)}`, lostSales, [
      { header: "Date", value: (r) => r.created_at.slice(0, 10) },
      { header: "Dealer", value: (r) => dealerName(r.dealer_id) },
      { header: "Part Number", value: (r) => r.part_number },
      { header: "Quantity", value: (r) => r.quantity },
      { header: "Reason", value: (r) => reasonLabels[r.reason] ?? r.reason },
      { header: "ETA If Available", value: (r) => r.eta_if_available ?? "" },
      { header: "Estimated Value (EGP)", value: (r) => r.estimated_value },
    ]);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Lost Sales Report</h1>
          <p className="mt-1 text-sm text-white/40">Track lost revenue and identify demand gaps.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="border-[#2A2A2A] bg-[#1A1A1A] text-white/60 hover:border-[#3A3A3A] hover:bg-[#1A1A1A] hover:text-white"
          >
            <RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={lostSales.length === 0}
            className="border-[#2A2A2A] bg-[#1A1A1A] text-white/60 hover:border-[#3A3A3A] hover:bg-[#1A1A1A] hover:text-white"
          >
            <Download className="me-2 h-4 w-4" /> {t("common.export")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-red-500/10 p-3">
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{summary.total}</p>
              <p className="text-xs uppercase tracking-wider text-white/40">Lost Sales</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <FileText className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatCurrency(summary.estimated_lost_revenue)}</p>
              <p className="text-xs uppercase tracking-wider text-white/40">Est. Lost Revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{summary.dealers_reporting}</p>
              <p className="text-xs uppercase tracking-wider text-white/40">Dealers Reporting</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader>
          <CardTitle className="text-base text-white">Lost Sales Detail</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-white/30" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                  <TableHead className="font-semibold text-white/50">Date</TableHead>
                  <TableHead className="font-semibold text-white/50">Dealer</TableHead>
                  <TableHead className="font-semibold text-white/50">Part #</TableHead>
                  <TableHead className="font-semibold text-white/50">Qty</TableHead>
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
                    <TableCell className="text-white/70">{ls.quantity}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-[#2A2A2A] text-[10px] font-semibold uppercase text-white/60">
                        {reasonLabels[ls.reason] ?? ls.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end font-mono font-semibold text-red-400">
                      {ls.estimated_value > 0 ? formatCurrency(ls.estimated_value) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {lostSales.length === 0 && (
                  <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                    <TableCell colSpan={6} className="py-16 text-center text-white/30">
                      No lost sales logged yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
