"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { StatusBadge } from "@/components/portal/status-badge";
import type { ToneColor } from "@/lib/portal-data";
import {
  Clock,
  Truck,
  Package,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface BackOrder {
  id: string;
  order_id: string;
  part_number: string;
  part_name: string;
  quantity: number;
  original_eta: string | null;
  current_eta: string | null;
  status: "awaiting" | "in_transit" | "fulfilled" | "cancelled";
  is_at_risk: boolean;
  slippage_days: number;
}

interface EtaChange {
  id: string;
  previous_eta: string | null;
  new_eta: string | null;
  reason: string | null;
  source: string;
  changed_at: string;
}

const statusMeta: Record<BackOrder["status"], { label: string; tone: ToneColor; icon: React.ElementType }> = {
  awaiting: { label: "Awaiting", tone: "warning", icon: Clock },
  in_transit: { label: "In Transit", tone: "info", icon: Truck },
  fulfilled: { label: "Fulfilled", tone: "success", icon: Package },
  cancelled: { label: "Cancelled", tone: "muted", icon: Package },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BackOrdersPage() {
  const [rows, setRows] = useState<BackOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, EtaChange[]>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/backorders?limit=200");
      if (!res.ok) throw new Error("Failed to load back-orders");
      const body = await res.json();
      setRows(body.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load back-orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!history[id]) {
      try {
        const res = await fetch(`/api/backorders/${id}`);
        if (res.ok) {
          const body = await res.json();
          setHistory((h) => ({ ...h, [id]: body.data?.eta_history ?? [] }));
        }
      } catch {
        /* non-fatal */
      }
    }
  };

  const active = rows.filter((r) => r.status !== "cancelled");
  const awaiting = active.filter((r) => r.status === "awaiting").length;
  const inTransit = active.filter((r) => r.status === "in_transit").length;
  const fulfilled = rows.filter((r) => r.status === "fulfilled").length;
  const atRisk = active.filter((r) => r.is_at_risk).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Back Orders</h1>
          <p className="mt-1 text-sm text-white/40">Track items pending fulfillment with updated ETAs.</p>
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Awaiting", count: awaiting, icon: Clock, cls: "bg-yellow-500/10 text-yellow-400" },
          { label: "In Transit", count: inTransit, icon: Truck, cls: "bg-blue-500/10 text-blue-400" },
          { label: "Fulfilled", count: fulfilled, icon: Package, cls: "bg-green-500/10 text-green-400" },
          { label: "At Risk", count: atRisk, icon: AlertTriangle, cls: "bg-red-500/10 text-red-400" },
        ].map((card) => (
          <div
            key={card.label}
            className={`flex items-center gap-4 rounded-xl border bg-[#1A1A1A] p-5 ${
              card.label === "At Risk" && card.count > 0 ? "border-red-500/40" : "border-[#2A2A2A]"
            }`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.cls}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{card.count}</p>
              <p className="text-xs text-white/40">{card.label}</p>
            </div>
          </div>
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
                <th className="w-8 px-3 py-3" />
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Part #</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Part Name</th>
                <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-white/40">Qty</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Original ETA</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Current ETA</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Slippage</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const meta = statusMeta[r.status];
                const isOpen = expanded === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => toggleExpand(r.id)}
                      className={`cursor-pointer border-b border-[#2A2A2A]/50 hover:bg-white/[0.02] ${
                        r.is_at_risk ? "border-l-2 border-l-red-500 bg-red-500/[0.04]" : ""
                      }`}
                    >
                      <td className="px-3 py-3 text-white/30">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-white/50">{r.part_number}</td>
                      <td className="px-5 py-3 text-white">{r.part_name}</td>
                      <td className="px-5 py-3 text-center font-semibold text-white">{r.quantity}</td>
                      <td className="px-5 py-3 text-white/50">{fmtDate(r.original_eta)}</td>
                      <td className="px-5 py-3">
                        <span className={`font-semibold ${r.slippage_days > 0 ? "text-orange-400" : "text-white"}`}>
                          {fmtDate(r.current_eta)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {r.slippage_days > 0 ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${r.is_at_risk ? "text-red-400" : "text-orange-400"}`}>
                            {r.is_at_risk && <AlertTriangle className="h-3 w-3" />}+{r.slippage_days}d
                          </span>
                        ) : (
                          <span className="text-xs text-white/30">On time</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge tone={meta.tone} label={meta.label} />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-[#2A2A2A]/50 bg-black/20">
                        <td colSpan={8} className="px-12 py-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">ETA Change History</p>
                          {(history[r.id] ?? []).length === 0 ? (
                            <p className="text-xs text-white/30">No ETA changes recorded.</p>
                          ) : (
                            <ul className="space-y-2">
                              {(history[r.id] ?? []).map((h) => (
                                <li key={h.id} className="flex items-center gap-3 text-xs">
                                  <span className="text-white/40">{fmtDate(h.changed_at)}</span>
                                  <span className="text-white/60">{fmtDate(h.previous_eta)}</span>
                                  <ChevronRight className="h-3 w-3 text-white/30" />
                                  <span className="font-semibold text-white">{fmtDate(h.new_eta)}</span>
                                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/40">{h.source}</span>
                                  {h.reason && <span className="text-white/40">— {h.reason}</span>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-white/30">
                    No back-orders. Items appear here when an order is partially fulfilled.
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
