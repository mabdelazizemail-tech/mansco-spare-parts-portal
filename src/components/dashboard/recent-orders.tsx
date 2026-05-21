"use client";

import Link from "next/link";

interface OrderRow {
  id: string;
  lines: number;
  type: string;
  typeBadge: string;
  created: string;
  status: string;
  statusBadge: string;
  net: string;
}

const typeBadgeClass: Record<string, string> = {
  Daily: "bg-blue-500/20 text-blue-400",
  "Air/DHL": "bg-orange-500/20 text-orange-400",
  Stock: "bg-blue-500/20 text-blue-400",
};

const statusBadgeClass: Record<string, string> = {
  Invoiced: "bg-cyan-500/20 text-cyan-400",
  Shipped: "bg-blue-500/20 text-blue-400",
  "Back Ordered": "bg-orange-500/20 text-orange-400",
};

const recentOrders: OrderRow[] = [
  {
    id: "SO-2026-0418",
    lines: 2,
    type: "Daily",
    typeBadge: "Daily",
    created: "2026-05-18",
    status: "Invoiced",
    statusBadge: "Invoiced",
    net: "EGP 61,216",
  },
  {
    id: "SO-2026-0417",
    lines: 1,
    type: "Air/DHL",
    typeBadge: "Air/DHL",
    created: "2026-05-17",
    status: "Shipped",
    statusBadge: "Shipped",
    net: "EGP 23,200",
  },
  {
    id: "SO-2026-0414",
    lines: 2,
    type: "Daily",
    typeBadge: "Daily",
    created: "2026-05-13",
    status: "Back Ordered",
    statusBadge: "Back Ordered",
    net: "EGP 77,800",
  },
];

export function RecentOrders() {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
          <p className="mt-0.5 text-sm text-white/40">
            Submitted in the last 14 days
          </p>
        </div>
        <Link
          href="/orders"
          className="text-sm text-white/50 transition hover:text-white"
        >
          View all &rarr;
        </Link>
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-white/30">
            <th className="pb-3 font-medium">Order</th>
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium">Created</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 text-right font-medium">Net</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {recentOrders.map((order) => (
            <tr
              key={order.id}
              className="border-t border-[#2A2A2A]/50"
            >
              <td className="py-4">
                <p className="font-medium text-white">{order.id}</p>
                <p className="text-xs text-white/30">
                  {order.lines} {order.lines === 1 ? "line" : "lines"}
                </p>
              </td>
              <td className="py-4">
                <span
                  className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${typeBadgeClass[order.type]}`}
                >
                  {order.type}
                </span>
              </td>
              <td className="py-4 text-white/50">{order.created}</td>
              <td className="py-4">
                <span
                  className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${statusBadgeClass[order.status]}`}
                >
                  {order.status}
                </span>
              </td>
              <td className="py-4 text-right font-medium text-white">
                {order.net}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
