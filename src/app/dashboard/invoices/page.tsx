"use client";

import { useState, useMemo } from "react";
import { formatEGP, usePortal } from "@/lib/portal-data";
import { StatusBadge } from "@/components/portal/status-badge";
import {
  FileText,
  CheckCircle,
  Clock,
} from "lucide-react";

export default function InvoicesPage() {
  const { orders } = usePortal();
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");

  const invoices = useMemo(() =>
    orders
      .filter((o) => o.invoiceNumber)
      .map((o) => ({
        id: o.invoiceNumber!,
        orderId: o.id,
        date: o.createdAt,
        amount: o.totalAmount,
        status: (o.status === "delivered" || o.status === "done" ? "paid" : "pending") as "paid" | "pending",
        dueDate: new Date(new Date(o.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })),
    [orders]
  );

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = totalInvoiced - totalPaid;
  const filtered = filter === "all" ? invoices : invoices.filter((i) => i.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Invoices</h1>
        <p className="mt-1 text-sm text-white/40">Statements, aging, and payment confirmations.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10"><FileText className="h-5 w-5 text-blue-400" /></div>
          <div><p className="text-2xl font-bold text-white">{formatEGP(totalInvoiced)}</p><p className="text-xs text-white/40">Total Invoiced</p></div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-400" /></div>
          <div><p className="text-2xl font-bold text-white">{formatEGP(totalPaid)}</p><p className="text-xs text-white/40">Paid</p></div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10"><Clock className="h-5 w-5 text-orange-400" /></div>
          <div><p className="text-2xl font-bold text-white">{formatEGP(totalPending)}</p><p className="text-xs text-white/40">Pending</p></div>
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "paid", "pending"] as const).map((key) => (
          <button key={key} onClick={() => setFilter(key)} className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${filter === key ? "bg-[#00BFA6] text-white" : "bg-[#1A1A1A] border border-[#2A2A2A] text-white/50 hover:text-white/70"}`}>
            {key === "all" ? "All" : key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Invoice #</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Order</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Date</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Due Date</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.id} className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02]">
                <td className="px-5 py-3 font-mono text-xs font-semibold text-white">{inv.id}</td>
                <td className="px-5 py-3 font-mono text-xs text-[#00BFA6]">{inv.orderId}</td>
                <td className="px-5 py-3 text-white/60">{new Date(inv.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                <td className="px-5 py-3 text-white/60">{new Date(inv.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                <td className="px-5 py-3">
                  <StatusBadge tone={inv.status === "paid" ? "success" : "warning"} label={inv.status === "paid" ? "Paid" : "Pending"} />
                </td>
                <td className="px-5 py-3 text-right font-semibold text-white">{formatEGP(inv.amount)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-16 text-center text-white/30">No invoices found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
