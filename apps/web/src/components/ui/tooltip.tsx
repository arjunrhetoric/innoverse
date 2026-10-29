"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Tooltip for icon-only buttons. Always pair with an aria-label on the trigger:
 * the tooltip is a visual aid, not the accessible name.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  sideOffset = 6,
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  className?: string;
}) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={sideOffset}
          className={cn(
            "z-[90] max-w-64 select-none rounded-md border border-border bg-elevated px-2 py-1 text-xs text-foreground shadow-md animate-in",
            className
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-[hsl(var(--border))]" width={10} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { TooltipProvider, TooltipPrimitive };
