"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Clock,
  ChevronRight,
} from "lucide-react";

type ToneColor = "success" | "warning" | "destructive" | "info" | "muted" | "accent";

type OrderRow = {
  id: string;
  order_number: string;
  dealer_id: string;
  order_type: string;
  status: string;
  submitted_at: string;
  total_amount: number;
  financial_block: boolean;
  financial_block_reason?: string;
  order_lines: { id: string }[];
};

type DealerInfo = {
  id: string;
  code: string | null;
  company_name: string;
};

const typeTone: Record<string, ToneColor> = { daily: "info", air_dhl: "warning", stock: "accent" };
const typeLabel: Record<string, string> = { daily: "Daily", air_dhl: "Air / DHL", stock: "Stock" };

function formatEGP(value: number): string {
  return new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminApprovalsPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [dealers, setDealers] = useState<DealerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch orders and dealers in parallel
      const params = new URLSearchParams({ admin_view: "true", limit: "100" });
      const [ordersRes, dealersRes] = await Promise.all([
        fetch(`/api/orders?${params}`),
        fetch(`/api/dealers`),
      ]);

      if (!ordersRes.ok) throw new Error("Failed to load review queue");

      const body = await ordersRes.json();
      // Filter to reviewable statuses
      const reviewable = (body.data ?? []).filter(
        (o: OrderRow) => o.status === "submitted" || o.status === "under_review"
      );
      setOrders(reviewable);

      // Dealers fetch is non-fatal
      if (dealersRes.ok) {
        const dealersBody = await dealersRes.json();
        setDealers(dealersBody.data ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleAction = async (orderId: string, action: string, notes?: string) => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewer_id: "admin", notes }),
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setRejectOrderId(null);
        setRejectReason("");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = orders.filter(
    (o) =>
      !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.dealer_id.toLowerCase().includes(search.toLowerCase())
  );

  const financialBlockCount = orders.filter((o) => o.financial_block).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Order Review Queue</h1>
          <p className="mt-1 text-sm text-white/40">
            {orders.length} order{orders.length !== 1 ? "s" : ""} pending review
          </p>
        </div>
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-xs font-semibold text-white/60 transition hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-yellow-400">Pending Review</p>
          <p className="mt-1 text-2xl font-bold text-white">{orders.length}</p>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-red-400">Financial Blocks</p>
          <p className="mt-1 text-2xl font-bold text-white">{financialBlockCount}</p>
        </div>
        <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40">Total Value</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {formatEGP(orders.reduce((s, o) => s + o.total_amount, 0))}
          </p>
        </div>
        <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40">Avg. Order</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {orders.length > 0 ? formatEGP(Math.round(orders.reduce((s, o) => s + o.total_amount, 0) / orders.length)) : "—"}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order # or dealer..."
          className="pl-9 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-white/30"
        />
      </div>

      {/* Queue */}
      <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="h-10 w-10 text-emerald-500/30 mb-3" />
            <p className="text-sm text-white/30">All clear — no orders pending review</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Order</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Dealer</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Type</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Items</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-white/40 uppercase">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Flags</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Submitted</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-white/40 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/orders/${o.id}`}
                      className="font-mono text-xs font-semibold text-[#00BFA6] hover:underline"
                    >
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-white/80 text-xs">{getDealerName(o.dealer_id)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={typeTone[o.order_type] ?? "muted"} label={typeLabel[o.order_type] ?? o.order_type} />
                  </td>
                  <td className="px-5 py-3 text-white/60">{o.order_lines?.length ?? 0}</td>
                  <td className="px-5 py-3 text-right font-semibold text-white">{formatEGP(o.total_amount)}</td>
                  <td className="px-5 py-3">
                    {o.financial_block ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400" title={o.financial_block_reason}>
                        <ShieldAlert className="h-3.5 w-3.5" /> Financial
                      </span>
                    ) : (
                      <span className="text-xs text-white/20">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1 text-xs text-white/40">
                      <Clock className="h-3 w-3" /> {timeSince(o.submitted_at)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {rejectOrderId === o.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason..."
                            className="h-8 w-40 rounded border border-[#2A2A2A] bg-[#111] px-2 text-xs text-white placeholder:text-white/30"
                          />
                          <Button
                            size="sm"
                            className="h-8 bg-red-600 hover:bg-red-700 text-xs"
                            disabled={!rejectReason || actionLoading === o.id}
                            onClick={() => handleAction(o.id, "reject", rejectReason)}
                          >
                            {actionLoading === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reject"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-white/40" onClick={() => { setRejectOrderId(null); setRejectReason(""); }}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="h-8 gap-1 bg-green-600 hover:bg-green-700 text-xs"
                            disabled={actionLoading === o.id}
                            onClick={() => handleAction(o.id, "approve")}
                          >
                            {actionLoading === o.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                            onClick={() => setRejectOrderId(o.id)}
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </Button>
                          <Link href={`/dashboard/orders/${o.id}`}>
                            <ChevronRight className="h-4 w-4 text-white/20" />
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
