import { cn } from "@/lib/utils";

const dotStyles: Record<string, string> = {
  default: "bg-zinc-500",
  active: "bg-emerald-500",
  success: "bg-emerald-500",
  pending: "bg-amber-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  destructive: "bg-red-500",
  info: "bg-blue-500",
  brand: "bg-brand-bright",
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
  return (
    <span className={cn("relative flex h-2 w-2 shrink-0", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-40",
            dotStyles[status] ?? dotStyles.default
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          dotStyles[status] ?? dotStyles.default
        )}
      />
    </span>
  );
}
