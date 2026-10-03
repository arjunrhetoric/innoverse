"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  KanbanSquare,
  User,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  Search,
} from "lucide-react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { useUser } from "@/hooks/useUser";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

type Action = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
};

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { user, dashboardPath } = useUser();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const actions: Action[] = useMemo(() => {
    const base: Action[] = [
      {
        id: "dashboard",
        group: "Navigate",
        label: "Go to Dashboard",
        icon: LayoutDashboard,
        run: () => router.push(dashboardPath),
      },
      {
        id: "challenges",
        group: "Navigate",
        label: user?.role === "Startup" ? "Go to Challenges" : "Discover challenges",
        icon: user?.role === "Startup" ? KanbanSquare : Compass,
        run: () =>
          router.push(user?.role === "Startup" ? "/dashboard/startup" : "/dashboard/student"),
      },
      {
        id: "profile",
        group: "Navigate",
        label: "Go to Profile",
        icon: User,
        run: () => router.push("/profile"),
      },
      {
        id: "verify",
        group: "Navigate",
        label: "Verify a certificate",
        icon: ShieldCheck,
        run: () => router.push("/verify"),
      },
      {
        id: "theme",
        group: "Actions",
        label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        icon: theme === "dark" ? Sun : Moon,
        run: () => setTheme(theme === "dark" ? "light" : "dark"),
      },
      {
        id: "logout",
        group: "Actions",
        label: "Log out",
        icon: LogOut,
        run: () => signOut({ callbackUrl: "/" }),
      },
    ];
    return base;
  }, [router, dashboardPath, user?.role, theme, setTheme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open ]);

  const safeIndex = Math.min(index, Math.max(filtered.length - 1, 0));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex(Math.min(safeIndex + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex(Math.max(safeIndex - 1, 0));
      }
      if (e.key === "Enter" && filtered[safeIndex]) {
        e.preventDefault();
        onOpenChange(false);
        filtered[safeIndex].run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, safeIndex, onOpenChange]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${safeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [safeIndex]);

  if (!open) return null;

  let lastGroup = "";
  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[18vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command menu"
    >
      <div className="absolute inset-0 bg-black/70" onClick={() => onOpenChange(false)} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            placeholder="Type a command or search…"
            aria-label="Search commands"
            className="h-12 w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <Kbd>esc</Kbd>
        </div>
        <div ref={listRef} className="max-h-72 overflow-y-auto p-1.5" role="listbox">
          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No matching commands.
            </p>
          )}
          {filtered.map((action, i) => {
            const header =
              action.group !== lastGroup ? action.group : null;
            lastGroup = action.group;
            return (
              <div key={action.id}>
                {header && (
                  <p className="px-3 pb-1 pt-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {header}
                  </p>
                )}
                <button
                  type="button"
                  data-index={i}
                  role="option"
                  aria-selected={i === safeIndex}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => {
                    onOpenChange(false);
                    action.run();
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors duration-100",
                    i === safeIndex
                      ? "bg-white/[0.06] text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <action.icon className="h-4 w-4 shrink-0" />
                  {action.label}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> select
          </span>
        </div>
      </div>
    </div>
  );
}
