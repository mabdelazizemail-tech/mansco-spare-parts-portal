"use client";

import { Download } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { inquiries, dealers } from "@/lib/mock-data";
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
  open: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  replied: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  closed: "bg-white/5 text-white/50 border-[#2A2A2A]",
};

export default function AdminInquiriesPage() {
  const { t } = useTranslation();
  const dealerName = (id: string) =>
    dealers.find((d) => d.id === id)?.name ?? id;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Inquiry Report
          </h1>
          <p className="mt-1 text-sm text-white/40">
            All dealer inquiries across the network.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-[#2A2A2A] bg-[#1A1A1A] text-white/60 hover:border-[#3A3A3A] hover:bg-[#1A1A1A] hover:text-white"
        >
          <Download className="me-2 h-4 w-4" /> {t("common.export")}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-white/40 font-semibold">
              Total Inquiries
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              {inquiries.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-white/40 font-semibold">
              Open
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-400">
              {inquiries.filter((i) => i.status === "open").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-white/40 font-semibold">
              Replied
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-400">
              {inquiries.filter((i) => i.status === "replied").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader>
          <CardTitle className="text-base text-white">All Inquiries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                <TableHead className="text-white/50 font-semibold">Date</TableHead>
                <TableHead className="text-white/50 font-semibold">Dealer</TableHead>
                <TableHead className="text-white/50 font-semibold">Part #</TableHead>
                <TableHead className="text-white/50 font-semibold">Message</TableHead>
                <TableHead className="text-white/50 font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map((inq) => (
                <TableRow
                  key={inq.id}
                  className="border-[#2A2A2A] transition hover:bg-white/[0.02]"
                >
                  <TableCell className="text-sm text-white/70">
                    {inq.createdAt.slice(0, 10)}
                  </TableCell>
                  <TableCell className="text-white">{dealerName(inq.dealerId)}</TableCell>
                  <TableCell className="font-mono text-xs text-white/70">
                    {inq.partNumber}
                  </TableCell>
                  <TableCell className="max-w-md truncate text-sm text-white/60">
                    {inq.message}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`uppercase font-semibold text-[10px] ${
                        statusStyles[inq.status] ?? "border-[#2A2A2A] text-white/50"
                      }`}
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
