"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { downloadCsv } from "@/lib/export-csv";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Inquiry {
  id: string;
  dealer_id: string;
  part_number: string;
  quantity: number;
  inquiry_type: "search" | "order_attempt";
  availability_at_inquiry: string | null;
  converted_to_order_id: string | null;
  created_at: string;
}

interface DealerInfo {
  id: string;
  code: string | null;
  company_name: string;
}

const availabilityStyles: Record<string, string> = {
  AVAILABLE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  PARTIALLY_AVAILABLE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  NOT_AVAILABLE_WITH_ETA: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  NOT_AVAILABLE_NO_ETA: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function AdminInquiriesPage() {
  const { t } = useTranslation();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [dealers, setDealers] = useState<DealerInfo[]>([]);
  const [summary, setSummary] = useState({ total: 0, search: 0, order_attempt: 0, converted: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [inqRes, dealersRes] = await Promise.all([
        fetch("/api/inquiries?limit=500"),
        fetch("/api/dealers").catch(() => null),
      ]);
      if (!inqRes.ok) throw new Error("Failed to load inquiries");
      const inqBody = await inqRes.json();
      setInquiries(inqBody.data ?? []);
      setSummary(inqBody.meta?.summary ?? { total: 0, search: 0, order_attempt: 0, converted: 0 });
      if (dealersRes?.ok) {
        const dealersBody = await dealersRes.json();
        setDealers(dealersBody.data ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inquiries");
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
    downloadCsv(`inquiry-report-${new Date().toISOString().slice(0, 10)}`, inquiries, [
      { header: "Date", value: (r) => r.created_at.slice(0, 10) },
      { header: "Dealer", value: (r) => dealerName(r.dealer_id) },
      { header: "Part Number", value: (r) => r.part_number },
      { header: "Quantity", value: (r) => r.quantity },
      { header: "Type", value: (r) => r.inquiry_type },
      { header: "Availability", value: (r) => r.availability_at_inquiry ?? "" },
      { header: "Converted To Order", value: (r) => r.converted_to_order_id ?? "" },
    ]);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Inquiry Report</h1>
          <p className="mt-1 text-sm text-white/40">All dealer inquiries across the network.</p>
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
            disabled={inquiries.length === 0}
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
        {[
          { label: "Total Inquiries", value: summary.total, cls: "text-white" },
          { label: "Order Attempts", value: summary.order_attempt, cls: "text-blue-400" },
          { label: "Converted to Orders", value: summary.converted, cls: "text-emerald-400" },
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
        <CardHeader>
          <CardTitle className="text-base text-white">All Inquiries</CardTitle>
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
                  <TableHead className="font-semibold text-white/50">Type</TableHead>
                  <TableHead className="font-semibold text-white/50">Availability</TableHead>
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
                    <TableCell>
                      {inq.availability_at_inquiry ? (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold uppercase ${
                            availabilityStyles[inq.availability_at_inquiry] ?? "border-[#2A2A2A] text-white/50"
                          }`}
                        >
                          {inq.availability_at_inquiry.replaceAll("_", " ").toLowerCase()}
                        </Badge>
                      ) : (
                        <span className="text-xs text-white/30">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {inquiries.length === 0 && (
                  <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                    <TableCell colSpan={6} className="py-16 text-center text-white/30">
                      No inquiries logged yet.
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
