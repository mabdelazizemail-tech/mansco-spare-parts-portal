"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/portal/status-badge";
import {
  FileText,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";

type OrderRow = {
  id: string;
  order_number: string;
  dealer_id: string;
  status: string;
  submitted_at: string;
  total_amount: number;
  invoice_number: string | null;
  invoice_date?: string | null;
  invoice_due_date?: string | null;
};

type DealerInfo = {
  id: string;
  code: string | null;
  company_name: string;
};

function formatEGP(value: number): string {
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

export default function InvoicesPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [dealers, setDealers] = useState<DealerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch orders (API scopes to dealer for dealers, returns all for admins)
      // and dealers list for name lookup
      const [ordersRes, dealersRes] = await Promise.all([
        fetch("/api/orders?limit=200"),
        fetch("/api/dealers").catch(() => null),
      ]);

      if (!ordersRes.ok) throw new Error("Failed to load orders");
      const ordersBody = await ordersRes.json();
      setOrders(ordersBody.data ?? []);

      // Dealer names — non-fatal if it fails (e.g., not admin)
      if (dealersRes?.ok) {
        const dealersBody = await dealersRes.json();
        setDealers(dealersBody.data ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lookup map for dealer names
  const dealerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    dealers.forEach((d) => {
      if (d.id) map.set(d.id, d.company_name);
      if (d.code) map.set(d.code, d.company_name);
    });
    return map;
  }, [dealers]);

  const getDealerName = (id: string) => dealerNameMap.get(id) ?? id;

  // Build invoice rows from orders that have an invoice_number
  const invoices = useMemo(
    () =>
      orders
        .filter((o) => !!o.invoice_number)
        .map((o) => {
          const date = o.invoice_date ?? o.submitted_at;
          const dueDate =
            o.invoice_due_date ??
            new Date(new Date(date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          const isPaid =
            o.status === "delivered" || o.status === "done";
          return {
            id: o.invoice_number as string,
            orderId: o.id,
            orderNumber: o.order_number,
            dealerId: o.dealer_id,
            date,
            dueDate,
            amount: o.total_amount,
            status: (isPaid ? "paid" : "pending") as "paid" | "pending",
          };
        }),
    [orders]
  );

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.amount, 0);
  const totalPending = totalInvoiced - totalPaid;
  const showDealerColumn = dealers.length > 0;

  const filtered = filter === "all" ? invoices : invoices.filter((i) => i.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="mt-1 text-sm text-white/40">
            Statements, aging, and payment confirmations.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-xs font-semibold text-white/60 transition hover:text-white disabled:opacity-50"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <FileText className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{formatEGP(totalInvoiced)}</p>
            <p className="text-xs text-white/40">Total Invoiced</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <CheckCircle className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{formatEGP(totalPaid)}</p>
            <p className="text-xs text-white/40">Paid</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
            <Clock className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{formatEGP(totalPending)}</p>
            <p className="text-xs text-white/40">Pending</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "paid", "pending"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === key
                ? "bg-[#00BFA6] text-white"
                : "bg-[#1A1A1A] border border-[#2A2A2A] text-white/50 hover:text-white/70"
            }`}
          >
            {key === "all" ? "All" : key.charAt(0).toUpperCase() + key.slice(1)}
            {key === "all" && invoices.length > 0 && (
              <span className="ms-1.5 opacity-60">({invoices.length})</span>
            )}
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
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                  Order
                </th>
                {showDealerColumn && (
                  <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                    Dealer
                  </th>
                )}
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-white">
                    {inv.id}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-[#00BFA6]">
                    <Link
                      href={`/dashboard/orders/${inv.orderId}`}
                      className="hover:underline"
                    >
                      {inv.orderNumber}
                    </Link>
                  </td>
                  {showDealerColumn && (
                    <td className="px-5 py-3 text-white/70 text-xs">
                      {getDealerName(inv.dealerId)}
                    </td>
                  )}
                  <td className="px-5 py-3 text-white/60">{formatDate(inv.date)}</td>
                  <td className="px-5 py-3 text-white/60">{formatDate(inv.dueDate)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge
                      tone={inv.status === "paid" ? "success" : "warning"}
                      label={inv.status === "paid" ? "Paid" : "Pending"}
                    />
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-white">
                    {formatEGP(inv.amount)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={showDealerColumn ? 7 : 6}
                    className="px-5 py-16 text-center text-white/30"
                  >
                    {orders.length === 0
                      ? "No orders yet — invoices appear here once orders are invoiced."
                      : invoices.length === 0
                      ? "No invoiced orders yet. Once an order has an invoice number, it will appear here."
                      : "No invoices match the current filter."}
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
