"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  RefreshCw,
  ClipboardList,
  Filter,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  financial_block: boolean;
  eta_calculated: string | null;
};

// Status → badge color mapping (dark-theme aware).
const statusStyles: Record<string, string> = {
  submitted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  under_review: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  partial: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  back_ordered: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  done: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  invoiced: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  shipped: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  delivered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-white/5 text-white/50 border-[#2A2A2A]",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type DealerInfo = {
  id: string;
  code: string | null;
  company_name: string;
};

export default function AdminOrdersHistoryPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [dealers, setDealers] = useState<DealerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Build lookup map: id -> name and code -> name
  const dealerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    dealers.forEach((d) => {
      if (d.id) map.set(d.id, d.company_name);
      if (d.code) map.set(d.code, d.company_name);
    });
    return map;
  }, [dealers]);

  const getDealerName = (dealerId: string): string => {
    return dealerNameMap.get(dealerId) ?? dealerId;
  };

  const handleDelete = async (orderId: string, orderNumber: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete order");
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setDeleteConfirm(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete order");
    } finally {
      setDeleting(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("admin_view", "true");
      params.set("limit", "200");
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (search) params.set("q", search);

      // Fetch orders and dealers in parallel
      const [ordersRes, dealersRes] = await Promise.all([
        fetch(`/api/orders?${params.toString()}`),
        fetch(`/api/dealers`),
      ]);

      if (!ordersRes.ok) throw new Error("Failed to load orders");

      const ordersBody = await ordersRes.json();
      setOrders(ordersBody.data ?? []);

      // Dealers fetch is non-fatal — we can still show UUIDs if it fails
      if (dealersRes.ok) {
        const dealersBody = await dealersRes.json();
        setDealers(dealersBody.data ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Aggregate stats over the loaded slice — gives admins a quick read
  // without an extra round-trip.
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(
      (o) => o.status === "submitted" || o.status === "under_review"
    ).length;
    const fulfilled = orders.filter(
      (o) =>
        o.status === "done" ||
        o.status === "delivered" ||
        o.status === "invoiced" ||
        o.status === "shipped"
    ).length;
    const blocked = orders.filter((o) => o.financial_block).length;
    const revenue = orders
      .filter((o) => o.status !== "rejected" && o.status !== "cancelled")
      .reduce((s, o) => s + (o.total_amount || 0), 0);
    return { total, pending, fulfilled, blocked, revenue };
  }, [orders]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <ClipboardList className="h-6 w-6 text-[#00BFA6]" />
            Order History
          </h1>
          <p className="mt-1 text-sm text-white/40">
            All dealer orders across the network — every status, every dealer.
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
            <p className="text-xs uppercase tracking-wider text-white/40 font-semibold">
              Orders in view
            </p>
            <p className="mt-2 text-2xl font-bold text-white">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
              Awaiting action
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-400">
              {stats.pending}
            </p>
            <p className="mt-1 text-xs text-white/30">
              Submitted or under review
            </p>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
              Fulfilled
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-400">
              {stats.fulfilled}
            </p>
            <p className="mt-1 text-xs text-white/30">
              Done · invoiced · shipped · delivered
            </p>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-white/40 font-semibold">
              Total value
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatCurrency(stats.revenue)}
            </p>
            {stats.blocked > 0 && (
              <p className="mt-1 text-xs text-red-400">
                {stats.blocked} on financial block
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Filter className="h-4 w-4 text-[#00BFA6]" />
              Filters
            </CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <Input
                placeholder="Search by order number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full md:w-72 border-[#2A2A2A] bg-[#111111] ps-9 text-white placeholder:text-white/30"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-[#00BFA6]"
              >
                <option value="all">All statuses</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under review</option>
                <option value="approved">Approved</option>
                <option value="partial">Partial</option>
                <option value="back_ordered">Back-ordered</option>
                <option value="done">Done</option>
                <option value="invoiced">Invoiced</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-[#00BFA6]"
              >
                <option value="all">All types</option>
                <option value="daily">Daily</option>
                <option value="air_dhl">Air / DHL</option>
                <option value="stock">Stock</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5">
                Results
              </label>
              <div className="flex h-10 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#111111] text-sm text-white">
                Showing {orders.length} order{orders.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Orders table */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader>
          <CardTitle className="text-base text-white">All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && orders.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-white/30" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-white/30">
              {t("common.no_results") ?? "No orders match your filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                    <TableHead className="text-white/50 font-semibold">
                      Order
                    </TableHead>
                    <TableHead className="text-white/50 font-semibold">
                      Dealer
                    </TableHead>
                    <TableHead className="text-white/50 font-semibold">
                      Type
                    </TableHead>
                    <TableHead className="text-white/50 font-semibold">
                      Submitted
                    </TableHead>
                    <TableHead className="text-white/50 font-semibold">
                      ETA
                    </TableHead>
                    <TableHead className="text-white/50 font-semibold">
                      Status
                    </TableHead>
                    <TableHead className="text-white/50 font-semibold">
                      Invoice
                    </TableHead>
                    <TableHead className="text-end text-white/50 font-semibold">
                      Amount
                    </TableHead>
                    <TableHead className="text-end text-white/50 font-semibold">
                      &nbsp;
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="border-[#2A2A2A] transition hover:bg-white/[0.02]"
                    >
                      <TableCell>
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="font-mono text-xs font-semibold text-[#00BFA6] hover:underline"
                        >
                          {order.order_number}
                        </Link>
                        {order.financial_block && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] uppercase font-bold text-red-400">
                            Financial block
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-white">
                        {getDealerName(order.dealer_id)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="uppercase text-[10px] border-[#2A2A2A] text-white/60"
                        >
                          {order.order_type.replace("_", " / ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-white/70">
                        {formatDate(order.submitted_at)}
                      </TableCell>
                      <TableCell className="text-sm text-white/70">
                        {order.eta_calculated
                          ? formatDate(order.eta_calculated)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`uppercase font-semibold text-[10px] ${
                            statusStyles[order.status] ??
                            "border-[#2A2A2A] text-white/50"
                          }`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-white/70">
                        {order.invoice_number ?? "—"}
                      </TableCell>
                      <TableCell className="text-end font-mono font-semibold text-white">
                        {formatCurrency(order.total_amount)}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1">
                          {deleteConfirm === order.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-red-400 hover:bg-red-500/10"
                                disabled={deleting}
                                onClick={() => handleDelete(order.id, order.order_number)}
                              >
                                {deleting ? "..." : "Confirm"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-white/40"
                                onClick={() => setDeleteConfirm(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setDeleteConfirm(order.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
                                aria-label={`Delete ${order.order_number}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <Link
                                href={`/dashboard/orders/${order.id}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/40 transition hover:bg-[#00BFA6]/10 hover:text-[#00BFA6]"
                                aria-label={`Open ${order.order_number}`}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
