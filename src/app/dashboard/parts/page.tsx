"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { categories, models } from "@/lib/catalog";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Bookmark,
  Filter,
  Check,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ShoppingCart,
  Minus,
} from "lucide-react";
import { PartThumbnail } from "@/components/parts/part-thumbnail";
import { useCart, type CartPartSnapshot } from "@/lib/cart";

type PartSearchResult = {
  part_number: string;
  name: string;
  name_ar: string;
  category: string;
  category_ar: string;
  model: string;
  oem?: string | null;
  image?: string | null;
  availability_state:
    | "AVAILABLE"
    | "PARTIALLY_AVAILABLE"
    | "NOT_AVAILABLE_WITH_ETA"
    | "NOT_AVAILABLE_NO_ETA";
  availability_label_en: string;
  availability_label_ar: string;
  quantity_available: number;
  replenishment_eta: string | null;
  unit_price: number | null;
  currency: string | null;
  stock_last_synced_at: string | null;
};

const stateTone: Record<
  PartSearchResult["availability_state"],
  "success" | "warning" | "info" | "destructive"
> = {
  AVAILABLE: "success",
  PARTIALLY_AVAILABLE: "warning",
  NOT_AVAILABLE_WITH_ETA: "info",
  NOT_AVAILABLE_NO_ETA: "destructive",
};

function formatEGP(value: number | null, currency: string | null): string {
  if (value === null) return "";
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: currency || "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Lightweight toast for add-to-cart feedback. */
function AddedToast({ name, onDone }: { name: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      role="status"
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-full bg-[#1A1A1A] border border-[#00BFA6]/30 px-4 py-2.5 text-sm text-white shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <Check className="h-4 w-4 text-[#00BFA6]" />
      <span className="max-w-[240px] truncate">{name}</span>
      <span className="text-white/50">added to order</span>
    </div>
  );
}

export default function PartsInquiry() {
  const cart = useCart();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [availFilter, setAvailFilter] = useState<
    "all" | PartSearchResult["availability_state"]
  >("all");
  const [priceableOnly, setPriceableOnly] = useState(false);
  const [items, setItems] = useState<PartSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [staleWarning, setStaleWarning] = useState<string | null>(null);
  const [inquiryLoading, setInquiryLoading] = useState<string | null>(null);
  const [toastName, setToastName] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchParts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (catFilter !== "all") params.set("category", catFilter);
      if (modelFilter !== "all") params.set("model", modelFilter);
      if (availFilter !== "all") params.set("availability", availFilter);
      if (priceableOnly) params.set("priceable_only", "true");
      params.set("limit", "200");

      const res = await fetch(`/api/parts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load parts");
      const body = await res.json();
      setItems(body.data ?? []);
      setStaleWarning(body.meta?.stale_data_warning ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load parts");
    } finally {
      setLoading(false);
    }
  }, [search, catFilter, modelFilter, availFilter, priceableOnly]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const handleAddToCart = useCallback(
    (part: PartSearchResult) => {
      if (part.unit_price === null) return;
      const snapshot: CartPartSnapshot = {
        part_number: part.part_number,
        name: part.name,
        name_ar: part.name_ar,
        category: part.category,
        model: part.model,
        oem: part.oem,
        image: part.image,
        availability_state: part.availability_state,
        availability_label_en: part.availability_label_en,
        quantity_available: part.quantity_available,
        replenishment_eta: part.replenishment_eta,
        unit_price: part.unit_price,
        currency: part.currency ?? "EGP",
      };
      cart.addItem(snapshot);
      setToastName(part.name);
    },
    [cart]
  );

  const saveInquiry = async (part: PartSearchResult) => {
    setInquiryLoading(part.part_number);
    try {
      await fetch("/api/parts/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealer_id: "self",
          part_number: part.part_number,
          quantity: 1,
          inquiry_type: "search",
        }),
      });
    } finally {
      setInquiryLoading(null);
    }
  };

  const counts = useMemo(
    () => ({
      available: items.filter((i) => i.availability_state === "AVAILABLE")
        .length,
      partial: items.filter(
        (i) => i.availability_state === "PARTIALLY_AVAILABLE"
      ).length,
      out_eta: items.filter(
        (i) => i.availability_state === "NOT_AVAILABLE_WITH_ETA"
      ).length,
      out_no_eta: items.filter(
        (i) => i.availability_state === "NOT_AVAILABLE_NO_ETA"
      ).length,
    }),
    [items]
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastName && (
        <AddedToast name={toastName} onDone={() => setToastName(null)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Parts Inquiry</h1>
          <p className="mt-1 text-sm text-white/40">
            Search by SKU, OEM reference, description, or vehicle model.
            {!cart.isEmpty && (
              <span className="ml-2 text-[#00BFA6]">
                {cart.lineCount} item{cart.lineCount !== 1 ? "s" : ""} in order
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchParts}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-xs font-semibold text-white/60 transition hover:text-white disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Stale data warning */}
      {staleWarning && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{staleWarning} — values may be out of date.</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Availability summary chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            {
              key: "AVAILABLE" as const,
              label: "Available",
              count: counts.available,
              color: "emerald",
            },
            {
              key: "PARTIALLY_AVAILABLE" as const,
              label: "Partial",
              count: counts.partial,
              color: "yellow",
            },
            {
              key: "NOT_AVAILABLE_WITH_ETA" as const,
              label: "Out — ETA",
              count: counts.out_eta,
              color: "blue",
            },
            {
              key: "NOT_AVAILABLE_NO_ETA" as const,
              label: "Out — No ETA",
              count: counts.out_no_eta,
              color: "red",
            },
          ] as const
        ).map((chip) => (
          <button
            key={chip.key}
            onClick={() =>
              setAvailFilter(availFilter === chip.key ? "all" : chip.key)
            }
            className={`rounded-lg border p-3 text-left transition ${
              availFilter === chip.key
                ? `border-${chip.color}-500 bg-${chip.color}-500/10`
                : `border-[#2A2A2A] bg-[#1A1A1A] hover:border-${chip.color}-500/40`
            }`}
          >
            <p
              className={`text-[10px] uppercase tracking-wider font-semibold text-${chip.color}-400`}
            >
              {chip.label}
            </p>
            <p className="mt-1 text-xl font-bold text-white">{chip.count}</p>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, OEM, description, vehicle..."
            className="pl-9 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-white/30"
            aria-label="Search parts"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="h-10 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#00BFA6]"
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.en}
              </option>
            ))}
          </select>
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="h-10 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#00BFA6]"
            aria-label="Filter by model"
          >
            <option value="all">All Models</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            onClick={() => setPriceableOnly(!priceableOnly)}
            className={`flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
              priceableOnly
                ? "border-[#00BFA6]/50 bg-[#00BFA6]/10 text-[#00BFA6]"
                : "border-[#2A2A2A] bg-[#1A1A1A] text-white/50 hover:text-white/70"
            }`}
          >
            {priceableOnly && <Check className="h-3.5 w-3.5" />}
            <Filter className="h-3.5 w-3.5" />
            Priceable only
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        ) : (
          <table className="w-full text-sm" role="grid" aria-label="Parts catalog">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                  Part
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                  OEM / Fits
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                  ETA
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                  Order
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((part) => {
                const stockLabel = `${part.availability_label_en}${
                  part.quantity_available > 0
                    ? ` (${part.quantity_available})`
                    : ""
                }`;
                const priceable = part.unit_price !== null;
                const inCart = cart.hasItem(part.part_number);
                const qtyInCart = cart.itemQty(part.part_number);

                return (
                  <tr
                    key={part.part_number}
                    className={`border-b border-[#2A2A2A]/50 hover:bg-white/[0.02] ${
                      inCart ? "bg-[#00BFA6]/[0.03]" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <PartThumbnail
                          src={part.image}
                          alt={part.name}
                          size="md"
                        />
                        <div>
                          <div className="font-medium text-white">
                            {part.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/30 font-mono">
                              {part.part_number}
                            </span>
                            {part.oem && (
                              <span className="text-[10px] text-white/30">
                                OEM: {part.oem}
                              </span>
                            )}
                          </div>
                          {part.name_ar && (
                            <div
                              className="text-xs text-white/40"
                              dir="rtl"
                            >
                              {part.name_ar}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60 text-xs">
                      {part.model}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={stateTone[part.availability_state]}
                        label={stockLabel}
                      />
                    </td>
                    <td className="px-4 py-3 text-white/60 text-xs">
                      {part.replenishment_eta
                        ? new Date(
                            part.replenishment_eta
                          ).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                          })
                        : part.quantity_available > 0
                        ? "In stock"
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {priceable ? (
                        <span className="font-semibold text-white">
                          {formatEGP(part.unit_price, part.currency)}
                        </span>
                      ) : (
                        <span
                          className="text-xs italic text-white/30"
                          title="Price hidden by MANSCO policy: prices are not shown for unavailable parts"
                        >
                          Price withheld
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {priceable ? (
                        inCart ? (
                          /* Inline qty controls when item is already in cart */
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                cart.setQty(
                                  part.part_number,
                                  qtyInCart - 1
                                )
                              }
                              className="h-7 w-7 flex items-center justify-center rounded border border-[#2A2A2A] text-white/50 hover:bg-[#2A2A2A] focus-visible:ring-2 focus-visible:ring-[#00BFA6]"
                              aria-label={`Decrease quantity of ${part.name}`}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-7 text-center text-xs font-semibold text-[#00BFA6]">
                              {qtyInCart}
                            </span>
                            <button
                              onClick={() =>
                                cart.setQty(
                                  part.part_number,
                                  qtyInCart + 1
                                )
                              }
                              disabled={
                                part.quantity_available > 0 &&
                                qtyInCart >= part.quantity_available
                              }
                              className="h-7 w-7 flex items-center justify-center rounded border border-[#2A2A2A] text-white/50 hover:bg-[#2A2A2A] disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-[#00BFA6]"
                              aria-label={`Increase quantity of ${part.name}`}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <span className="ml-1">
                              <ShoppingCart className="h-3.5 w-3.5 text-[#00BFA6]" />
                            </span>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-[#00BFA6]/30 text-[#00BFA6] hover:bg-[#00BFA6]/10"
                            onClick={() => handleAddToCart(part)}
                            aria-label={`Add ${part.name} to order`}
                          >
                            <Plus className="h-3.5 w-3.5" /> Add
                          </Button>
                        )
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                          onClick={() => saveInquiry(part)}
                          disabled={inquiryLoading === part.part_number}
                        >
                          {inquiryLoading === part.part_number ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Bookmark className="h-3.5 w-3.5" />
                          )}
                          Save Inquiry
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center text-white/30"
                  >
                    No parts found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom spacer for mobile floating bar */}
      {!cart.isEmpty && <div className="h-16 md:hidden" />}
    </div>
  );
}
