"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/portal/status-badge";
import type { ToneColor } from "@/lib/portal-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, FileText, Truck, Clock, CheckCircle, CheckCircle2, XCircle, Package, Loader2, RefreshCw,
} from "lucide-react";

type OrderLine = {
  id: string;
  part_number: string;
  part_name: string;
  quantity_requested: number;
  quantity_confirmed: number;
  quantity_backordered: number;
  unit_price: number;
  line_total: number;
  line_status: string;
  backorder_eta: string | null;
};
type TimelineEvent = { id: string; event: string; status: string | null; notes: string | null; created_at: string };
type OrderDetail = {
  id: string;
  order_number: string;
  status: string;
  order_type: string;
  submitted_at: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  invoice_number: string | null;
  tracking_number: string | null;
  carrier: string | null;
  dealer_id: string;
  dealer_name: string | null;
  dealer_code: string | null;
  order_lines: OrderLine[];
  order_timeline: TimelineEvent[];
};
type DealerInfo = {
  id: string;
  code: string | null;
  company_name: string;
  branch_address: string | null;
  credit_limit: number | null;
  overdue_balance: number | null;
  financial_status: string | null;
};

const STATUS_META: Record<string, { tone: ToneColor; label: string }> = {
  submitted: { tone: "info", label: "Submitted" },
  under_review: { tone: "warning", label: "Under Review" },
  pending_dealer_confirmation: { tone: "warning", label: "Awaiting Dealer" },
  approved: { tone: "success", label: "Approved" },
  rejected: { tone: "destructive", label: "Rejected" },
  partial: { tone: "warning", label: "Partial" },
  back_ordered: { tone: "accent", label: "Back-ordered" },
  done: { tone: "success", label: "Done" },
  invoiced: { tone: "info", label: "Invoiced" },
  shipped: { tone: "info", label: "Shipped" },
  delivered: { tone: "success", label: "Delivered" },
  cancelled: { tone: "muted", label: "Cancelled" },
};
const ORDER_TYPE_LABEL: Record<string, string> = { daily: "Daily", air_dhl: "Air/DHL", stock: "Stock" };

function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value ?? 0));
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [dealer, setDealer] = useState<DealerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Failed to load order");
      }
      const body = await res.json();
      const ord: OrderDetail = body.data;
      setOrder(ord);

      // Best-effort dealer financials (admin-only endpoint).
      try {
        const dres = await fetch("/api/dealers");
        if (dres.ok) {
          const dealers: DealerInfo[] = (await dres.json()).data ?? [];
          setDealer(
            dealers.find((d) => d.id === ord.dealer_id || d.code === ord.dealer_id || d.code === ord.dealer_code) ?? null
          );
        }
      } catch {
        /* non-fatal */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const review = async (action: "approve" | "reject") => {
    if (!order) return;
    let notes: string | undefined;
    if (action === "reject") {
      const reason = window.prompt("Reason for rejection (shown to the dealer):");
      if (reason === null) return; // cancelled
      notes = reason;
    }
    setActing(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "Action failed");
      await fetchOrder();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>;
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Package className="size-12 text-white/20" />
        <p className="text-white/50">{error || "Order not found"}</p>
        <Link href="/dashboard/admin/orders"><Button variant="outline">Back to Orders</Button></Link>
      </div>
    );
  }

  const statusMeta = STATUS_META[order.status] ?? { tone: "muted" as ToneColor, label: order.status };
  const canReview = order.status === "under_review" || order.status === "submitted";
  const backorderLines = order.order_lines.filter((l) => l.quantity_backordered > 0 || l.line_status === "backordered");

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/orders">
          <Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-white">{order.order_number}</h1>
            <StatusBadge tone={statusMeta.tone} label={statusMeta.label} />
            <Badge variant="outline" className="border-[#2A2A2A] text-white/70">
              {ORDER_TYPE_LABEL[order.order_type] ?? order.order_type}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-white/40">
            {order.dealer_name ?? dealer?.company_name ?? order.dealer_id}
            {(dealer?.branch_address || "") && ` — ${dealer?.branch_address}`}
            {" | "}
            {fmtDate(order.submitted_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={fetchOrder} disabled={acting} title="Refresh">
            <RefreshCw className="size-4 text-white/50" />
          </Button>
          {canReview && (
            <>
              <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => review("approve")} disabled={acting}>
                <CheckCircle2 className="me-1 h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => review("reject")} disabled={acting}>
                <XCircle className="me-1 h-3.5 w-3.5" /> Reject
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Items */}
          <Card>
            <CardHeader><CardTitle>Order Items</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-end">Unit Price</TableHead>
                    <TableHead className="text-end">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_lines.map((item) => {
                    const qty = item.quantity_confirmed > 0 ? item.quantity_confirmed : item.quantity_requested;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.part_number}</TableCell>
                        <TableCell>{item.part_name}</TableCell>
                        <TableCell className="text-center">
                          {qty}
                          {item.quantity_confirmed > 0 && item.quantity_confirmed !== item.quantity_requested && (
                            <span className="ms-1 text-[10px] text-white/40">of {item.quantity_requested}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-end">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-end font-medium">{formatCurrency(item.line_total)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end border-t pt-4">
                <div className="space-y-1 text-right text-sm">
                  <div className="text-white/50">Subtotal: <span className="text-white">{formatCurrency(order.subtotal)}</span></div>
                  <div className="text-white/50">VAT: <span className="text-white">{formatCurrency(order.vat_amount)}</span></div>
                  <div className="text-base font-bold text-white">Total: {formatCurrency(order.total_amount)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice */}
          {order.invoice_number && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-4" /> Invoice</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-white/70">Invoice #: <span className="font-mono font-medium text-white">{order.invoice_number}</span></p>
              </CardContent>
            </Card>
          )}

          {/* Tracking (legacy order fields) */}
          {order.tracking_number && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="size-4" /> Tracking</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.carrier && (
                  <div className="flex justify-between"><span className="text-white/50">Carrier</span><span className="font-medium text-white">{order.carrier}</span></div>
                )}
                <div className="flex justify-between"><span className="text-white/50">Tracking #</span><span className="font-mono text-white">{order.tracking_number}</span></div>
              </CardContent>
            </Card>
          )}

          {/* Back-order lines */}
          {backorderLines.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="size-4" /> Back-ordered Items</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead>ETA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backorderLines.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.part_number}</TableCell>
                        <TableCell>{item.part_name}</TableCell>
                        <TableCell className="text-center">{item.quantity_backordered || item.quantity_requested}</TableCell>
                        <TableCell>{item.backorder_eta ? new Date(item.backorder_eta).toLocaleDateString("en-GB") : "TBD"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Dealer info */}
          <Card>
            <CardHeader><CardTitle>Dealer Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-white/50">Name</span><span className="font-medium text-white">{order.dealer_name ?? dealer?.company_name ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-white/50">Code</span><span className="font-mono text-white">{order.dealer_code ?? dealer?.code ?? "—"}</span></div>
              {dealer && (
                <>
                  {dealer.branch_address && (
                    <div className="flex justify-between"><span className="text-white/50">Branch</span><span className="font-medium text-white">{dealer.branch_address}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-white/50">Credit Limit</span><span className="font-mono text-white">{formatCurrency(dealer.credit_limit)}</span></div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Overdue</span>
                    <span className={cn("font-mono", (dealer.overdue_balance ?? 0) > 0 ? "font-semibold text-red-400" : "text-white")}>
                      {formatCurrency(dealer.overdue_balance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Status</span>
                    <Badge variant="outline" className="font-semibold uppercase">{dealer.financial_status ?? "—"}</Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          {order.order_timeline && order.order_timeline.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute bottom-2 start-3 top-2 w-px bg-[#2A2A2A]" />
                  <div className="flex flex-col gap-6">
                    {order.order_timeline.map((event, i) => (
                      <div key={event.id} className="relative flex gap-3">
                        <div className={cn(
                          "z-10 flex size-6 shrink-0 items-center justify-center rounded-full",
                          i === order.order_timeline.length - 1 ? "bg-[#00BFA6] text-white" : "bg-[#2A2A2A] text-white/50"
                        )}>
                          <CheckCircle className="size-3" />
                        </div>
                        <div className="flex flex-col gap-0.5 pb-1">
                          <span className="text-xs font-medium text-white">{event.event}</span>
                          <span className="text-[11px] text-white/40">{fmtDate(event.created_at)}</span>
                          {event.notes && <span className="text-xs text-white/50">{event.notes}</span>}
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
