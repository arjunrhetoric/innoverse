"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

/**
 * Copy affordance for join codes, verification codes and report links.
 * Shows a check for 1.5s; the tooltip doubles as the accessible hint.
 */
export function CopyButton({
  value,
  className,
  label = "Copy",
  showValue = true,
  size = "sm",
}: {
  value: string;
  className?: string;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "icon";
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — the value stays selectable on screen */
    }
  };

  return (
    <Tooltip content={copied ? "Copied" : `${label} ${value}`}>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`${label}: ${value}`}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-card font-mono text-xs text-muted-foreground transition-colors duration-[var(--dur-1)] hover:border-border-strong hover:bg-accent hover:text-foreground",
          size === "icon" ? "h-7 w-7" : "h-7 px-2",
          className
        )}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
        {showValue && size !== "icon" && <span className="max-w-40 truncate">{value}</span>}
      </button>
    </Tooltip>
  );
}
