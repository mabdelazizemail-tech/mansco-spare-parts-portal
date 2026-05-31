"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvailabilityBadge } from "@/components/parts/availability-badge";
import { useTranslation, useLocale } from "@/lib/i18n";
import type { Part } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Cog, ShoppingCart, Tag } from "lucide-react";

interface PartCardProps {
  part: Part;
  view: "grid" | "list";
  onAddToOrder?: (part: Part) => void;
}

export function PartCard({ part, view, onAddToOrder }: PartCardProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const isAvailable =
    part.availability === "available" ||
    part.availability === "partially_available";

  const showPrice = isAvailable;

  const displayName = locale === "ar" ? part.nameAr : part.name;
  const displayCategory = locale === "ar" ? part.categoryAr : part.category;

  if (view === "list") {
    return (
      <Card className="py-0">
        <CardContent className="flex items-center gap-4 p-3">
          {/* Image placeholder */}
          <div className="hidden sm:flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Cog className="size-6 text-muted-foreground" />
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">
                {part.partNumber}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {displayCategory}
              </Badge>
              {part.isCampaign && (
                <Badge className="bg-[#00A3E0] text-white text-[10px] gap-0.5">
                  <Tag className="size-2.5" />
                  {part.campaignDiscount}%
                </Badge>
              )}
            </div>
            <p className="font-semibold text-sm truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground">{part.model}</p>
          </div>

          {/* Availability */}
          <div className="hidden md:block shrink-0">
            <AvailabilityBadge
              status={part.availability}
              stockCount={part.stockCount}
              eta={part.eta ?? undefined}
            />
          </div>

          {/* Price + Action */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {showPrice ? (
              <span className="font-bold text-sm whitespace-nowrap">
                {part.price.toLocaleString()} {t("common.currency")}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">--</span>
            )}
            <Button
              size="sm"
              disabled={!isAvailable}
              onClick={() => onAddToOrder?.(part)}
              className="gap-1"
            >
              <ShoppingCart className="size-3" />
              <span className="hidden lg:inline">{t("parts.addToOrder")}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card className="flex flex-col h-full">
      {/* Image placeholder */}
      <div className="flex h-32 items-center justify-center bg-muted rounded-t-xl">
        <Cog className="size-10 text-muted-foreground/50" />
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 p-3">
        {/* Header badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">
            {displayCategory}
          </Badge>
          {part.isCampaign && (
            <Badge className="bg-[#00A3E0] text-white text-[10px] gap-0.5">
              <Tag className="size-2.5" />
              {part.campaignDiscount}% {t("dashboard.discount")}
            </Badge>
          )}
        </div>

        {/* Part number */}
        <span className="font-mono text-xs text-muted-foreground">
          {part.partNumber}
        </span>

        {/* Name */}
        <h3 className="font-semibold text-sm leading-tight">{displayName}</h3>

        {/* Model */}
        <p className="text-xs text-muted-foreground">{part.model}</p>

        {/* Availability */}
        <AvailabilityBadge
          status={part.availability}
          stockCount={part.stockCount}
          eta={part.eta ?? undefined}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price + Action */}
        <div className="flex items-center justify-between pt-2 border-t">
          {showPrice ? (
            <span className="font-bold text-base">
              {part.price.toLocaleString()} {t("common.currency")}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">--</span>
          )}
          <Button
            size="sm"
            disabled={!isAvailable}
            onClick={() => onAddToOrder?.(part)}
            className="gap-1"
          >
            <ShoppingCart className="size-3.5" />
            {t("parts.addToOrder")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
