"use client";

import Image from "next/image";

type LogoSize = "sm" | "md" | "lg";

const sizeMap: Record<LogoSize, { img: number; brand: string; tag: string; gap: string }> = {
  sm: {
    img: 36,
    brand: "text-[15px]",
    tag: "text-[9px] tracking-[0.18em]",
    gap: "gap-2.5",
  },
  md: {
    img: 44,
    brand: "text-[18px]",
    tag: "text-[10px] tracking-[0.2em]",
    gap: "gap-3",
  },
  lg: {
    img: 56,
    brand: "text-[22px]",
    tag: "text-[11px] tracking-[0.22em]",
    gap: "gap-3.5",
  },
};

export function Logo({
  showText = true,
  size = "md",
}: {
  showText?: boolean;
  size?: LogoSize;
}) {
  const s = sizeMap[size];

  return (
    <div className={`flex items-center ${s.gap}`}>
      <Image
        src="/logo.png"
        alt="MANSCO"
        width={s.img}
        height={s.img}
        className="shrink-0 object-contain"
        priority
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={`${s.brand} font-bold text-white tracking-[0.04em]`}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            MANSCO
          </span>
          <span
            className={`${s.tag} mt-1 font-semibold uppercase text-white/45`}
          >
            Spare Parts Portal
          </span>
        </div>
      )}
    </div>
  );
}
