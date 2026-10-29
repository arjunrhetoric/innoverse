import { cn } from "@/lib/utils";

/**
 * Skeletons mirror the final layout: same height, same rhythm, no spinner on a
 * full page. Keep the shimmer slow and low-contrast.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite] after:bg-gradient-to-r after:from-transparent after:via-foreground/[0.04] after:to-transparent",
        "motion-reduce:after:hidden",
        className
      )}
      {...props}
    />
  );
}

/** A list of rows shaped like the real table/list they stand in for. */
function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y divide-border", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-[42%]" />
            <Skeleton className="h-3 w-[26%]" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** The stat band used at the top of dashboards. */
function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card px-4 py-3">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="mt-2 h-6 w-10" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonRows, SkeletonStats };
