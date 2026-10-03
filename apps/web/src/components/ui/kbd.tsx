import { cn } from "@/lib/utils";

export function Kbd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-white/[0.04] px-1 font-mono text-[11px] leading-none text-muted-foreground",
        className
      )}
    >
      {children}
    </kbd>
  );
}
