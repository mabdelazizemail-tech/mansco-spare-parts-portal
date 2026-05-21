"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import type { AvailabilityStatus } from "@/lib/mock-data";
import { CheckCircle, AlertTriangle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailabilityBadgeProps {
  status: AvailabilityStatus;
  stockCount?: number;
  eta?: string;
  className?: string;
}

const statusConfig: Record<
  AvailabilityStatus,
  { key: string; color: string; icon: typeof CheckCircle }
> = {
  available: {
    key: "parts.availableNow",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCircle,
  },
  partially_available: {
    key: "parts.partiallyAvailable",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    icon: AlertTriangle,
  },
  unavailable_eta: {
    key: "parts.unavailable_eta",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: Clock,
  },
  unavailable: {
    key: "parts.unavailable",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle,
  },
  partial: {
    key: "parts.partiallyAvailable",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    icon: AlertTriangle,
  },
};

export function AvailabilityBadge({
  status,
  stockCount,
  eta,
  className,
}: AvailabilityBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status] ?? statusConfig.unavailable;
  const Icon = config.icon;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Badge
        variant="outline"
        className={cn(
          "border-transparent gap-1 font-medium",
          config.color
        )}
      >
        <Icon className="size-3" />
        {t(config.key)}
      </Badge>
      {status === "available" && stockCount !== undefined && (
        <span className="text-xs text-muted-foreground">
          {stockCount} {t("parts.inStock")}
        </span>
      )}
      {(status === "partially_available" || status === "partial") && stockCount !== undefined && (
        <span className="text-xs text-muted-foreground">
          {stockCount} {t("parts.inStock")}
        </span>
      )}
      {status === "unavailable_eta" && eta && (
        <span className="text-xs text-muted-foreground">
          {t("parts.eta")}: {new Date(eta).toLocaleDateString()}
        </span>
      )}
      {status === "unavailable" && (
        <span className="text-xs text-muted-foreground">
          {t("parts.outOfStock")}
        </span>
      )}
    </div>
  );
}
