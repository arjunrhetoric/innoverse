"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    tone?: "neutral" | "success" | "warning" | "danger" | "brand";
  }
>(({ className, value, tone = "neutral", ...props }, ref) => {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={pct}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.10] dark:bg-foreground/[0.14]", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full rounded-full transition-[width] duration-300 ease-out",
          tone === "neutral" && "bg-foreground/70",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "danger" && "bg-danger",
          tone === "brand" && "bg-brand"
        )}
        style={{ width: `${pct}%` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

/** Labelled progress row: name, tabular value, then the bar. */
function ProgressRow({
  label,
  value,
  max = 100,
  suffix,
  tone = "neutral",
  className,
}: {
  label: React.ReactNode;
  value: number;
  max?: number;
  suffix?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "brand";
  className?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="tnum shrink-0 font-mono text-foreground">
          {suffix ?? `${pct}%`}
        </span>
      </div>
      <Progress value={pct} tone={tone} />
    </div>
  );
}

export { Progress, ProgressRow };
