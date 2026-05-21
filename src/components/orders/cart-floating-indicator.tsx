"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

/**
 * Floating cart pill — appears at the bottom-right when the user has items
 * in their order builder and is NOT already on the new-order page.
 *
 * Mobile: full-width sticky bottom bar.
 * Desktop: compact floating pill.
 */
export function CartFloatingIndicator() {
  const { lineCount, totalQty, subtotal, isEmpty } = useCart();
  const pathname = usePathname();

  // Don't show on the new-order page itself (redundant)
  if (isEmpty || pathname === "/dashboard/orders/new") return null;

  const formattedTotal = new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(subtotal);

  return (
    <>
      {/* Desktop: floating pill bottom-right */}
      <Link
        href="/dashboard/orders/new"
        className={cn(
          "fixed bottom-6 right-6 z-50 hidden md:flex",
          "items-center gap-3 rounded-full",
          "bg-[#00BFA6] text-white shadow-lg shadow-[#00BFA6]/25",
          "px-5 py-3 text-sm font-semibold",
          "transition-all hover:bg-[#00A892] hover:shadow-xl hover:scale-[1.02]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFA6] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
        aria-label={`View order: ${lineCount} items, ${formattedTotal}`}
      >
        <span className="relative">
          <ShoppingCart className="h-5 w-5" />
          <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#00BFA6]">
            {totalQty}
          </span>
        </span>
        <span>{lineCount} item{lineCount !== 1 ? "s" : ""}</span>
        <span className="h-4 w-px bg-white/30" />
        <span>{formattedTotal}</span>
      </Link>

      {/* Mobile: full-width sticky bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 md:hidden">
        <Link
          href="/dashboard/orders/new"
          className={cn(
            "flex items-center justify-between",
            "bg-[#00BFA6] text-white",
            "px-4 py-3 text-sm font-semibold",
            "shadow-[0_-4px_20px_rgba(0,191,166,0.3)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
          )}
          aria-label={`View order: ${lineCount} items, ${formattedTotal}`}
        >
          <div className="flex items-center gap-2">
            <span className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#00BFA6]">
                {totalQty}
              </span>
            </span>
            <span>
              {lineCount} item{lineCount !== 1 ? "s" : ""} in order
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>{formattedTotal}</span>
            <span className="text-xs opacity-75">View &rarr;</span>
          </div>
        </Link>
      </div>
    </>
  );
}
