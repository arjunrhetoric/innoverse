import { cn } from "@/lib/utils";

const dotStyles: Record<string, string> = {
  default: "bg-subtle-foreground",
  muted: "bg-subtle-foreground",
  active: "bg-success",
  success: "bg-success",
  completed: "bg-success",
  online: "bg-success",
  pending: "bg-warning",
  warning: "bg-warning",
  review: "bg-info",
  info: "bg-info",
  error: "bg-danger",
  destructive: "bg-danger",
  failed: "bg-danger",
  brand: "bg-brand",
};

export function StatusDot({
  status = "default",
  pulse = false,
  className,
}: {
  status?: keyof typeof dotStyles | string;
  pulse?: boolean;
  className?: string;
}) {
  const color = dotStyles[status] ?? dotStyles.default;
  return (
    <span className={cn("relative flex h-1.5 w-1.5 shrink-0", className)} aria-hidden>
      {pulse && (
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-50", color)} />
      )}
      <span className={cn("relative inline-flex h-full w-full rounded-full", color)} />
    </span>
  );
}
