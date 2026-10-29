"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info" | "warning";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  action?: { label: string; onClick: () => void };
};

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  action?: { label: string; onClick: () => void };
  duration?: number;
};

const ToastContext = React.createContext<{
  toast: (input: ToastInput) => void;
  dismiss: (id: string) => void;
} | null>(null);

const ICONS: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const TONE: Record<ToastVariant, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-info",
  warning: "text-warning",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((input: ToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [
      ...prev.slice(-3),
      {
        id,
        title: input.title,
        description: input.description,
        variant: input.variant ?? "info",
        action: input.action,
      },
    ]);
    if (input.duration !== 0) {
      const duration = input.duration ?? (input.variant === "error" ? 6000 : 4000);
      window.setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={Infinity}>
        {children}
        {items.map((t) => {
          const Icon = ICONS[t.variant];
          return (
            <ToastPrimitive.Root
              key={t.id}
              open
              onOpenChange={(open) => !open && dismiss(t.id)}
              className={cn(
                "pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-border bg-elevated px-3.5 py-3 shadow-lg",
                "data-[state=open]:animate-slide-up sm:max-w-sm"
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TONE[t.variant])} aria-hidden />
              <div className="min-w-0 flex-1">
                <ToastPrimitive.Title className="text-sm font-medium text-foreground">
                  {t.title}
                </ToastPrimitive.Title>
                {t.description && (
                  <ToastPrimitive.Description className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {t.description}
                  </ToastPrimitive.Description>
                )}
                {t.action && (
                  <ToastPrimitive.Action
                    altText={t.action.label}
                    onClick={t.action.onClick}
                    className="mt-1.5 text-xs font-medium text-brand hover:underline"
                  >
                    {t.action.label}
                  </ToastPrimitive.Action>
                )}
              </div>
              <ToastPrimitive.Close
                aria-label="Dismiss notification"
                className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-subtle-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-sm" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    // Never crash a client component that renders outside the provider (tests).
    return { toast: () => {}, dismiss: () => {} };
  }
  return ctx;
}
