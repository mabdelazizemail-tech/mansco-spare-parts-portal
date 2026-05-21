"use client";

import Image from "next/image";
import { useTranslation } from "@/lib/i18n";

export function Logo({
  showText = true,
}: {
  showText?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      <Image
        src="/peugeot-logo.png"
        alt="Peugeot"
        width={96}
        height={96}
        className="shrink-0 object-contain"
        style={{ filter: "brightness(0) invert(1)" }}
      />
      {showText && (
        <div className="flex flex-col leading-tight">
          <span
            className="text-[22px] font-bold text-white tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            MANSCO
          </span>
          <span className="text-[11px] uppercase tracking-[0.14em] text-white/40">
            Spare Parts Portal
          </span>
        </div>
      )}
    </div>
  );
}
