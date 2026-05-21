"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, ChevronRight, Loader2, RefreshCw } from "lucide-react";

type ToneColor = "success" | "warning" | "destructive" | "info" | "muted" | "accent";

type OrderRow = {
  id: string;
  order_number: string;
  dealer_id: string;
  order_type: string;
  status: string;
  submitted_at: string;
  total_amount: number;
  currency: string;
  order_lines: { id: string }[];
};

const STATUS_OPTIONS = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "approved", label: "Approved" },
  { key: "partial", label: "Partial" },
  { key: "back_ordered", label: "Back-ordered" },
  { key: "invoiced", label: "Invoiced" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "rejected", label: "Rejected" },
  { key: "done", label: "Done" },
];

const TYPE_OPTIONS = [
  { key: "all", label: "All Types" },
  { key: "daily", label: "Daily" },
  { key: "air_dhl", label: "Air / DHL" },
  { key: "stock", label: "Stock" },
];

function statusTone(status: string): ToneColor {
  const map: Record<string, ToneColor> = {
    submitted: "info",
    under_review: "warning",
    approved: "success",
    rejected: "destructive",
    done: "success",
    partial: "warning",
    back_ordered: "accent",
    invoiced: "info",
    shipped: "info",
    delivered: "success",
    cancelled: "destructive",
  };
  return map[status] ?? "muted";
}

function statusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const typeTone: Record<string, ToneColor> = {
  daily: "info",
  air_dhl: "warning",
  stock: "accent",
};
const typeLabel: Record<string, string> = {
  daily: "Daily",
  air_dhl: "Air / DHL",
  stock: "Stock",
};

function formatEGP(value: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OrdersList() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (search) params.set("q", search);
      // In production, dealer_id comes from session. For now show all.
      params.set("admin_view", "true");

      const res = await fetch(`/api/orders?${params}`);
      if (!res.ok) throw new Error("Failed to load orders");
      const body = await res.json();
      setOrders(body.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="mt-1 text-sm text-white/40">Track all your orders from submission to delivery.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-xs font-semibold text-white/60 transition hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/dashboard/orders/new">
            <Button size="sm" className="gap-1.5 bg-[#00BFA6] hover:bg-[#00A892]">
              <Plus className="h-4 w-4" /> New Order
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID..."
            className="pl-9 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-white/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 text-sm text-white"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 text-sm text-white"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setStatusFilter(opt.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === opt.key
                ? "bg-[#00BFA6] text-white"
                : "bg-[#1A1A1A] border border-[#2A2A2A] text-white/50 hover:text-white/70"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Order</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Items</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/orders/${o.id}`}
                      className="font-mono text-xs font-semibold text-[#00BFA6] hover:underline"
                    >
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={typeTone[o.order_type] ?? "muted"} label={typeLabel[o.order_type] ?? o.order_type} />
                  </td>
                  <td className="px-5 py-3 text-white/60">
                    {new Date(o.submitted_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3 text-white/60">
                    {o.order_lines?.length ?? 0} line{(o.order_lines?.length ?? 0) !== 1 ? "s" : ""}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={statusTone(o.status)} label={statusLabel(o.status)} />
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-white">
                    {formatEGP(o.total_amount)}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/orders/${o.id}`}>
                      <ChevronRight className="h-4 w-4 text-white/20" />
                    </Link>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-white/30">
                    No orders found. <Link href="/dashboard/orders/new" className="text-[#00BFA6] hover:underline">Create your first order</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
