"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/portal/status-badge";
import type { ToneColor } from "@/lib/portal-data";
import { FileText, Clock, AlertTriangle, Loader2, RefreshCw } from "lucide-react";

type Invoice = {
  id: string;
  invoice_number: string;
  order_id: string;
  dealer_id: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  outstanding_balance: number;
  aging_days: number;
  aging_bucket: string;
  effective_status: "pending" | "paid" | "overdue" | "cancelled";
};

type DealerInfo = { id: string; code: string | null; company_name: string };

const statusTone: Record<Invoice["effective_status"], { tone: ToneColor; label: string }> = {
  paid: { tone: "success", label: "Paid" },
  pending: { tone: "warning", label: "Pending" },
  overdue: { tone: "destructive", label: "Overdue" },
  cancelled: { tone: "muted", label: "Cancelled" },
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
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dealers, setDealers] = useState<DealerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "overdue" | "paid">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [invRes, dealersRes] = await Promise.all([
        fetch("/api/invoices?limit=200"),
        fetch("/api/dealers").catch(() => null),
      ]);
      if (!invRes.ok) throw new Error("Failed to load invoices");
      const invBody = await invRes.json();
      setInvoices(invBody.data ?? []);
      if (dealersRes?.ok) {
        const dealersBody = await dealersRes.json();
        setDealers(dealersBody.data ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dealerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    dealers.forEach((d) => {
      if (d.id) map.set(d.id, d.company_name);
      if (d.code) map.set(d.code, d.company_name);
    });
    return map;
  }, [dealers]);

  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount), 0);
  const totalOutstanding = invoices.reduce((s, i) => s + i.outstanding_balance, 0);
  const overdueAmount = invoices
    .filter((i) => i.effective_status === "overdue")
    .reduce((s, i) => s + i.outstanding_balance, 0);
  const showDealerColumn = dealers.length > 0;

  const filtered = filter === "all" ? invoices : invoices.filter((i) => i.effective_status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="mt-1 text-sm text-white/40">Statements, aging, and outstanding balances.</p>
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
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
            <Clock className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{formatEGP(totalOutstanding)}</p>
            <p className="text-xs text-white/40">Outstanding</p>
          </div>
        </div>
        <div className={`flex items-center gap-4 rounded-xl border bg-[#1A1A1A] p-5 ${overdueAmount > 0 ? "border-red-500/40" : "border-[#2A2A2A]"}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{formatEGP(overdueAmount)}</p>
            <p className="text-xs text-white/40">Overdue</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "pending", "overdue", "paid"] as const).map((key) => (
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
            {key === "all" && invoices.length > 0 && <span className="ms-1.5 opacity-60">({invoices.length})</span>}
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
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Invoice #</th>
                {showDealerColumn && (
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Dealer</th>
                )}
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Due Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Aging</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const s = statusTone[inv.effective_status];
                return (
                  <tr key={inv.id} className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-[#00BFA6]">
                      <Link href={`/dashboard/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    {showDealerColumn && (
                      <td className="px-5 py-3 text-xs text-white/70">{dealerNameMap.get(inv.dealer_id) ?? inv.dealer_id}</td>
                    )}
                    <td className="px-5 py-3 text-white/60">{formatDate(inv.invoice_date)}</td>
                    <td className="px-5 py-3 text-white/60">{formatDate(inv.due_date)}</td>
                    <td className="px-5 py-3">
                      {inv.aging_days > 0 ? (
                        <span className="text-xs font-semibold text-red-400">{inv.aging_days}d overdue</span>
                      ) : (
                        <span className="text-xs text-white/30">Current</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={s.tone} label={s.label} />
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-white">{formatEGP(Number(inv.total_amount))}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={showDealerColumn ? 7 : 6} className="px-5 py-16 text-center text-white/30">
                    {invoices.length === 0
                      ? "No invoices yet — they appear here once an order is invoiced."
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
