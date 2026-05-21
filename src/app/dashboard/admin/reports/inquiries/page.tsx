"use client";

import { Download } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { inquiries, dealers, formatCurrency } from "@/lib/mock-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusStyles: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  replied: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function AdminInquiriesPage() {
  const { t } = useTranslation();
  const dealerName = (id: string) =>
    dealers.find((d) => d.id === id)?.name ?? id;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
            Inquiry Report
          </h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            All dealer inquiries across the network.
          </p>
        </div>
        <Button variant="outline">
          <Download className="me-2 h-4 w-4" /> {t("common.export")}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-[#6B6B6B]">
              Total Inquiries
            </p>
            <p className="mt-2 text-2xl font-bold text-[#000000]">
              {inquiries.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-[#6B6B6B]">
              Open
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-600">
              {inquiries.filter((i) => i.status === "open").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-[#6B6B6B]">
              Replied
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {inquiries.filter((i) => i.status === "replied").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Inquiries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Dealer</TableHead>
                <TableHead>Part #</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map((inq) => (
                <TableRow key={inq.id}>
                  <TableCell className="text-sm">
                    {inq.createdAt.slice(0, 10)}
                  </TableCell>
                  <TableCell>{dealerName(inq.dealerId)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {inq.partNumber}
                  </TableCell>
                  <TableCell className="max-w-md truncate text-sm text-[#6B6B6B]">
                    {inq.message}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`uppercase font-semibold ${statusStyles[inq.status] ?? ""}`}
                    >
                      {inq.status}
                    </Badge>
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
