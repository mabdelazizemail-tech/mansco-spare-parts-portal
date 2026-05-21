"use client";

import { Package } from "lucide-react";

interface BackOrderItem {
  name: string;
  pcs: number;
  etaDays: number;
  orderId: string;
}

const backOrders: BackOrderItem[] = [
  {
    name: "Timing Belt Kit",
    pcs: 3,
    etaDays: 17,
    orderId: "SO-2026-0414",
  },
  {
    name: "Radiator Assembly",
    pcs: 2,
    etaDays: 32,
    orderId: "SO-2026-0411",
  },
];

export function MarketingActivities() {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2A2A2A]">
          <Package className="h-4 w-4 text-white/60" />
        </div>
        <h2 className="text-lg font-semibold text-white">Back Orders</h2>
      </div>

      <div className="space-y-4">
        {backOrders.map((item) => (
          <div
            key={item.orderId}
            className="rounded-lg border border-[#2A2A2A] px-4 py-3"
          >
            <p className="text-sm font-medium text-white">{item.name}</p>
            <p className="text-xs text-white/30">
              {item.pcs} pcs &middot; ETA {item.etaDays}d &middot; {item.orderId}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
