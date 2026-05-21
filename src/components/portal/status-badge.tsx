"use client";

import React from "react";
import { type ToneColor } from "@/lib/portal-data";
import { cn } from "@/lib/utils";

const toneClasses: Record<ToneColor, { bg: string; text: string; dot: string }> = {
  success: {
    bg: "bg-success/15",
    text: "text-success",
    dot: "bg-success",
  },
  warning: {
    bg: "bg-warning/15",
    text: "text-warning",
    dot: "bg-warning",
  },
  destructive: {
    bg: "bg-destructive/15",
    text: "text-destructive",
    dot: "bg-destructive",
  },
  info: {
    bg: "bg-info/15",
    text: "text-info",
    dot: "bg-info",
  },
  muted: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  accent: {
    bg: "bg-accent/15",
    text: "text-accent",
    dot: "bg-accent",
  },
};

export function Dot({
  tone,
  pulse = false,
  className,
}: {
  tone: ToneColor;
  pulse?: boolean;
  className?: string;
}) {
  const classes = toneClasses[tone] ?? toneClasses.muted;
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        classes.dot,
        pulse && "pulse-dot",
        className
      )}
    />
  );
}

export function StatusBadge({
  tone,
  label,
  showDot = true,
  pulse = false,
  className,
}: {
  tone: ToneColor;
  label: string;
  showDot?: boolean;
  pulse?: boolean;
  className?: string;
}) {
  const classes = toneClasses[tone] ?? toneClasses.muted;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        classes.bg,
        classes.text,
        className
      )}
    >
      {showDot && <Dot tone={tone} pulse={pulse} />}
      {label}
    </span>
  );
}
