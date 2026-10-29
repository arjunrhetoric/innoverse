"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

/** Underline tab bar — the default in-app pattern (Linear/GitHub style). */
const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex h-9 w-full items-stretch gap-4 overflow-x-auto border-b border-border scrollbar-none",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative -mb-px inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-0.5 text-sm font-medium text-muted-foreground transition-colors duration-[var(--dur-1)]",
      "hover:text-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground",
      "disabled:pointer-events-none disabled:opacity-50",
      "[&_svg]:size-4 [&_svg]:shrink-0",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

/** Segmented control — compact switches inside toolbars and forms. */
const SegmentedList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-8 items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5",
      className
    )}
    {...props}
  />
));
SegmentedList.displayName = "SegmentedList";

const SegmentedTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex h-7 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2.5 text-xs font-medium text-muted-foreground transition-colors duration-[var(--dur-1)]",
      "hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs",
      "data-[state=active]:ring-1 data-[state=active]:ring-border",
      className
    )}
    {...props}
  />
));
SegmentedTrigger.displayName = "SegmentedTrigger";

export { Tabs, TabsList, TabsTrigger, TabsContent, SegmentedList, SegmentedTrigger };
