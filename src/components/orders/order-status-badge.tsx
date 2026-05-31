"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import type { DetailedOrderStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Send,
  Search,
  CheckCircle,
  CheckCheck,
  AlertTriangle,
  Clock,
  FileText,
  Truck,
  XCircle,
  PackageCheck,
} from "lucide-react";

const statusConfig: Record<
  DetailedOrderStatus,
  { key: string; color: string; icon: typeof Send }
> = {
  submitted: {
    key: "status.submitted",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Send,
  },
  under_review: {
    key: "status.under_review",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: Search,
  },
  approved: {
    key: "status.approved",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCircle,
  },
  done: {
    key: "status.done",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCheck,
  },
  partial: {
    key: "status.partial",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    icon: AlertTriangle,
  },
  backordered: {
    key: "status.backordered",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: Clock,
  },
  invoiced: {
    key: "status.invoiced",
    color: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
    icon: FileText,
  },
  shipped: {
    key: "status.shipped",
    color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
    icon: Truck,
  },
  rejected: {
    key: "status.rejected",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle,
  },
  delivered: {
    key: "status.delivered",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: PackageCheck,
  },
};

interface OrderStatusBadgeProps {
  status: DetailedOrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status] ?? statusConfig.submitted;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent gap-1 font-medium", config.color, className)}
    >
      <Icon className="size-3" />
      {t(config.key)}
    </Badge>
  );
}
