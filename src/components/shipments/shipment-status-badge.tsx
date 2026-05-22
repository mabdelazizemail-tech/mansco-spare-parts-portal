// src/components/shipments/shipment-status-badge.tsx

import { StatusBadge } from "@/components/portal/status-badge";
import type { ShipmentStatus } from "@/lib/shipments/validation";
import type { ToneColor } from "@/lib/portal-data";

const statusToneMap: Record<ShipmentStatus, ToneColor> = {
  pending: "muted",
  packed: "warning",
  shipped: "info",
  in_transit: "info",
  delivered: "success",
  exception: "destructive",
  returned: "warning",
  cancelled: "muted",
};

const statusLabelMap: Record<ShipmentStatus, string> = {
  pending: "Pending",
  packed: "Packed",
  shipped: "Shipped",
  in_transit: "In Transit",
  delivered: "Delivered",
  exception: "Exception",
  returned: "Returned",
  cancelled: "Cancelled",
};

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <StatusBadge
      tone={statusToneMap[status]}
      label={statusLabelMap[status]}
    />
  );
}
