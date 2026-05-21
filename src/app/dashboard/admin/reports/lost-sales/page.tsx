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
          <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
            Lost Sales Report
          </h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            Track lost revenue and identify demand gaps.
          </p>
        </div>
        <Button variant="outline">
          <Download className="me-2 h-4 w-4" /> {t("common.export")}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-red-100 p-3">
              <TrendingDown className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#000000]">
                {lostSales.length}
              </p>
              <p className="text-xs uppercase tracking-wider text-[#6B6B6B]">
                Lost Sales
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-amber-100 p-3">
              <FileText className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#000000]">
                {formatCurrency(lostRevenue)}
              </p>
              <p className="text-xs uppercase tracking-wider text-[#6B6B6B]">
                Est. Lost Revenue
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-emerald-100 p-3">
              <TrendingUp className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#000000]">
                {new Set(lostSales.map((l) => l.dealerId)).size}
              </p>
              <p className="text-xs uppercase tracking-wider text-[#6B6B6B]">
                Dealers Reporting
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lost Sales Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Dealer</TableHead>
                <TableHead>Part #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-end">Est. Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lostSales.map((ls) => (
                <TableRow key={ls.id}>
                  <TableCell className="text-sm">
                    {ls.createdAt.slice(0, 10)}
                  </TableCell>
                  <TableCell>{dealerName(ls.dealerId)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {ls.partNumber}
                  </TableCell>
                  <TableCell>{ls.customerName}</TableCell>
                  <TableCell className="max-w-xs text-sm text-[#6B6B6B]">
                    {ls.reason}
                  </TableCell>
                  <TableCell className="text-end font-mono font-semibold text-red-700">
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
