// src/components/shipments/carrier-icon.tsx

import { getCarrierConfig } from "@/lib/shipments/carrier-config";
import type { CarrierCode } from "@/lib/shipments/validation";
import * as Icons from "lucide-react";

export function CarrierIcon({ carrier, className = "h-5 w-5" }: { carrier: CarrierCode; className?: string }) {
  const config = getCarrierConfig(carrier);
  const Icon = Icons[config.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;

  if (!Icon) return <Icons.Box className={className} />;

  return <Icon className={className} />;
}
