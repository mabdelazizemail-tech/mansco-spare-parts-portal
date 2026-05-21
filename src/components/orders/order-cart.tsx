"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import type { Part, OrderType } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";

export interface CartItem {
  part: Part;
  quantity: number;
}

interface OrderCartProps {
  items: CartItem[];
  orderType: OrderType | null;
  onUpdateQuantity: (partId: string, qty: number) => void;
  onRemoveItem: (partId: string) => void;
  onPlaceOrder: () => void;
  className?: string;
  disabled?: boolean;
}

const orderTypeLabels: Record<OrderType, string> = {
  daily: "newOrder.dailyTitle",
  air_dhl: "newOrder.airDhlTitle",
  stock: "newOrder.stockTitle",
};

export function OrderCart({
  items,
  orderType,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
  className,
  disabled,
}: OrderCartProps) {
  const { t } = useTranslation();

  const subtotal = items.reduce(
    (sum, item) => sum + item.part.price * item.quantity,
    0
  );

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card text-card-foreground",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <ShoppingCart className="size-4" />
          <h3 className="font-semibold text-sm">{t("newOrder.cart")}</h3>
          {items.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {items.length}
            </Badge>
          )}
        </div>
        {orderType && (
          <Badge variant="outline" className="text-xs">
            {t(orderTypeLabels[orderType])}
          </Badge>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("newOrder.emptyCart")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={item.part.id}
                className="flex items-start gap-3 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.part.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {item.part.partNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.part.price.toLocaleString()} {t("common.currency")}{" "}
                    x {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() =>
                      onUpdateQuantity(item.part.id, item.quantity - 1)
                    }
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-6 text-center text-xs font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() =>
                      onUpdateQuantity(item.part.id, item.quantity + 1)
                    }
                  >
                    <Plus className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onRemoveItem(item.part.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("newOrder.subtotal")}</span>
          <span className="font-bold">
            {subtotal.toLocaleString()} {t("common.currency")}
          </span>
        </div>
        <Button
          className="w-full"
          disabled={items.length === 0 || disabled}
          onClick={onPlaceOrder}
        >
          {t("newOrder.placeOrder")}
        </Button>
      </div>
    </div>
  );
}
