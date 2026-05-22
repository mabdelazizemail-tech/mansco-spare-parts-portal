"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Receipt,
  RefreshCw,
  Loader2,
  FileText,
  X,
  AlertTriangle,
  Calendar,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OrderRow = {
  id: string;
  order_number: string;
  dealer_id: string;
  order_type: "daily" | "air_dhl" | "stock";
  status: string;
  submitted_at: string;
  total_amount: number;
  invoice_number: string | null;
  invoice_date: string | null;
  eta_calculated: string | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Issue Invoice Modal ─────────────────────────────────────────────────
function IssueInvoiceModal({
  order,
  onClose,
  onIssued,
}: {
  order: OrderRow;
  onClose: () => void;
  onIssued: () => void;
}) {
  const [customNumber, setCustomNumber] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const body: Record<string, string> = {};
      if (useCustom && customNumber.trim()) {
        body.invoice_number = customNumber.trim();
      }
      const res = await fetch(`/api/orders/${order.id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error?.message ?? "Failed to issue invoice");
      }
      onIssued();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to issue invoice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#111111] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#2A2A2A] px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-cyan-500/10 p-2">
              <Receipt className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Issue Invoice</h2>
              <p className="text-xs text-white/40">
                {order.order_number} · {formatCurrency(order.total_amount)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-[#2A2A2A] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-cyan-300">
            Issuing an invoice will set the order status to{" "}
            <span className="font-bold">invoiced</span> and stamp the dealer
            account. This action is permanent for Phase 1.
          </div>

          <div>
            <Label className="text-xs font-medium text-white/50">
              Invoice number
            </Label>
            <div className="mt-1.5 flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-white/70">
                <input
                  type="radio"
                  name="invnum"
                  checked={!useCustom}
                  onChange={() => setUseCustom(false)}
                  className="accent-[#00BFA6]"
                />
                Auto-generate (recommended)
              </label>
              <label className="flex items-center gap-2 text-xs text-white/70">
                <input
                  type="radio"
                  name="invnum"
                  checked={useCustom}
                  onChange={() => setUseCustom(true)}
                  className="accent-[#00BFA6]"
                />
                Use custom
              </label>
            </div>
            {useCustom && (
              <input
                value={customNumber}
                onChange={(e) => setCustomNumber(e.target.value)}
                placeholder="e.g. INV-2026-0042"
                className="mt-2 h-10 w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-sm text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none focus:ring-1 focus:ring-[#00BFA6]/30"
                disabled={submitting}
              />
            )}
            {!useCustom && (
              <p className="mt-2 text-[11px] text-white/40">
                A number in the format <span className="font-mono">INV-{new Date().getFullYear()}-NNNN</span> will be assigned automatically.
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#2A2A2A] bg-[#0D0D0D] px-6 py-4 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || (useCustom && !customNumber.trim())}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Receipt className="h-3.5 w-3.5" />
            )}
            Issue Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function AdminInvoicingPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"queue" | "issued">("queue");
  const [issuingOrder, setIssuingOrder] = useState<OrderRow | null>(null);

  // We fetch a wider slice and split client-side so admins can toggle between
  // the invoicing queue (eligible orders) and previously-issued invoices
  // without an extra round-trip.
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("admin_view", "true");
      params.set("limit", "200");
      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load orders");
      const body = await res.json();
      setOrders(body.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const queue = useMemo(
    () =>
      orders.filter(
        (o) =>
          !o.invoice_number &&
          ["approved", "done", "partial"].includes(o.status)
      ),
    [orders]
  );

  const issued = useMemo(
    () =>
      orders
        .filter((o) => !!o.invoice_number)
        .sort((a, b) =>
          (b.invoice_date ?? "").localeCompare(a.invoice_date ?? "")
        ),
    [orders]
  );

  const totals = useMemo(() => {
    const queueAmount = queue.reduce((s, o) => s + (o.total_amount || 0), 0);
    const issuedAmount = issued.reduce((s, o) => s + (o.total_amount || 0), 0);
    return { queueAmount, issuedAmount };
  }, [queue, issued]);

  const handleIssued = () => {
    setIssuingOrder(null);
    fetchOrders();
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Receipt className="h-6 w-6 text-[#00BFA6]" />
            Invoicing
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Issue invoices on approved dealer orders and review previously
            issued invoices.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
              Ready to invoice
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-400">
              {queue.length}
            </p>
            <p className="mt-1 text-xs text-white/30">
              Approved · partial · done
            </p>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-white/40 font-semibold">
              Queue value
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatCurrency(totals.queueAmount)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
              Invoiced
            </p>
            <p className="mt-2 text-2xl font-bold text-cyan-400">
              {issued.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-white/40 font-semibold">
              Invoiced value
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatCurrency(totals.issuedAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#2A2A2A]">
        <button
          onClick={() => setTab("queue")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition border-b-2 ${
            tab === "queue"
              ? "border-[#00BFA6] text-[#00BFA6]"
              : "border-transparent text-white/40 hover:text-white/70"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Invoice Queue
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              tab === "queue"
                ? "bg-[#00BFA6]/20 text-[#00BFA6]"
                : "bg-white/5 text-white/40"
            }`}
          >
            {queue.length}
          </span>
        </button>
        <button
          onClick={() => setTab("issued")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition border-b-2 ${
            tab === "issued"
              ? "border-[#00BFA6] text-[#00BFA6]"
              : "border-transparent text-white/40 hover:text-white/70"
          }`}
        >
          <Receipt className="h-3.5 w-3.5" />
          Issued Invoices
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              tab === "issued"
                ? "bg-[#00BFA6]/20 text-[#00BFA6]"
                : "bg-white/5 text-white/40"
            }`}
          >
            {issued.length}
          </span>
        </button>
      </div>

      {/* Content */}
      {tab === "queue" ? (
        <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
          <CardHeader>
            <CardTitle className="text-base text-white">
              Orders awaiting invoice
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && orders.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-white/30" />
              </div>
            ) : queue.length === 0 ? (
              <div className="py-16 text-center">
                <Receipt className="mx-auto h-10 w-10 text-white/20 mb-3" />
                <p className="text-white/40">No orders waiting to be invoiced.</p>
                <p className="mt-1 text-xs text-white/30">
                  Approved, partial, and done orders will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                      <TableHead className="text-white/50 font-semibold">Order</TableHead>
                      <TableHead className="text-white/50 font-semibold">Dealer</TableHead>
                      <TableHead className="text-white/50 font-semibold">Type</TableHead>
                      <TableHead className="text-white/50 font-semibold">Status</TableHead>
                      <TableHead className="text-white/50 font-semibold">Submitted</TableHead>
                      <TableHead className="text-end text-white/50 font-semibold">Amount</TableHead>
                      <TableHead className="text-end text-white/50 font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue.map((order) => (
                      <TableRow
                        key={order.id}
                        className="border-[#2A2A2A] transition hover:bg-white/[0.02]"
                      >
                        <TableCell>
                          <Link
                            href={`/dashboard/admin/orders/${order.id}`}
                            className="font-mono text-xs font-semibold text-[#00BFA6] hover:underline"
                          >
                            {order.order_number}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-white">
                          {order.dealer_id}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="uppercase text-[10px] border-[#2A2A2A] text-white/60"
                          >
                            {order.order_type.replace("_", " / ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="uppercase font-semibold text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-white/70">
                          {formatDate(order.submitted_at)}
                        </TableCell>
                        <TableCell className="text-end font-mono font-semibold text-white">
                          {formatCurrency(order.total_amount)}
                        </TableCell>
                        <TableCell className="text-end">
                          <button
                            onClick={() => setIssuingOrder(order)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-400 transition hover:bg-cyan-500/20"
                          >
                            <Receipt className="h-3 w-3" />
                            Issue Invoice
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
          <CardHeader>
            <CardTitle className="text-base text-white">
              Issued invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && orders.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-white/30" />
              </div>
            ) : issued.length === 0 ? (
              <div className="py-16 text-center">
                <Calendar className="mx-auto h-10 w-10 text-white/20 mb-3" />
                <p className="text-white/40">No invoices issued yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                      <TableHead className="text-white/50 font-semibold">Invoice #</TableHead>
                      <TableHead className="text-white/50 font-semibold">Order</TableHead>
                      <TableHead className="text-white/50 font-semibold">Dealer</TableHead>
                      <TableHead className="text-white/50 font-semibold">Issued</TableHead>
                      <TableHead className="text-white/50 font-semibold">Status</TableHead>
                      <TableHead className="text-end text-white/50 font-semibold">Amount</TableHead>
                      <TableHead className="text-end text-white/50 font-semibold">&nbsp;</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issued.map((order) => (
                      <TableRow
                        key={order.id}
                        className="border-[#2A2A2A] transition hover:bg-white/[0.02]"
                      >
                        <TableCell className="font-mono text-xs font-semibold text-cyan-400">
                          {order.invoice_number}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/admin/orders/${order.id}`}
                            className="font-mono text-xs text-[#00BFA6] hover:underline"
                          >
                            {order.order_number}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-white">
                          {order.dealer_id}
                        </TableCell>
                        <TableCell className="text-sm text-white/70">
                          {formatDate(order.invoice_date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="uppercase font-semibold text-[10px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                          >
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end font-mono font-semibold text-white">
                          {formatCurrency(order.total_amount)}
                        </TableCell>
                        <TableCell className="text-end">
                          <Link
                            href={`/dashboard/admin/orders/${order.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/40 transition hover:bg-[#00BFA6]/10 hover:text-[#00BFA6]"
                            aria-label={`Open ${order.order_number}`}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Issue Invoice Modal */}
      {issuingOrder && (
        <IssueInvoiceModal
          order={issuingOrder}
          onClose={() => setIssuingOrder(null)}
          onIssued={handleIssued}
        />
      )}
    </div>
  );
}
