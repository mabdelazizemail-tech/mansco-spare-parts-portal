"use client";

import { Download, TrendingDown, FileText, TrendingUp } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { lostSales, dealers, formatCurrency } from "@/lib/mock-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function LostSalesReportPage() {
  const { t } = useTranslation();
  const dealerName = (id: string) =>
    dealers.find((d) => d.id === id)?.name ?? id;

  const lostRevenue = lostSales.reduce((s, l) => s + l.estimatedValue, 0);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Lost Sales Report
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Track lost revenue and identify demand gaps.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-[#2A2A2A] bg-[#1A1A1A] text-white/60 hover:border-[#3A3A3A] hover:bg-[#1A1A1A] hover:text-white"
        >
          <Download className="me-2 h-4 w-4" /> {t("common.export")}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-red-500/10 p-3">
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {lostSales.length}
              </p>
              <p className="text-xs uppercase tracking-wider text-white/40">
                Lost Sales
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <FileText className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(lostRevenue)}
              </p>
              <p className="text-xs uppercase tracking-wider text-white/40">
                Est. Lost Revenue
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {new Set(lostSales.map((l) => l.dealerId)).size}
              </p>
              <p className="text-xs uppercase tracking-wider text-white/40">
                Dealers Reporting
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail table */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader>
          <CardTitle className="text-base text-white">Lost Sales Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                <TableHead className="text-white/50 font-semibold">Date</TableHead>
                <TableHead className="text-white/50 font-semibold">Dealer</TableHead>
                <TableHead className="text-white/50 font-semibold">Part #</TableHead>
                <TableHead className="text-white/50 font-semibold">Customer</TableHead>
                <TableHead className="text-white/50 font-semibold">Reason</TableHead>
                <TableHead className="text-end text-white/50 font-semibold">Est. Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lostSales.map((ls) => (
                <TableRow
                  key={ls.id}
                  className="border-[#2A2A2A] transition hover:bg-white/[0.02]"
                >
                  <TableCell className="text-sm text-white/70">
                    {ls.createdAt.slice(0, 10)}
                  </TableCell>
                  <TableCell className="text-white">{dealerName(ls.dealerId)}</TableCell>
                  <TableCell className="font-mono text-xs text-white/70">
                    {ls.partNumber}
                  </TableCell>
                  <TableCell className="text-white">{ls.customerName}</TableCell>
                  <TableCell className="max-w-xs text-sm text-white/60">
                    {ls.reason}
                  </TableCell>
                  <TableCell className="text-end font-mono font-semibold text-red-400">
                    {formatCurrency(ls.estimatedValue)}
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
