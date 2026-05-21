"use client";

import { useState } from "react";
import { formatEGP, type ToneColor } from "@/lib/portal-data";
import { inquiries, lostSales } from "@/lib/mock-data";
import { StatusBadge } from "@/components/portal/status-badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";

const inquiryTone: Record<string, ToneColor> = {
  open: "warning",
  replied: "info",
  closed: "success",
};

const inquiryLabel: Record<string, string> = {
  open: "Open",
  replied: "Replied",
  closed: "Closed",
};

export default function InquiriesLog() {
  const [tab, setTab] = useState<"inquiries" | "lost-sales">("inquiries");
  const [search, setSearch] = useState("");

  const filteredInquiries = inquiries.filter((inq) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return inq.partNumber.toLowerCase().includes(q) || inq.message.toLowerCase().includes(q) || inq.id.toLowerCase().includes(q);
  });

  const filteredLostSales = lostSales.filter((ls) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return ls.partNumber.toLowerCase().includes(q) || ls.customerName.toLowerCase().includes(q) || ls.reason.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Inquiry Log</h1>
        <p className="mt-1 text-sm text-white/40">Track your part inquiries and lost sale reports.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab("inquiries")} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === "inquiries" ? "bg-[#00BFA6] text-white" : "bg-[#1A1A1A] border border-[#2A2A2A] text-white/50 hover:text-white/70"}`}>
          <MessageSquare className="h-3.5 w-3.5" /> Inquiries ({inquiries.length})
        </button>
        <button onClick={() => setTab("lost-sales")} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === "lost-sales" ? "bg-[#00BFA6] text-white" : "bg-[#1A1A1A] border border-[#2A2A2A] text-white/50 hover:text-white/70"}`}>
          <AlertTriangle className="h-3.5 w-3.5" /> Lost Sales ({lostSales.length})
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === "inquiries" ? "Search inquiries..." : "Search lost sales..."} className="pl-9 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-white/30" />
      </div>

      {tab === "inquiries" && (
        <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">ID</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Part #</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Message</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map((inq) => (
                <tr key={inq.id} className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-mono text-xs text-white/60">{inq.id}</td>
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-white">{inq.partNumber}</td>
                  <td className="px-5 py-3 text-white/70 max-w-md truncate">{inq.message}</td>
                  <td className="px-5 py-3 text-white/50">{new Date(inq.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={inquiryTone[inq.status]} label={inquiryLabel[inq.status]} />
                  </td>
                </tr>
              ))}
              {filteredInquiries.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-16 text-center text-white/30">No inquiries found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "lost-sales" && (
        <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">ID</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Part #</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Reason</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider">Est. Value</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredLostSales.map((ls) => (
                <tr key={ls.id} className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-mono text-xs text-white/60">{ls.id}</td>
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-white">{ls.partNumber}</td>
                  <td className="px-5 py-3 text-white/70">{ls.customerName}</td>
                  <td className="px-5 py-3 text-white/50 max-w-xs truncate">{ls.reason}</td>
                  <td className="px-5 py-3 text-right font-semibold text-white">{formatEGP(ls.estimatedValue)}</td>
                  <td className="px-5 py-3 text-white/50">{new Date(ls.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                </tr>
              ))}
              {filteredLostSales.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-white/30">No lost sales found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
