"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/portal/status-badge";
import {
  Truck,
  AlertTriangle,
  Receipt,
  Wallet,
  Loader2,
  RefreshCw,
  CalendarClock,
  XCircle,
} from "lucide-react";

interface AtRiskBackOrder {
  id: string;
  order_id: string;
  part_number: string;
  part_name: string;
  quantity: number;
  current_eta: string | null;
  slippage_days: number;
}
interface OverdueInvoice {
  id: string;
  invoice_number: string;
  dealer_id: string;
  due_date: string;
  total_amount: number;
  outstanding_balance: number;
  aging_days: number;
}
interface PendingShipment {
  id: string;
  shipment_number: string;
  order_id: string;
  carrier_code: string;
  eta_delivery: string | null;
}

interface Overview {
  kpis: {
    shipments_in_transit: number;
    invoices_overdue: number;
    backorders_at_risk: number;
    outstanding_balance: number;
  };
  queues: {
    at_risk_backorders: AtRiskBackOrder[];
    overdue_invoices: OverdueInvoice[];
    pending_shipments: PendingShipment[];
  };
}

type Tab = "backorders" | "invoices" | "shipments";

function fmtEGP(value: number): string {
  return new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(value);
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminFulfillmentPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("backorders");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/fulfillment/overview");
      if (!res.ok) throw new Error("Failed to load fulfillment overview");
      const body = await res.json();
      setData(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateEta = async (id: string) => {
    const value = window.prompt("New ETA (YYYY-MM-DD), or leave blank to clear:");
    if (value === null) return;
    const reason = window.prompt("Reason for the ETA change (optional):") ?? undefined;
    setBusyId(id);
    try {
      const res = await fetch(`/api/backorders/${id}/eta`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_eta: value.trim() || null, reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Failed to update ETA");
      }
      await fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update ETA");
    } finally {
      setBusyId(null);
    }
  };

  const cancelBackorder = async (id: string) => {
    if (!window.confirm("Cancel this back-order line?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/backorders/${id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Failed to cancel");
      }
      await fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setBusyId(null);
    }
  };

  const kpis = data?.kpis;
  const kpiCards = [
    { label: "Shipments In Transit", value: kpis?.shipments_in_transit ?? 0, icon: Truck, cls: "bg-blue-500/10 text-blue-400" },
    { label: "Invoices Overdue", value: kpis?.invoices_overdue ?? 0, icon: Receipt, cls: "bg-red-500/10 text-red-400" },
    { label: "Back-Orders At Risk", value: kpis?.backorders_at_risk ?? 0, icon: AlertTriangle, cls: "bg-orange-500/10 text-orange-400" },
    { label: "Outstanding Balance", value: fmtEGP(kpis?.outstanding_balance ?? 0), icon: Wallet, cls: "bg-emerald-500/10 text-emerald-400" },
  ];

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "backorders", label: "At-Risk Back-Orders", count: data?.queues.at_risk_backorders.length ?? 0 },
    { key: "invoices", label: "Overdue Invoices", count: data?.queues.overdue_invoices.length ?? 0 },
    { key: "shipments", label: "Pending Shipments", count: data?.queues.pending_shipments.length ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fulfillment Dashboard</h1>
          <p className="mt-1 text-sm text-white/40">Cross-dealer fulfillment health and action queues.</p>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((c) => (
          <div key={c.label} className="flex items-center gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.cls}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{c.value}</p>
              <p className="text-xs text-white/40">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? "bg-[#00BFA6] text-white"
                : "bg-[#1A1A1A] border border-[#2A2A2A] text-white/50 hover:text-white/70"
            }`}
          >
            {t.label}
            {t.count > 0 && <span className="ms-1.5 opacity-60">({t.count})</span>}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        ) : tab === "backorders" ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Part</th>
                <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-white/40">Qty</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Current ETA</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Slippage</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.queues.at_risk_backorders ?? []).map((b) => (
                <tr key={b.id} className="border-b border-[#2A2A2A]/50">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/orders/${b.order_id}`} className="text-white hover:underline">
                      {b.part_name}
                    </Link>
                    <span className="ms-2 font-mono text-xs text-white/40">{b.part_number}</span>
                  </td>
                  <td className="px-5 py-3 text-center text-white">{b.quantity}</td>
                  <td className="px-5 py-3 text-white/60">{fmtDate(b.current_eta)}</td>
                  <td className="px-5 py-3 text-xs font-semibold text-red-400">+{b.slippage_days}d</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => updateEta(b.id)}
                        disabled={busyId === b.id}
                        className="inline-flex items-center gap-1 rounded border border-[#2A2A2A] px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-50"
                      >
                        <CalendarClock className="h-3 w-3" /> ETA
                      </button>
                      <button
                        onClick={() => cancelBackorder(b.id)}
                        disabled={busyId === b.id}
                        className="inline-flex items-center gap-1 rounded border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <XCircle className="h-3 w-3" /> Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.queues.at_risk_backorders.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-white/30">No at-risk back-orders. 🎉</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : tab === "invoices" ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Invoice #</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Due Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Aging</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {(data?.queues.overdue_invoices ?? []).map((i) => (
                <tr key={i.id} className="border-b border-[#2A2A2A]/50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-[#00BFA6]">
                    <Link href={`/dashboard/invoices/${i.id}`} className="hover:underline">{i.invoice_number}</Link>
                  </td>
                  <td className="px-5 py-3 text-white/60">{fmtDate(i.due_date)}</td>
                  <td className="px-5 py-3 text-xs font-semibold text-red-400">{i.aging_days}d overdue</td>
                  <td className="px-5 py-3 text-right font-semibold text-white">{fmtEGP(i.outstanding_balance)}</td>
                </tr>
              ))}
              {(data?.queues.overdue_invoices.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-white/30">No overdue invoices.</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Shipment #</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Carrier</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">ETA</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.queues.pending_shipments ?? []).map((sh) => (
                <tr key={sh.id} className="border-b border-[#2A2A2A]/50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-white">
                    <Link href={`/dashboard/orders/${sh.order_id}`} className="text-[#00BFA6] hover:underline">
                      {sh.shipment_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 uppercase text-white/70">{sh.carrier_code}</td>
                  <td className="px-5 py-3 text-white/60">{fmtDate(sh.eta_delivery)}</td>
                  <td className="px-5 py-3"><StatusBadge tone="warning" label="Pending" /></td>
                </tr>
              ))}
              {(data?.queues.pending_shipments.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-white/30">No pending shipments.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
