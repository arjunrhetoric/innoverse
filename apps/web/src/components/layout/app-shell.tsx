"use client";

import { useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  KanbanSquare,
  User,
  ShieldCheck,
  Search,
  Menu,
  X,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useUser } from "@/hooks/useUser";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { Kbd } from "@/components/ui/kbd";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, dashboardPath } = useUser();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      (() => {
        try {
          return localStorage.getItem("inno-sidebar") === "collapsed";
        } catch {
          return false;
        }
      })()
  );

  const togglePalette = useEffectEvent(() => setPaletteOpen((v) => !v));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeDrawer = useEffectEvent(() => setDrawerOpen(false));

  useEffect(() => {
    closeDrawer();
  }, [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("inno-sidebar", c ? "expanded" : "collapsed");
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  const isStartup = user?.role === "Startup";
  const nav = [
    {
      section: "Workspace",
      items: [
        { href: dashboardPath, label: "Dashboard", icon: LayoutDashboard },
        {
          href: isStartup ? "/dashboard/startup" : "/dashboard/student",
          label: isStartup ? "Challenges" : "Discover",
          icon: isStartup ? KanbanSquare : Compass,
        },
        { href: "/profile", label: "Profile", icon: User },
      ],
    },
    {
      section: "General",
      items: [{ href: "/verify", label: "Verify", icon: ShieldCheck }],
    },
  ];

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-3">
        <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="Innoverse home">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground">
            <span className="text-[13px] font-bold text-background">I</span>
          </div>
          {!collapsed && (
            <span className="truncate text-[13px] font-semibold tracking-tight text-foreground">
              INNOVERSE
            </span>
          )}
        </Link>
      </div>

      {/* Search trigger */}
      <div className="p-2">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-md border border-border bg-white/[0.02] px-2.5 text-sm text-muted-foreground transition-colors duration-100 hover:bg-white/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed ? "h-9 justify-center px-0" : "h-9"
          )}
          aria-label="Open command menu"
        >
          <Search className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search…</span>
              <span className="flex items-center gap-0.5">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </span>
            </>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label="Workspace">
        {nav.map((group) => (
          <div key={group.section} className="mt-1 first:mt-0">
            {!collapsed && (
              <p className="px-2.5 pb-1 pt-3 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70 first:pt-1">
                {group.section}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href + "/") && item.href !== dashboardPath);
                const exactActive = pathname === item.href;
                return (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={exactActive ? "page" : undefined}
                      className={cn(
                        "group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        collapsed && "justify-center px-0",
                        exactActive || active
                          ? "bg-white/[0.06] font-medium text-foreground"
                          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && (exactActive || active) && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-bright" aria-hidden />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2">
        {!collapsed && user && (
          <div className="flex items-center gap-2 rounded-md px-2.5 py-2">
            <Avatar className="h-7 w-7 border border-border">
              <AvatarFallback className="bg-white/[0.06] text-xs text-foreground">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{user.name}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
        <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Log out"
            aria-label="Log out"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-100 hover:bg-white/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-100 hover:bg-white/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-background transition-[width] duration-200 md:block",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-border bg-background">
            <div className="flex h-14 items-center justify-end border-b border-border px-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-[calc(100%-3.5rem)]">{sidebar}</div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className={cn("transition-[padding] duration-200", collapsed ? "md:pl-16" : "md:pl-60")}>
        {/* Mobile topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background px-4 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
            <span className="text-[13px] font-bold text-background">I</span>
          </div>
          <span className="text-[13px] font-semibold tracking-tight">INNOVERSE</span>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search"
            className="ml-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1080px] px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
