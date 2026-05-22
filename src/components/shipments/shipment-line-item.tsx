// src/components/shipments/shipment-line-item.tsx

import { formatEGP } from "@/lib/portal-data";

export interface ShipmentLineItemProps {
  partNumber: string;
  partName: string;
  orderedQty: number;
  shippedQty: number;
  unitPrice: number;
}

export function ShipmentLineItem({
  partNumber,
  partName,
  orderedQty,
  shippedQty,
  unitPrice,
}: ShipmentLineItemProps) {
  const lineTotal = shippedQty * unitPrice;

  return (
    <tr className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02]">
      <td className="px-5 py-3 font-mono text-xs font-semibold text-white">{partNumber}</td>
      <td className="px-5 py-3 text-sm text-white">{partName}</td>
      <td className="px-5 py-3 text-center text-sm text-white/60">{orderedQty}</td>
      <td className="px-5 py-3 text-center text-sm text-white font-semibold">{shippedQty}</td>
      <td className="px-5 py-3 text-right text-sm text-white">{formatEGP(unitPrice)}</td>
      <td className="px-5 py-3 text-right text-sm font-semibold text-white">{formatEGP(lineTotal)}</td>
    </tr>
  );
}
