import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PageHeader — the single page-title pattern for the app.
 * h1 is always the page title; eyebrow carries context (section, org, code).
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  back,
  meta,
  tabs,
  className,
  bordered = true,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  meta?: React.ReactNode;
  tabs?: React.ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <header className={cn("mb-6", className)}>
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1.5 flex items-center gap-2">{eyebrow}</div>}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
          {meta && <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs && <div className="mt-5">{tabs}</div>}
      {bordered && <div className="mt-6 h-px bg-border" />}
    </header>
  );
}

/** Small monospace meta pair, e.g. "Due  Mar 14" or "Repo  acme/api". */
export function Meta({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 text-xs", className)}>
      <span className="text-subtle-foreground">{label}</span>
      <span className="font-mono text-muted-foreground">{value}</span>
    </span>
  );
}
