import { cn } from "@/lib/utils";

/**
 * A single metric. Numbers are always tabular so columns of stats line up.
 */
export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  className,
  align = "left",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("flex flex-col gap-1", align === "right" && "items-end text-right", className)}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-subtle-foreground" />}
        <p className="text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="tnum text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Horizontal band of stats divided by hairlines — the dashboard header unit. */
export function StatBand({
  items,
  className,
}: {
  items: { label: string; value: React.ReactNode; hint?: string; href?: string }[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border",
        items.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3",
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="bg-card px-4 py-3">
          <dt className="text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {item.label}
          </dt>
          <dd className="tnum mt-1 text-xl font-semibold tracking-tight text-foreground">
            {item.value}
          </dd>
          {item.hint && <dd className="mt-0.5 text-2xs text-subtle-foreground">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
