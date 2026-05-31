"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { formatEGP, type ToneColor } from "@/lib/portal-data";
import { StatusBadge } from "@/components/portal/status-badge";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare, AlertTriangle, Loader2 } from "lucide-react";

interface Inquiry {
  id: string;
  part_number: string;
  quantity: number;
  inquiry_type: "search" | "order_attempt";
  availability_at_inquiry: string | null;
  created_at: string;
}

interface LostSale {
  id: string;
  part_number: string;
  quantity: number;
  reason: string;
  eta_if_available: string | null;
  estimated_value: number;
  created_at: string;
}

const availabilityTone: Record<string, ToneColor> = {
  AVAILABLE: "success",
  PARTIALLY_AVAILABLE: "warning",
  NOT_AVAILABLE_WITH_ETA: "warning",
  NOT_AVAILABLE_NO_ETA: "destructive",
};

const reasonLabels: Record<string, string> = {
  partial_stock: "Partial Stock",
  out_of_stock: "Out of Stock",
  no_eta: "No ETA",
  credit_block: "Credit Block",
  quota_exceeded: "Quota Exceeded",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function InquiriesLog() {
  const [tab, setTab] = useState<"inquiries" | "lost-sales">("inquiries");
  const [search, setSearch] = useState("");
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [lostSales, setLostSales] = useState<LostSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [inqRes, lsRes] = await Promise.all([
        fetch("/api/inquiries?limit=500"),
        fetch("/api/lost-sales?limit=500"),
      ]);
      if (!inqRes.ok) throw new Error("Failed to load inquiries");
      const inqBody = await inqRes.json();
      setInquiries(inqBody.data ?? []);
      if (lsRes.ok) {
        const lsBody = await lsRes.json();
        setLostSales(lsBody.data ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inquiry log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredInquiries = useMemo(() => {
    if (!search) return inquiries;
    const q = search.toLowerCase();
    return inquiries.filter((inq) => inq.part_number.toLowerCase().includes(q));
  }, [inquiries, search]);

  const filteredLostSales = useMemo(() => {
    if (!search) return lostSales;
    const q = search.toLowerCase();
    return lostSales.filter((ls) => ls.part_number.toLowerCase().includes(q) || ls.reason.toLowerCase().includes(q));
  }, [lostSales, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Inquiry Log</h1>
        <p className="mt-1 text-sm text-white/40">Track your part inquiries and lost sale reports.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setTab("inquiries")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "inquiries" ? "bg-[#00BFA6] text-white" : "bg-[#1A1A1A] border border-[#2A2A2A] text-white/50 hover:text-white/70"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Inquiries ({inquiries.length})
        </button>
        <button
          onClick={() => setTab("lost-sales")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "lost-sales" ? "bg-[#00BFA6] text-white" : "bg-[#1A1A1A] border border-[#2A2A2A] text-white/50 hover:text-white/70"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Lost Sales ({lostSales.length})
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === "inquiries" ? "Search by part number..." : "Search lost sales..."}
          className="pl-9 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-white/30"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-20">
          <Loader2 className="h-6 w-6 animate-spin text-white/30" />
        </div>
      ) : tab === "inquiries" ? (
        <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Part #</th>
                <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-white/40">Qty</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Type</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Availability</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map((inq) => (
                <tr key={inq.id} className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-white">{inq.part_number}</td>
                  <td className="px-5 py-3 text-center text-white/70">{inq.quantity}</td>
                  <td className="px-5 py-3 text-white/60">{inq.inquiry_type === "order_attempt" ? "Order attempt" : "Search"}</td>
                  <td className="px-5 py-3">
                    {inq.availability_at_inquiry ? (
                      <StatusBadge
                        tone={availabilityTone[inq.availability_at_inquiry] ?? "muted"}
                        label={inq.availability_at_inquiry.replaceAll("_", " ").toLowerCase()}
                      />
                    ) : (
                      <span className="text-xs text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-white/50">{fmtDate(inq.created_at)}</td>
                </tr>
              ))}
              {filteredInquiries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-white/30">No inquiries found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Part #</th>
                <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-white/40">Qty</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Reason</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">ETA If Available</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">Est. Value</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredLostSales.map((ls) => (
                <tr key={ls.id} className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-white">{ls.part_number}</td>
                  <td className="px-5 py-3 text-center text-white/70">{ls.quantity}</td>
                  <td className="px-5 py-3 text-white/60">{reasonLabels[ls.reason] ?? ls.reason}</td>
                  <td className="px-5 py-3 text-white/50">{ls.eta_if_available ? fmtDate(ls.eta_if_available) : "—"}</td>
                  <td className="px-5 py-3 text-right font-semibold text-white">
                    {ls.estimated_value > 0 ? formatEGP(ls.estimated_value) : "—"}
                  </td>
                  <td className="px-5 py-3 text-white/50">{fmtDate(ls.created_at)}</td>
                </tr>
              ))}
              {filteredLostSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-white/30">No lost sales found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
