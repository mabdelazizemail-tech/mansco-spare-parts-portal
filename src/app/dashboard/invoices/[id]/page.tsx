"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/portal/status-badge";
import type { ToneColor } from "@/lib/portal-data";
import { ArrowLeft, Loader2 } from "lucide-react";

interface InvoiceLine {
  id: string;
  part_number: string;
  part_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  order_id: string;
  order_number: string | null;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  currency: string;
  outstanding_balance: number;
  aging_days: number;
  effective_status: "pending" | "paid" | "overdue" | "cancelled";
  delivery_note: string | null;
  lines: InvoiceLine[];
}

const statusTone: Record<InvoiceDetail["effective_status"], { tone: ToneColor; label: string }> = {
  paid: { tone: "success", label: "Paid" },
  pending: { tone: "warning", label: "Pending" },
  overdue: { tone: "destructive", label: "Overdue" },
  cancelled: { tone: "muted", label: "Cancelled" },
};

function fmtEGP(value: number): string {
  return new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 2 }).format(value);
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/invoices/${id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message ?? "Failed to load invoice");
        }
        const body = await res.json();
        setInv(body.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    );
  }

  if (error || !inv) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/invoices" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </Link>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error || "Invoice not found"}
        </div>
      </div>
    );
  }

  const s = statusTone[inv.effective_status];

  const summaryCards = [
    { label: "Total", value: fmtEGP(Number(inv.total_amount)) },
    { label: "Subtotal", value: fmtEGP(Number(inv.subtotal)) },
    { label: "VAT (14%)", value: fmtEGP(Number(inv.vat_amount)) },
    { label: "Outstanding", value: fmtEGP(inv.outstanding_balance) },
  ];

  return (
    <div className="space-y-6">
      <Link href="/dashboard/invoices" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to Invoices
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-white">{inv.invoice_number}</h1>
            <StatusBadge tone={s.tone} label={s.label} />
          </div>
          <p className="mt-1 text-sm text-white/40">
            Order{" "}
            {inv.order_number ? (
              <Link href={`/dashboard/orders/${inv.order_id}`} className="text-[#00BFA6] hover:underline">
                {inv.order_number}
              </Link>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-white/40">Issued {fmtDate(inv.invoice_date)}</p>
          <p className={inv.aging_days > 0 ? "font-semibold text-red-400" : "text-white/40"}>
            Due {fmtDate(inv.due_date)}
            {inv.aging_days > 0 && ` (${inv.aging_days}d overdue)`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <p className="text-xs text-white/40">{c.label}</p>
            <p className="mt-1 text-lg font-bold text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="border-b border-[#2A2A2A] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white/40">
          Line Items
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Part #</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Description</th>
              <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-white/40">Qty</th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">Unit Price</th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l) => (
              <tr key={l.id} className="border-b border-[#2A2A2A]/50">
                <td className="px-5 py-3 font-mono text-xs text-white/50">{l.part_number}</td>
                <td className="px-5 py-3 text-white">{l.part_name}</td>
                <td className="px-5 py-3 text-center text-white">{l.quantity}</td>
                <td className="px-5 py-3 text-right text-white/70">{fmtEGP(Number(l.unit_price))}</td>
                <td className="px-5 py-3 text-right font-semibold text-white">{fmtEGP(Number(l.line_total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inv.delivery_note && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Delivery Note</p>
          <p className="mt-1 text-sm text-white/70">{inv.delivery_note}</p>
        </div>
      )}
    </div>
  );
}
