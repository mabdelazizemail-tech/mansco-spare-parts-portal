// src/app/dashboard/shipments/page.tsx

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShipmentStatusBadge } from "@/components/shipments/shipment-status-badge";
import { CarrierIcon } from "@/components/shipments/carrier-icon";
import { Plus, ChevronRight } from "lucide-react";
import type { ShipmentRecord } from "@/lib/shipments/service";

export default function ShipmentsListPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const query = status === "all" ? "" : `?status=${status}`;
        const res = await fetch(`/api/shipments${query}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setShipments(json.data ?? []);
      } catch (error) {
        console.error("Error fetching shipments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Shipments</h1>
          <p className="mt-1 text-sm text-white/40">Track and manage all shipments.</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 bg-[#00BFA6] hover:bg-[#00A892]"
          onClick={() => router.push("/dashboard/shipments/new")}
        >
          <Plus className="h-4 w-4" /> Create Shipment
        </Button>
      </div>

      <div className="flex gap-2">
        {["all", "pending", "shipped", "in_transit", "delivered"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              status === s
                ? "bg-[#00BFA6] text-white"
                : "bg-[#1A1A1A] border border-[#2A2A2A] text-white/50 hover:text-white/70"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-12 text-center text-white/40">
          Loading shipments...
        </div>
      ) : shipments.length === 0 ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-12 text-center text-white/40">
          No shipments found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Shipment #</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Order</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Carrier</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Tracking</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Ship Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">ETA</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02] cursor-pointer"
                  onClick={() => router.push(`/dashboard/shipments/${s.id}`)}
                >
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-[#00BFA6]">{s.shipment_number}</td>
                  <td className="px-5 py-3 text-sm text-white/70">{s.order_id}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <CarrierIcon carrier={s.carrier_code} className="h-4 w-4" />
                      <span className="text-sm text-white">{s.carrier_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-white/60 font-mono">{s.tracking_number || "—"}</td>
                  <td className="px-5 py-3">
                    <ShipmentStatusBadge status={s.shipment_status as any} />
                  </td>
                  <td className="px-5 py-3 text-sm text-white/60">{s.ship_date || "—"}</td>
                  <td className="px-5 py-3 text-sm text-white/60">{s.eta_delivery || "—"}</td>
                  <td className="px-5 py-3">
                    <ChevronRight className="h-4 w-4 text-white/20" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
