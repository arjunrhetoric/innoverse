import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium leading-4 whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-border-strong/60 bg-surface-2 text-muted-foreground",
        secondary: "border-border-strong/60 bg-surface-2 text-muted-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        brand: "border-brand/25 bg-brand-subtle text-brand",
        success: "border-success-border bg-success-subtle text-success",
        warning: "border-warning-border bg-warning-subtle text-warning",
        danger: "border-danger-border bg-danger-subtle text-danger",
        destructive: "border-danger-border bg-danger-subtle text-danger",
        info: "border-info-border bg-info-subtle text-info",
        solid: "border-transparent bg-primary text-primary-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/* ── One semantic mapping for every status string in the product ─────────── */

export type StatusTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const TONES: Record<string, StatusTone> = {
  // lifecycle
  draft: "neutral",
  pending: "warning",
  invited: "info",
  "invite pending": "info",
  sent: "info",
  "in review": "info",
  review: "info",
  submitted: "info",
  "changes requested": "warning",
  "needs changes": "warning",
  revision: "warning",
  approved: "success",
  active: "success",
  open: "success",
  live: "success",
  completed: "neutral",
  complete: "neutral",
  confirmed: "success",
  paid: "success",
  merged: "success",
  verified: "success",
  signed: "success",
  accepted: "success",
  closed: "neutral",
  archived: "neutral",
  withdrawn: "neutral",
  paused: "neutral",
  rejected: "danger",
  declined: "danger",
  revoked: "danger",
  failed: "danger",
  expired: "neutral",
  delivered: "brand",
  "in progress": "brand",
  "in review ": "info",
};

export function statusTone(status: string): StatusTone {
  const key = status.trim().toLowerCase();
  if (TONES[key]) return TONES[key];
  const first = key.split(/[\s/]/)[0];
  return TONES[first] ?? "neutral";
}

const TONE_VARIANT: Record<StatusTone, BadgeProps["variant"]> = {
  neutral: "default",
  brand: "brand",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
};

const TONE_DOT: Record<StatusTone, string> = {
  neutral: "bg-subtle-foreground",
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

export function StatusBadge({
  status,
  className,
  withDot = true,
}: {
  status: string;
  className?: string;
  withDot?: boolean;
}) {
  const tone = statusTone(status);
  return (
    <Badge variant={TONE_VARIANT[tone]} className={cn("capitalize", className)}>
      {withDot && <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[tone])} aria-hidden />}
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export { Badge, badgeVariants, TONE_DOT };
