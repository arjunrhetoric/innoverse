"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider delayDuration={300} skipDelayDuration={100}>
        <ToastProvider>{children}</ToastProvider>
      </TooltipProvider>
    </SessionProvider>
  );
}
