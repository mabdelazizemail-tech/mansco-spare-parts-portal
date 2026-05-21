"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";
import { partCategories, partModels } from "@/lib/mock-data";
import type { AvailabilityStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Search,
  SlidersHorizontal,
  X,
  LayoutGrid,
  List,
} from "lucide-react";

export interface PartsFilters {
  search: string;
  category: string;
  model: string;
  availability: AvailabilityStatus | "all";
  campaignOnly: boolean;
}

interface SearchBarProps {
  filters: PartsFilters;
  onFiltersChange: (filters: PartsFilters) => void;
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
  resultCount: number;
  totalCount: number;
}

export function SearchBar({
  filters,
  onFiltersChange,
  view,
  onViewChange,
  resultCount,
  totalCount,
}: SearchBarProps) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const quickFilter = filters.campaignOnly
    ? "campaign"
    : filters.availability === "available"
      ? "available"
      : "all";

  function setQuickFilter(qf: string) {
    onFiltersChange({
      ...filters,
      campaignOnly: qf === "campaign",
      availability: qf === "available" ? "available" : "all",
    });
  }

  function clearFilters() {
    onFiltersChange({
      search: "",
      category: "",
      model: "",
      availability: "all",
      campaignOnly: false,
    });
  }

  const hasActiveFilters =
    filters.search ||
    filters.category ||
    filters.model ||
    filters.availability !== "all" ||
    filters.campaignOnly;

  return (
    <div className="flex flex-col gap-3">
      {/* Search row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="ps-9 h-10"
            placeholder={t("parts.search")}
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="gap-1.5"
          >
            <SlidersHorizontal className="size-4" />
            <span className="hidden sm:inline">{t("parts.advancedFilters")}</span>
          </Button>
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => onViewChange("grid")}
              aria-label={t("parts.gridView")}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => onViewChange("list")}
              aria-label={t("parts.listView")}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "available", "campaign"] as const).map((qf) => (
          <button
            key={qf}
            type="button"
            onClick={() => setQuickFilter(qf)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors border cursor-pointer",
              quickFilter === qf
                ? "bg-[#00A3E0] text-white border-[#00A3E0]"
                : "bg-background text-foreground border-border hover:bg-muted"
            )}
          >
            {qf === "all" && t("common.all")}
            {qf === "available" && t("parts.available")}
            {qf === "campaign" && t("parts.campaignItems")}
          </button>
        ))}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-3" />
            {t("parts.clearFilters")}
          </button>
        )}
        <span className="ms-auto text-xs text-muted-foreground">
          {t("common.showing")} {resultCount} {t("common.of")} {totalCount}{" "}
          {t("parts.results")}
        </span>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg border bg-muted/30">
          <Select
            value={filters.category || "__all__"}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, category: v === "__all__" ? "" : v })
            }
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t("parts.all_categories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("parts.all_categories")}</SelectItem>
              {partCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.model || "__all__"}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, model: v === "__all__" ? "" : v })
            }
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t("parts.all_models")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("parts.all_models")}</SelectItem>
              {partModels.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.availability}
            onValueChange={(v) =>
              onFiltersChange({
                ...filters,
                availability: v as AvailabilityStatus | "all",
              })
            }
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t("parts.filter_availability")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("parts.allAvailability")}</SelectItem>
              <SelectItem value="available">{t("parts.availableNow")}</SelectItem>
              <SelectItem value="partially_available">
                {t("parts.partiallyAvailable")}
              </SelectItem>
              <SelectItem value="unavailable_eta">
                {t("parts.unavailable_eta")}
              </SelectItem>
              <SelectItem value="unavailable">{t("parts.unavailable")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
