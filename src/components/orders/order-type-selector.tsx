"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import type { OrderType } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Truck, Plane, Warehouse, Check } from "lucide-react";

interface OrderTypeSelectorProps {
  selected: OrderType | null;
  onSelect: (type: OrderType) => void;
}

const types: {
  value: OrderType;
  titleKey: string;
  descKey: string;
  eta: string;
  icon: typeof Truck;
  color: string;
}[] = [
  {
    value: "daily",
    titleKey: "newOrder.dailyTitle",
    descKey: "newOrder.dailyDesc",
    eta: "3-5 days",
    icon: Truck,
    color: "border-blue-500 bg-blue-50 dark:bg-blue-950/20",
  },
  {
    value: "air_dhl",
    titleKey: "newOrder.airDhlTitle",
    descKey: "newOrder.airDhlDesc",
    eta: "1-2 days",
    icon: Plane,
    color: "border-violet-500 bg-violet-50 dark:bg-violet-950/20",
  },
  {
    value: "stock",
    titleKey: "newOrder.stockTitle",
    descKey: "newOrder.stockDesc",
    eta: "7-14 days",
    icon: Warehouse,
    color: "border-amber-500 bg-amber-50 dark:bg-amber-950/20",
  },
];

export function OrderTypeSelector({ selected, onSelect }: OrderTypeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {types.map((type) => {
        const Icon = type.icon;
        const isSelected = selected === type.value;
        return (
          <Card
            key={type.value}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md relative",
              isSelected
                ? `border-2 ${type.color}`
                : "border hover:border-muted-foreground/30"
            )}
            onClick={() => onSelect(type.value)}
          >
            {isSelected && (
              <div className="absolute top-3 end-3 size-5 rounded-full bg-[#00A3E0] text-white flex items-center justify-center">
                <Check className="size-3" />
              </div>
            )}
            <CardContent className="flex flex-col items-center text-center gap-3 p-6">
              <div
                className={cn(
                  "size-12 rounded-xl flex items-center justify-center",
                  isSelected ? "bg-[#00A3E0] text-white" : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="size-6" />
              </div>
              <h3 className="font-semibold text-base">{t(type.titleKey)}</h3>
              <p className="text-sm text-muted-foreground">{t(type.descKey)}</p>
              <span className="text-xs font-medium text-[#00A3E0]">
                {t("newOrder.estimatedDelivery")}: {type.eta}
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
