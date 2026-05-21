import { cn } from "@/lib/utils";

export const StatusBadge = ({ tone, children, className }: { tone: string; children: React.ReactNode; className?: string }) => (
  <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border", tone, className)}>
    {children}
  </span>
);

export const Dot = ({ className }: { className?: string }) => (
  <span className={cn("h-1.5 w-1.5 rounded-full bg-current", className)} />
);
