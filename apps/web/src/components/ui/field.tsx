"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label as LabelPrimitive } from "@/components/ui/label";

/**
 * Field — label + hint + inline error, wired for accessibility.
 * Use `htmlFor`/`id` pairing so the label is always programmatically bound.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
  as = "div",
}: {
  id?: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  as?: "div" | "fieldset";
}) {
  const Tag = as;
  return (
    <Tag className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <LabelPrimitive htmlFor={id} className="text-[13px] font-medium text-foreground">
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden>
              *
            </span>
          )}
        </LabelPrimitive>
        {hint && <span className="text-2xs text-subtle-foreground">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="flex items-start gap-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </Tag>
  );
}

/** Form-level error summary shown above a submit button. */
export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-danger-border bg-danger-subtle px-3 py-2 text-xs text-danger"
    >
      {children}
    </p>
  );
}
