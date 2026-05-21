import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

export const Logo = ({ className, showText = true }: { className?: string; showText?: boolean }) => (
  <span className={cn("inline-flex items-center gap-2.5", className)}>
    <img
      src={logo}
      alt="Peugeot"
      width={36}
      height={40}
      className="h-9 w-auto select-none"
      style={{ filter: "drop-shadow(0 0 0 transparent)" }}
    />
    {showText && (
      <span className="hidden sm:inline-flex flex-col leading-none">
        <span className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Spare Parts
        </span>
        <span className="font-display text-base font-bold uppercase tracking-tight">
          Peugeot Egypt
        </span>
      </span>
    )}
  </span>
);
