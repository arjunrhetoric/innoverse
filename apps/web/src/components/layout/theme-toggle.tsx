"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <Tooltip content={isDark ? "Switch to light" : "Switch to dark"}>
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={cn(
          "relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          className
        )}
      >
        <Sun
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isDark ? "rotate-0 scale-100" : "rotate-90 scale-0"
          )}
        />
        <Moon
          className={cn(
            "absolute h-4 w-4 transition-transform duration-200",
            isDark ? "-rotate-90 scale-0" : "rotate-0 scale-100"
          )}
        />
      </button>
    </Tooltip>
  );
}
