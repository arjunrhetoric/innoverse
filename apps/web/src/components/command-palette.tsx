"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  User,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  Search,
  Users,
  Bookmark,
  Handshake,
  Settings,
  Command,
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
    const isStartup = user?.role === "Startup";
    const isInstitution = user?.role === "Institution";

    const workspace: Action[] = [
      {
        id: "dashboard",
        group: "Go to",
        label: isStartup ? "Startup overview" : isInstitution ? "Cohort overview" : "My dashboard",
        icon: LayoutDashboard,
        run: () => router.push(dashboardPath),
      },
      ...(isStartup
        ? [
            {
              id: "candidates",
              group: "Go to",
              label: "Candidates",
              icon: Users,
              run: () => router.push("/candidates"),
            },
            {
              id: "shortlist",
              group: "Go to",
              label: "Shortlist",
              icon: Bookmark,
              run: () => router.push("/shortlist"),
            },
          ]
        : []),
      ...(!isInstitution
        ? [
            {
              id: "engagements",
              group: "Go to",
              label: "Engagements",
              icon: Handshake,
              run: () => router.push("/engagements"),
            },
          ]
        : []),
      {
        id: "explore",
        group: "Go to",
        label: "Explore challenges",
        icon: Compass,
        run: () => router.push("/explore"),
      },
      {
        id: "talent",
        group: "Go to",
        label: "Talent directory",
        icon: Users,
        run: () => router.push("/talent"),
      },
      {
        id: "verify",
        group: "Go to",
        label: "Verify a credential",
        icon: ShieldCheck,
        run: () => router.push("/verify"),
      },
      {
        id: "profile",
        group: "Go to",
        label: isStartup ? "Company branding" : "Profile settings",
        icon: isStartup ? Settings : User,
        run: () => router.push(isStartup ? "/settings/branding" : "/settings/profile"),
      },
    ];

    const system: Action[] = [
      {
        id: "theme",
        group: "Actions",
        label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        hint: "Appearance",
        icon: theme === "dark" ? Sun : Moon,
        run: () => setTheme(theme === "dark" ? "light" : "dark"),
      },
      {
        id: "logout",
        group: "Actions",
        label: "Sign out",
        hint: "Session",
        icon: LogOut,
        run: () => signOut({ callbackUrl: "/" }),
      },
    ];

    return [...workspace, ...system];
  }, [router, dashboardPath, user?.role, theme, setTheme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q) ||
        (a.hint?.toLowerCase().includes(q) ?? false)
    );
  }, [actions, query]);

  const safeIndex = Math.min(index, Math.max(filtered.length - 1, 0));

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[14vh]">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-in"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
        className="relative w-full max-w-[540px] overflow-hidden rounded-xl border border-border bg-elevated shadow-lg animate-in"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-3.5">
          <Search className="h-4 w-4 shrink-0 text-subtle-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            placeholder="Search pages and actions…"
            aria-label="Search commands"
            className="h-12 w-full bg-transparent text-md text-foreground placeholder:text-subtle-foreground focus:outline-none"
          />
          <Kbd>esc</Kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5" role="listbox" aria-label="Commands">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-foreground">No results for “{query}”</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try “verify”, “explore”, “candidates” or “theme”.
              </p>
            </div>
          ) : (
            filtered.map((action, i) => {
              const header = action.group !== lastGroup ? action.group : null;
              lastGroup = action.group;
              const active = i === safeIndex;
              return (
                <div key={action.id}>
                  {header && (
                    <p className="px-2.5 pb-1 pt-2.5 text-[10px] font-medium uppercase tracking-[0.1em] text-subtle-foreground">
                      {header}
                    </p>
                  )}
                  <button
                    type="button"
                    data-index={i}
                    role="option"
                    aria-selected={active}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => {
                      onOpenChange(false);
                      action.run();
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                      active ? "bg-accent text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <action.icon className="h-4 w-4 shrink-0 text-subtle-foreground" />
                    <span className="flex-1 truncate">{action.label}</span>
                    {action.hint && (
                      <span className="text-2xs text-subtle-foreground">{action.hint}</span>
                    )}
                    {active && <Kbd>↵</Kbd>}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border bg-surface-2/60 px-3.5 py-2 text-2xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd>
            open
          </span>
          <span className="ml-auto flex items-center gap-1">
            <Command className="h-3 w-3" />
            <span>Command menu</span>
          </span>
        </div>
      </div>
    </div>
  );
}
