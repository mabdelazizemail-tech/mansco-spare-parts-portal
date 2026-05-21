"use client";

import { useState } from "react";
import { Package } from "lucide-react";

type Props = {
  src?: string | null;
  alt: string;
  /** One of: "sm" (h-9 w-9), "md" (h-12 w-12), "lg" (h-16 w-16). Default "sm". */
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

const iconSizeClasses: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

/**
 * Renders a part thumbnail with graceful fallback to a Package icon
 * when the image URL is missing, empty, or fails to load (404).
 *
 * Why this exists: part image URLs reference paths like /parts/brake-pad.jpg
 * that don't exist on the file system yet — they will be populated when SAP
 * starts providing real image URLs. Until then we show a clean placeholder
 * instead of broken-image icons.
 */
export function PartThumbnail({ src, alt, size = "sm", className = "" }: Props) {
  const [errored, setErrored] = useState(false);
  const showFallback = !src || errored;

  const base = `${sizeClasses[size]} flex-shrink-0 rounded-lg border border-[#2A2A2A] bg-[#111] ${className}`;

  if (showFallback) {
    return (
      <div
        className={`${base} flex items-center justify-center text-white/30`}
        aria-label={alt}
        role="img"
      >
        <Package className={iconSizeClasses[size]} />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className={`${base} object-cover`}
    />
  );
}
