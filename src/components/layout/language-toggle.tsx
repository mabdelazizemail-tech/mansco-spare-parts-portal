"use client";

import { useLocale, type Locale } from "@/lib/i18n";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageToggle({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const { locale, setLocale } = useLocale();
  const onLight = variant === "light";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          onLight
            ? "inline-flex h-9 items-center gap-1.5 rounded px-2.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            : "inline-flex h-9 items-center gap-1.5 rounded px-2.5 text-[#000000] transition-colors hover:bg-[#F5F5F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]"
        }
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-widest">
          {locale === "en" ? "EN" : "ع"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem
          onClick={() => setLocale("en" as Locale)}
          className={locale === "en" ? "font-semibold text-primary" : ""}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale("ar" as Locale)}
          className={locale === "ar" ? "font-semibold text-primary" : ""}
        >
          العربية
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
