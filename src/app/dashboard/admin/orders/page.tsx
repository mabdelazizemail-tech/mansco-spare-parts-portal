"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Search } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { adminOrders, formatCurrency } from "@/lib/mock-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminOrdersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const pendingOrders = adminOrders.filter((o) => o.status === "under_review");
  const filtered = pendingOrders.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.dealerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
          {t("admin.order_approvals")}
        </h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          Review and approve dealer orders requiring manual exception handling.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-amber-100 p-3">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#000000]">{pendingOrders.length}</p>
              <p className="text-xs uppercase tracking-wider text-[#6B6B6B]">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-emerald-100 p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#000000]">
                {adminOrders.filter((o) => o.status === "approved").length}
              </p>
              <p className="text-xs uppercase tracking-wider text-[#6B6B6B]">Approved Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-red-100 p-3">
              <XCircle className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#000000]">
                {adminOrders.filter((o) => o.status === "rejected").length}
              </p>
              <p className="text-xs uppercase tracking-wider text-[#6B6B6B]">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-base">Approval Queue</CardTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]" />
            <Input
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-64 ps-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Dealer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-end">Items</TableHead>
                <TableHead className="text-end">Amount</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-[#6B6B6B]">
                    {t("common.no_results")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-semibold">{order.id}</TableCell>
                    <TableCell>{order.dealerName}</TableCell>
                    <TableCell>{order.createdAt.slice(0, 10)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase">
                        {order.orderType.replace("_", "/")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">{order.itemCount}</TableCell>
                    <TableCell className="text-end font-semibold">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" className="h-8 bg-emerald-600 text-white hover:bg-emerald-700">
                          <CheckCircle2 className="me-1 h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-8">
                          <AlertTriangle className="me-1 h-3.5 w-3.5" /> Partial
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-700 hover:bg-red-50">
                          <XCircle className="me-1 h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
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
