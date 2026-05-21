"use client";

import { use } from "react";
import Link from "next/link";
import { useTranslation, useLocale } from "@/lib/i18n";
import { detailedOrders, dealers, formatCurrency, type OrderType } from "@/lib/mock-data";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  FileText,
  Truck,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
} from "lucide-react";

const orderTypeLabels: Record<OrderType, string> = {
  daily: "orders.daily",
  air_dhl: "orders.air_dhl",
  stock: "orders.stock",
};

const orderTypeColors: Record<OrderType, string> = {
  daily: "bg-blue-100 text-blue-800",
  air_dhl: "bg-violet-100 text-violet-800",
  stock: "bg-amber-100 text-amber-800",
};

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useTranslation();
  const { dir } = useLocale();

  const order = detailedOrders.find((o) => o.id === id);
  const dealer = order ? dealers.find((d) => d.id === order.dealerId) : null;

  if (!order) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-4"
        dir={dir}
      >
        <Package className="size-12 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground">Order not found</p>
        <Link href="/dashboard/admin/orders">
          <Button variant="outline">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  const isUnderReview = order.status === "under_review";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight font-mono">
              {order.id}
            </h1>
            <OrderStatusBadge status={order.status} />
            <Badge
              variant="outline"
              className={cn(
                "border-transparent",
                orderTypeColors[order.type]
              )}
            >
              {t(orderTypeLabels[order.type])}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {dealer?.name ?? "Unknown Dealer"} &mdash;{" "}
            {dealer?.branch ?? ""}
            {" | "}
            {t("orders.date")}:{" "}
            {new Date(order.date).toLocaleDateString()}
          </p>
        </div>

        {/* Admin actions */}
        {isUnderReview && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => console.log(`Approved ${order.id}`)}
            >
              <CheckCircle2 className="me-1 h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => console.log(`Rejected ${order.id}`)}
            >
              <XCircle className="me-1 h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Items table */}
          <Card>
            <CardHeader>
              <CardTitle>{t("orderDetail.itemsTable")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("orderDetail.partNumber")}</TableHead>
                    <TableHead>{t("orderDetail.partName")}</TableHead>
                    <TableHead>{t("orderDetail.quantity")}</TableHead>
                    <TableHead>{t("orderDetail.unitPrice")}</TableHead>
                    <TableHead>{t("orderDetail.totalPrice")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.partId ?? item.partNumber}>
                      <TableCell className="font-mono text-xs">
                        {item.partNumber}
                      </TableCell>
                      <TableCell>{item.partName ?? item.name}</TableCell>
                      <TableCell>{item.quantity ?? item.qty}</TableCell>
                      <TableCell>
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(
                          (item.totalPrice ?? item.unitPrice * (item.quantity ?? item.qty))
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end pt-4 border-t mt-4">
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">
                    {t("orders.total")}:
                  </span>{" "}
                  <span className="text-lg font-bold">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice */}
          {order.invoiceNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-4" />
                  {t("orderDetail.invoice")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {t("orders.invoice_number")}:{" "}
                  <span className="font-mono font-medium">
                    {order.invoiceNumber}
                  </span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tracking */}
          {order.trackingNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="size-4" />
                  {t("orderDetail.tracking")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.carrier && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("orderDetail.carrier")}
                    </span>
                    <span className="font-medium">{order.carrier}</span>
                  </div>
                )}
                {order.awb && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("orderDetail.awb")}
                    </span>
                    <span className="font-mono">{order.awb}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("orderDetail.trackingNumber")}
                  </span>
                  <span className="font-mono">{order.trackingNumber}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Backorder items */}
          {order.backorderItems && order.backorderItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-4" />
                  {t("orderDetail.backorderItems")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("orderDetail.partNumber")}</TableHead>
                      <TableHead>{t("orderDetail.partName")}</TableHead>
                      <TableHead>{t("orderDetail.updatedEta")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.backorderItems.map((item) => (
                      <TableRow key={item.partNumber}>
                        <TableCell className="font-mono text-xs">
                          {item.partNumber}
                        </TableCell>
                        <TableCell>
                          {item.partName ?? item.name}
                        </TableCell>
                        <TableCell>
                          {item.eta
                            ? new Date(item.eta).toLocaleDateString()
                            : "TBD"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Dealer info + Timeline */}
        <div className="flex flex-col gap-6">
          {/* Dealer info */}
          {dealer && (
            <Card>
              <CardHeader>
                <CardTitle>Dealer Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{dealer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Branch</span>
                  <span className="font-medium">{dealer.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Limit</span>
                  <span className="font-mono">
                    {formatCurrency(dealer.creditLimit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overdue</span>
                  <span
                    className={cn(
                      "font-mono",
                      dealer.overdueBalance > 0 && "text-red-700 font-semibold"
                    )}
                  >
                    {formatCurrency(dealer.overdueBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant="outline"
                    className="uppercase font-semibold"
                  >
                    {dealer.financialStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {order.timeline && order.timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("orderDetail.timeline")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute start-3 top-2 bottom-2 w-px bg-border" />
                  <div className="flex flex-col gap-6">
                    {order.timeline.map((event, i) => (
                      <div key={i} className="flex gap-3 relative">
                        <div
                          className={cn(
                            "size-6 rounded-full flex items-center justify-center shrink-0 z-10",
                            i === order.timeline!.length - 1
                              ? "bg-[#00A3E0] text-white"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <CheckCircle className="size-3" />
                        </div>
                        <div className="flex flex-col gap-0.5 pb-1">
                          <span className="text-xs font-medium capitalize">
                            {t(`status.${event.status}`)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(event.date).toLocaleString()}
                          </span>
                          {event.note && (
                            <span className="text-xs text-muted-foreground">
                              {event.note}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
