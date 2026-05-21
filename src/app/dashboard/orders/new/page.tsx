"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/portal/status-badge";
import { PartThumbnail } from "@/components/parts/part-thumbnail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart, type CartPartSnapshot, type OrderType } from "@/lib/cart";
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Send,
  AlertTriangle,
  Truck,
  Plane,
  Warehouse,
  Search,
  Loader2,
  CheckCircle,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  Package,
  X,
} from "lucide-react";

// ── Constants ──

const ORDER_TYPE_META: Record<
  OrderType,
  {
    label: string;
    icon: React.ElementType;
    description: string;
    eta: string;
  }
> = {
  daily: {
    label: "Daily Order",
    icon: Truck,
    description: "Standard replenishment — 3-5 business days",
    eta: "3-5 days",
  },
  air_dhl: {
    label: "Air / DHL",
    icon: Plane,
    description: "Expedited delivery — 1-2 business days",
    eta: "1-2 days",
  },
  stock: {
    label: "Stock Order",
    icon: Warehouse,
    description: "Bulk allocation — 7-14 business days",
    eta: "7-14 days",
  },
};

const stateTone: Record<string, "success" | "warning" | "info" | "destructive"> = {
  AVAILABLE: "success",
  PARTIALLY_AVAILABLE: "warning",
  NOT_AVAILABLE_WITH_ETA: "info",
  NOT_AVAILABLE_NO_ETA: "destructive",
};

function formatEGP(value: number, currency?: string | null): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: currency || "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ── Steps ──
type Step = "build" | "review";

export default function NewOrderPage() {
  const router = useRouter();
  const cart = useCart();
  const [step, setStep] = useState<Step>("build");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<CartPartSnapshot[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState<{
    order_number: string;
    needs_review: boolean;
    reasons: string[];
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const submitIdRef = useRef(0); // double-submit guard

  // ── Search with debounce ──
  useEffect(() => {
    if (!search || search.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const params = new URLSearchParams({
          q: search,
          priceable_only: "true",
          limit: "10",
        });
        const res = await fetch(`/api/parts?${params}`);
        if (res.ok) {
          const body = await res.json();
          // Map API result to CartPartSnapshot (filter out null prices)
          const results: CartPartSnapshot[] = (body.data ?? [])
            .filter((p: { unit_price: number | null }) => p.unit_price !== null)
            .map(
              (p: {
                part_number: string;
                name: string;
                name_ar: string;
                category: string;
                model: string;
                oem?: string | null;
                image?: string | null;
                availability_state: string;
                availability_label_en: string;
                quantity_available: number;
                replenishment_eta: string | null;
                unit_price: number;
                currency: string | null;
              }): CartPartSnapshot => ({
                part_number: p.part_number,
                name: p.name,
                name_ar: p.name_ar,
                category: p.category,
                model: p.model,
                oem: p.oem,
                image: p.image,
                availability_state: p.availability_state,
                availability_label_en: p.availability_label_en,
                quantity_available: p.quantity_available,
                replenishment_eta: p.replenishment_eta,
                unit_price: p.unit_price,
                currency: p.currency ?? "EGP",
              })
            );
          setSearchResults(results);
        }
      } catch {
        // Silent
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAddFromSearch = useCallback(
    (part: CartPartSnapshot) => {
      cart.addItem(part);
      setSearch("");
      setSearchResults([]);
      searchInputRef.current?.focus();
    },
    [cart]
  );

  // ── Submission ──
  const handleSubmit = useCallback(async () => {
    if (cart.isEmpty || submitting) return;

    const currentId = ++submitIdRef.current;
    setSubmitting(true);
    cart.setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cart.toPayload()),
      });

      // Guard against stale response if user navigated away and back
      if (currentId !== submitIdRef.current) return;

      const body = await res.json();
      if (!res.ok) {
        setSubmitError(body.error?.message ?? "Failed to submit order");
        return;
      }

      setSubmitSuccess({
        order_number: body.data.order_number,
        needs_review: body.data.needs_review,
        reasons: body.data.review_reasons ?? [],
      });
      cart.clearCart();
    } catch (e) {
      if (currentId !== submitIdRef.current) return;
      setSubmitError(e instanceof Error ? e.message : "Network error");
    } finally {
      if (currentId === submitIdRef.current) {
        setSubmitting(false);
        cart.setSubmitting(false);
      }
    }
  }, [cart, submitting]);

  // ── Success state ──
  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <div className="rounded-full bg-[#00BFA6]/10 p-6">
          <CheckCircle className="h-12 w-12 text-[#00BFA6]" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Order Submitted!</h2>
          <p className="mt-2 text-sm text-white/40 font-mono">
            {submitSuccess.order_number}
          </p>
        </div>
        {submitSuccess.needs_review && (
          <div className="flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4 max-w-md">
            <ShieldAlert className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-400">
                Routed for Admin Review
              </p>
              {submitSuccess.reasons.map((r, i) => (
                <p key={i} className="text-xs text-yellow-400/70 mt-1">
                  {r}
                </p>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/orders")}
            className="border-[#2A2A2A] text-white/60"
          >
            View Orders
          </Button>
          <Button
            onClick={() => setSubmitSuccess(null)}
            className="bg-[#00BFA6] hover:bg-[#00A892]"
          >
            New Order
          </Button>
        </div>
      </div>
    );
  }

  // ── Review step ──
  if (step === "review") {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep("build")}
            className="text-white/50 hover:text-white"
            aria-label="Back to order builder"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Review Order</h1>
            <p className="text-sm text-white/40">
              Confirm your order details before submitting.
            </p>
          </div>
        </div>

        {/* Order type */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = ORDER_TYPE_META[cart.state.orderType].icon;
              return <Icon className="h-5 w-5 text-[#00BFA6]" />;
            })()}
            <div>
              <p className="font-semibold text-white">
                {ORDER_TYPE_META[cart.state.orderType].label}
              </p>
              <p className="text-xs text-white/40">
                Est. delivery: {ORDER_TYPE_META[cart.state.orderType].eta}
              </p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
          <div className="border-b border-[#2A2A2A] px-5 py-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Package className="h-4 w-4 text-white/40" />
              {cart.lineCount} item{cart.lineCount !== 1 ? "s" : ""}
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">
                  Part
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-white/40 uppercase">
                  Qty
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-white/40 uppercase">
                  Unit Price
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-white/40 uppercase">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody>
              {cart.state.lines.map((line) => (
                <tr
                  key={line.part.part_number}
                  className="border-b border-[#2A2A2A]/50"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <PartThumbnail
                        src={line.part.image}
                        alt={line.part.name}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium text-white">
                          {line.part.name}
                        </p>
                        <p className="text-xs text-white/30 font-mono">
                          {line.part.part_number}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center text-white">
                    {line.qty}
                  </td>
                  <td className="px-5 py-3 text-right text-white/70">
                    {formatEGP(line.part.unit_price, line.part.currency)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-white">
                    {formatEGP(
                      line.part.unit_price * line.qty,
                      line.part.currency
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#2A2A2A]">
                <td
                  colSpan={3}
                  className="px-5 py-3 text-right text-sm text-white/50"
                >
                  Subtotal
                </td>
                <td className="px-5 py-3 text-right font-bold text-white">
                  {formatEGP(cart.subtotal)}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-2 text-right text-sm text-white/50"
                >
                  VAT (14%)
                </td>
                <td className="px-5 py-2 text-right text-white/70">
                  {formatEGP(cart.vat)}
                </td>
              </tr>
              <tr className="border-t border-[#2A2A2A]">
                <td
                  colSpan={3}
                  className="px-5 py-3 text-right text-sm font-semibold text-white"
                >
                  Total
                </td>
                <td className="px-5 py-3 text-right text-lg font-bold text-white">
                  {formatEGP(cart.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {submitError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-400">
                Submission failed
              </p>
              <p className="text-xs text-red-400/70">{submitError}</p>
              <button
                onClick={handleSubmit}
                className="text-xs text-red-300 underline mt-1"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setStep("build")}
            className="border-[#2A2A2A] text-white/60"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Edit Order
          </Button>
          <Button
            className="flex-1 gap-2 bg-[#00BFA6] hover:bg-[#00A892] h-11 text-base"
            disabled={cart.isEmpty || submitting}
            onClick={handleSubmit}
            aria-label={`Submit order for ${formatEGP(cart.total)}`}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting
              ? "Submitting..."
              : `Submit Order — ${formatEGP(cart.total)}`}
          </Button>
        </div>

        {/* Trust microcopy */}
        <p className="text-center text-xs text-white/30">
          Your order will be validated against stock availability and credit
          limits. Orders exceeding thresholds are routed for admin approval.
        </p>
      </div>
    );
  }

  // ── Build step (main cart builder) ──
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/parts")}
          className="text-white/50 hover:text-white"
          aria-label="Back to parts catalog"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">New Order</h1>
          <p className="mt-1 text-sm text-white/40">
            Select order type, add parts, and review before submitting.
          </p>
        </div>
      </div>

      {/* Order Type Selector */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(Object.keys(ORDER_TYPE_META) as OrderType[]).map((type) => {
          const meta = ORDER_TYPE_META[type];
          const Icon = meta.icon;
          const selected = cart.state.orderType === type;
          return (
            <button
              key={type}
              onClick={() => cart.setOrderType(type)}
              className={`flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition-all focus-visible:ring-2 focus-visible:ring-[#00BFA6] focus-visible:outline-none ${
                selected
                  ? "border-[#00BFA6] bg-[#00BFA6]/5 ring-1 ring-[#00BFA6]/30"
                  : "border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]"
              }`}
              aria-pressed={selected}
              aria-label={`${meta.label}: ${meta.description}`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`h-5 w-5 ${selected ? "text-[#00BFA6]" : "text-white/40"}`}
                />
                <span
                  className={`font-semibold ${selected ? "text-[#00BFA6]" : "text-white"}`}
                >
                  {meta.label}
                </span>
              </div>
              <p className="text-xs text-white/40">{meta.description}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: search + cart items */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Quick Add Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Quick add: search by SKU, name, or model..."
              className="pl-9 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-white/30"
              aria-label="Search parts to add to order"
            />
            {(searchResults.length > 0 || searchLoading) &&
              search.length >= 2 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] shadow-xl max-h-72 overflow-y-auto">
                  {searchLoading && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-white/30" />
                    </div>
                  )}
                  {searchResults.map((p) => {
                    const alreadyInCart = cart.hasItem(p.part_number);
                    return (
                      <button
                        key={p.part_number}
                        onClick={() => handleAddFromSearch(p)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-white/[0.04] text-left gap-3"
                        aria-label={`Add ${p.name} to order${alreadyInCart ? " (already in cart)" : ""}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <PartThumbnail
                            src={p.image}
                            alt={p.name}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span className="text-white truncate block">
                              {p.name}
                            </span>
                            <span className="text-xs text-white/30 font-mono">
                              {p.part_number}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {alreadyInCart && (
                            <span className="text-[10px] text-[#00BFA6] font-medium">
                              IN CART
                            </span>
                          )}
                          <StatusBadge
                            tone={
                              stateTone[p.availability_state] ?? "destructive"
                            }
                            label={p.availability_label_en}
                          />
                          <span className="text-white/60 font-medium">
                            {formatEGP(p.unit_price, p.currency)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {!searchLoading && searchResults.length === 0 && (
                    <p className="px-4 py-4 text-xs text-white/30 text-center">
                      No priceable parts found
                    </p>
                  )}
                </div>
              )}
          </div>

          {/* Tip: can also add from parts page */}
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span>Tip: You can also</span>
            <Link
              href="/dashboard/parts"
              className="text-[#00BFA6] hover:underline"
            >
              browse the full catalog
            </Link>
            <span>and add items from there.</span>
          </div>

          {/* Cart Items */}
          {cart.isEmpty ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2A2A2A] py-16">
              <ShoppingCart className="h-10 w-10 text-white/10 mb-3" />
              <p className="text-sm text-white/30">
                Your order is empty. Search above or{" "}
                <Link
                  href="/dashboard/parts"
                  className="text-[#00BFA6] hover:underline"
                >
                  browse parts
                </Link>{" "}
                to add items.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
              <div className="border-b border-[#2A2A2A] px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  {cart.lineCount} item{cart.lineCount !== 1 ? "s" : ""} (
                  {cart.totalQty} units)
                </span>
                <button
                  onClick={() => cart.clearCart()}
                  className="text-xs text-white/30 hover:text-red-400 transition-colors"
                  aria-label="Clear all items"
                >
                  Clear all
                </button>
              </div>
              <table className="w-full text-sm" aria-label="Order items">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase">
                      Part
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white/40 uppercase">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase">
                      Availability
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase">
                      Net Price
                    </th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {cart.state.lines.map((line) => (
                    <tr
                      key={line.part.part_number}
                      className="border-b border-[#2A2A2A]/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <PartThumbnail
                            src={line.part.image}
                            alt={line.part.name}
                            size="sm"
                          />
                          <div>
                            <p className="font-medium text-white">
                              {line.part.name}
                            </p>
                            <p className="text-xs text-white/30 font-mono">
                              {line.part.part_number}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() =>
                              cart.setQty(
                                line.part.part_number,
                                line.qty - 1
                              )
                            }
                            className="h-7 w-7 flex items-center justify-center rounded border border-[#2A2A2A] text-white/50 hover:bg-[#2A2A2A] focus-visible:ring-2 focus-visible:ring-[#00BFA6]"
                            aria-label={`Decrease quantity of ${line.part.name}`}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            value={line.qty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 0) {
                                cart.setQty(line.part.part_number, val);
                              }
                            }}
                            min={1}
                            max={line.part.quantity_available || 9999}
                            className="h-7 w-12 rounded border border-[#2A2A2A] bg-transparent text-center text-sm text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus-visible:ring-2 focus-visible:ring-[#00BFA6]"
                            aria-label={`Quantity for ${line.part.name}`}
                          />
                          <button
                            onClick={() =>
                              cart.setQty(
                                line.part.part_number,
                                line.qty + 1
                              )
                            }
                            disabled={
                              line.part.quantity_available > 0 &&
                              line.qty >= line.part.quantity_available
                            }
                            className="h-7 w-7 flex items-center justify-center rounded border border-[#2A2A2A] text-white/50 hover:bg-[#2A2A2A] disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-[#00BFA6]"
                            aria-label={`Increase quantity of ${line.part.name}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        {line.part.quantity_available > 0 &&
                          line.qty >= line.part.quantity_available && (
                            <p className="text-[10px] text-yellow-400 text-center mt-1">
                              Max stock
                            </p>
                          )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={
                            stateTone[line.part.availability_state] ??
                            "destructive"
                          }
                          label={`${line.part.availability_label_en}${
                            line.part.quantity_available > 0
                              ? ` (${line.part.quantity_available})`
                              : ""
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {formatEGP(
                          line.part.unit_price * line.qty,
                          line.part.currency
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            cart.removeItem(line.part.part_number)
                          }
                          className="text-red-400/60 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-400 rounded p-1"
                          aria-label={`Remove ${line.part.name} from order`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Order Summary Sidebar (sticky on desktop) */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="lg:sticky lg:top-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-4">
            <h3 className="font-semibold text-white">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white/40">
                <span>Order Type</span>
                <span className="text-white">
                  {ORDER_TYPE_META[cart.state.orderType].label}
                </span>
              </div>
              <div className="flex justify-between text-white/40">
                <span>Est. Delivery</span>
                <span className="text-white">
                  {ORDER_TYPE_META[cart.state.orderType].eta}
                </span>
              </div>
              <div className="flex justify-between text-white/40">
                <span>Items</span>
                <span className="text-white">
                  {cart.lineCount} line{cart.lineCount !== 1 ? "s" : ""} (
                  {cart.totalQty} units)
                </span>
              </div>
              <div className="border-t border-[#2A2A2A] pt-2" />
              <div className="flex justify-between text-white/40">
                <span>Subtotal</span>
                <span className="text-white">{formatEGP(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-white/40">
                <span>VAT (14%)</span>
                <span className="text-white">{formatEGP(cart.vat)}</span>
              </div>
              <div className="border-t border-[#2A2A2A] pt-2" />
              <div className="flex justify-between font-semibold text-white text-base">
                <span>Total</span>
                <span>{formatEGP(cart.total)}</span>
              </div>
            </div>

            {/* Stock confirmation microcopy */}
            {!cart.isEmpty && (
              <div className="flex items-center gap-2 text-xs text-emerald-400/70">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>
                  All {cart.lineCount} items have confirmed pricing
                </span>
              </div>
            )}

            <Button
              className="w-full gap-2 bg-[#00BFA6] hover:bg-[#00A892] h-11 text-base"
              disabled={cart.isEmpty}
              onClick={() => setStep("review")}
              aria-label={
                cart.isEmpty
                  ? "Add items before reviewing"
                  : `Review order with ${cart.lineCount} items`
              }
            >
              Review Order <ArrowRight className="h-4 w-4" />
            </Button>

            {cart.isEmpty && (
              <p className="text-center text-xs text-white/30">
                Add at least one part to continue
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom CTA */}
      {!cart.isEmpty && (
        <div className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-[#111] border-t border-[#2A2A2A] px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              {formatEGP(cart.total)}
            </p>
            <p className="text-[11px] text-white/40">
              {cart.lineCount} item{cart.lineCount !== 1 ? "s" : ""} · incl. VAT
            </p>
          </div>
          <Button
            className="gap-2 bg-[#00BFA6] hover:bg-[#00A892]"
            onClick={() => setStep("review")}
          >
            Review Order <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Bottom spacer for mobile sticky bar */}
      {!cart.isEmpty && <div className="h-20 lg:hidden" />}
    </div>
  );
}
