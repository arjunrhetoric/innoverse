"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Destructive / irreversible confirmations. The confirm action is visually
 * distinct and the cancel action is the default focus target.
 */
const ConfirmDialog = AlertDialogPrimitive.Root;
const ConfirmDialogTrigger = AlertDialogPrimitive.Trigger;

const ConfirmDialogContent = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] data-[state=open]:animate-in" />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-elevated p-5 shadow-lg data-[state=open]:animate-in",
        className
      )}
      {...props}
    />
  </AlertDialogPrimitive.Portal>
));
ConfirmDialogContent.displayName = "ConfirmDialogContent";

function ConfirmDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

const ConfirmDialogTitle = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-md font-semibold tracking-tight text-foreground", className)}
    {...props}
  />
));
ConfirmDialogTitle.displayName = "ConfirmDialogTitle";

const ConfirmDialogDescription = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm leading-relaxed text-muted-foreground", className)}
    {...props}
  />
));
ConfirmDialogDescription.displayName = "ConfirmDialogDescription";

const ConfirmDialogActions = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
);

/**
 * Convenience component: one call renders a controlled confirmation.
 */
export function ConfirmAction({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning";
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog open={open} onOpenChange={onOpenChange}>
      <ConfirmDialogContent>
        <ConfirmDialogTitle>{title}</ConfirmDialogTitle>
        <ConfirmDialogDescription>{description}</ConfirmDialogDescription>
        <ConfirmDialogActions>
          <AlertDialogPrimitive.Cancel asChild>
            <Button variant="outline" size="sm">
              {cancelLabel}
            </Button>
          </AlertDialogPrimitive.Cancel>
          <Button
            size="sm"
            variant={tone === "danger" ? "destructive" : "default"}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </ConfirmDialogActions>
      </ConfirmDialogContent>
    </ConfirmDialog>
  );
}

export {
  ConfirmDialog,
  ConfirmDialogTrigger,
  ConfirmDialogContent,
  ConfirmDialogHeader,
  ConfirmDialogTitle,
  ConfirmDialogDescription,
  ConfirmDialogActions,
};
