import { cn } from "@/lib/utils";

export function Kbd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[10px] leading-none text-muted-foreground",
        className
      )}
    >
      {children}
    </kbd>
  );
}

/** Renders ⌘K on Apple platforms and Ctrl K everywhere else. */
export function CommandKbd({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-0.5", className)}>
      <Kbd className="hidden sm:inline-flex">⌘</Kbd>
      <Kbd>K</Kbd>
    </span>
  );
}
