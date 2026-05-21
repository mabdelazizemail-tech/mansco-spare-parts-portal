"use client";

import { StatusBadge } from "@/components/portal/status-badge";
import type { ToneColor } from "@/lib/portal-data";
import {
  Clock,
  Truck,
  Package,
  AlertTriangle,
} from "lucide-react";

interface BackorderRow {
  orderId: string;
  partNumber: string;
  partName: string;
  qty: number;
  originalEta: string;
  updatedEta: string;
  status: "awaiting" | "in_transit" | "fulfilled";
}

const rows: BackorderRow[] = [
  { orderId: "ORD-2026-1275", partNumber: "1007802380", partName: "Radiator Assembly", qty: 3, originalEta: "2026-06-05", updatedEta: "2026-06-20", status: "awaiting" },
  { orderId: "ORD-2026-1275", partNumber: "9816164280", partName: "Side Mirror Glass Left", qty: 5, originalEta: "2026-05-28", updatedEta: "2026-06-04", status: "in_transit" },
  { orderId: "ORD-2026-1281", partNumber: "5271CC", partName: "Rear Shock Absorber", qty: 4, originalEta: "2026-05-20", updatedEta: "2026-05-25", status: "fulfilled" },
  { orderId: "ORD-2026-1282", partNumber: "1637756080", partName: "Water Pump", qty: 2, originalEta: "2026-06-01", updatedEta: "2026-06-10", status: "awaiting" },
  { orderId: "ORD-2026-1282", partNumber: "9818232480", partName: "Cabin Air Filter", qty: 10, originalEta: "2026-05-30", updatedEta: "2026-05-30", status: "in_transit" },
];

const statusMeta: Record<BackorderRow["status"], { label: string; tone: ToneColor; icon: React.ElementType }> = {
  awaiting: { label: "Awaiting", tone: "warning", icon: Clock },
  in_transit: { label: "In Transit", tone: "info", icon: Truck },
  fulfilled: { label: "Fulfilled", tone: "success", icon: Package },
};

export default function BackOrdersPage() {
  const awaiting = rows.filter((r) => r.status === "awaiting").length;
  const inTransit = rows.filter((r) => r.status === "in_transit").length;
  const fulfilled = rows.filter((r) => r.status === "fulfilled").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Back Orders</h1>
        <p className="mt-1 text-sm text-white/40">Track items pending fulfillment with updated ETAs.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Awaiting", count: awaiting, icon: Clock, cls: "bg-yellow-500/10 text-yellow-400" },
          { label: "In Transit", count: inTransit, icon: Truck, cls: "bg-blue-500/10 text-blue-400" },
          { label: "Fulfilled", count: fulfilled, icon: Package, cls: "bg-green-500/10 text-green-400" },
        ].map((card) => (
          <div key={card.label} className="flex items-center gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.cls}`}><card.icon className="h-5 w-5" /></div>
            <div><p className="text-2xl font-bold text-white">{card.count}</p><p className="text-xs text-white/40">{card.label}</p></div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Order</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Part #</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Part Name</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-white/40 uppercase tracking-wider">Qty</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Original ETA</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Updated ETA</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const meta = statusMeta[r.status];
              const delayed = r.updatedEta > r.originalEta;
              return (
                <tr key={i} className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-[#00BFA6]">{r.orderId}</td>
                  <td className="px-5 py-3 font-mono text-xs text-white/50">{r.partNumber}</td>
                  <td className="px-5 py-3 text-white">{r.partName}</td>
                  <td className="px-5 py-3 text-center font-semibold text-white">{r.qty}</td>
                  <td className="px-5 py-3 text-white/50">{r.originalEta}</td>
                  <td className="px-5 py-3">
                    <span className={`font-semibold ${delayed ? "text-orange-400" : "text-white"}`}>{r.updatedEta}</span>
                    {delayed && <AlertTriangle className="inline ml-1.5 h-3 w-3 text-orange-400" />}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={meta.tone} label={meta.label} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
