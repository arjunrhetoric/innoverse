import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/**
 * Empty states teach the next action. Always pass a real action when the user
 * can do something about it; keep the copy honest about why the list is empty.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondary,
  className,
  inset = true,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  secondary?: { label: string; onClick?: () => void; href?: string };
  className?: string;
  inset?: boolean;
}) {
  const actionButton = action ? (
    action.href ? (
      <Button size="sm" variant="default" asChild>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    ) : (
      <Button size="sm" variant="default" onClick={action.onClick}>
        {action.label}
      </Button>
    )
  ) : null;

  const secondaryButton = secondary ? (
    secondary.href ? (
      <Button size="sm" variant="ghost" asChild>
        <Link href={secondary.href}>{secondary.label}</Link>
      </Button>
    ) : (
      <Button size="sm" variant="ghost" onClick={secondary.onClick}>
        {secondary.label}
      </Button>
    )
  ) : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        inset && "rounded-lg border border-dashed border-border bg-surface/40",
        className
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card shadow-2xs">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
      )}
      {(actionButton || secondaryButton) && (
        <div className="mt-4 flex items-center gap-2">
          {actionButton}
          {secondaryButton}
        </div>
      )}
    </div>
  );
}
