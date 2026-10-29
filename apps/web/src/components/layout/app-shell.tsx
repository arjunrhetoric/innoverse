"use client";

import { useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  User,
  ShieldCheck,
  Search,
  Menu,
  X,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Handshake,
  Users,
  Bookmark,
  Settings,
  Building2,
  Sparkles,
  Palette,
  ScrollText,
  KeyRound,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useUser } from "@/hooks/useUser";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { CommandPalette } from "@/components/command-palette";
import { CommandKbd } from "@/components/ui/kbd";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

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

  const role = user?.role;
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

  const workspace: NavItem[] =
    role === "Startup"
      ? [
          { href: "/dashboard/startup", label: "Overview", icon: LayoutDashboard },
          { href: "/candidates", label: "Candidates", icon: Users },
          { href: "/shortlist", label: "Shortlist", icon: Bookmark },
          { href: "/engagements", label: "Engagements", icon: Handshake },
        ]
      : role === "Institution"
        ? [{ href: "/dashboard/institution", label: "Cohorts", icon: Building2 }]
        : [
            { href: "/dashboard/student", label: "Overview", icon: LayoutDashboard },
            { href: "/engagements", label: "Engagements", icon: Handshake },
            { href: "/profile", label: "Portfolio", icon: User },
          ];

  const discover: NavItem[] = [
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/talent", label: "Talent", icon: Users },
  ];

  const account: NavItem[] =
    role === "Startup"
      ? [
          { href: "/settings/branding", label: "Branding", icon: Palette },
          { href: "/settings/audit", label: "Audit log", icon: ScrollText },
          { href: "/settings/security", label: "Repo access", icon: KeyRound },
        ]
      : role === "Institution"
        ? []
        : [{ href: "/settings/profile", label: "Public profile", icon: Settings }];

  const groups = [
    { title: "Workspace", items: workspace },
    ...(role === "Institution" ? [] : [{ title: "Discover", items: discover }]),
    ...(account.length ? [{ title: "Account", items: account }] : []),
    { title: "Trust", items: [{ href: "/verify", label: "Verify", icon: ShieldCheck }] },
  ];

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  const SidebarBody = ({ mini }: { mini: boolean }) => (
    <div className="flex h-full flex-col bg-surface">
      {/* Brand */}
      <div className={cn("flex h-14 shrink-0 items-center border-b border-border", mini ? "justify-center px-2" : "px-3")}>
        <Link href="/" className="flex items-center gap-2" aria-label="Innoverse home">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-foreground">
            <span className="text-[12px] font-bold leading-none text-background">I</span>
          </span>
          {!mini && (
            <span className="text-[13px] font-semibold tracking-[0.02em] text-foreground">Innoverse</span>
          )}
        </Link>
      </div>

      {/* Search */}
      <div className="p-2">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-2 text-sm text-muted-foreground shadow-2xs transition-colors hover:border-border-strong hover:text-foreground",
            mini ? "h-8 justify-center px-0" : "h-8"
          )}
          aria-label="Open command menu"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          {!mini && (
            <>
              <span className="flex-1 text-left text-xs">Search or jump to…</span>
              <CommandKbd />
            </>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin" aria-label="Workspace">
        {groups.map((group) => (
          <div key={group.title} className="py-1.5">
            {!mini && (
              <p className="px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-subtle-foreground">
                {group.title}
              </p>
            )}
            <ul className="space-y-px">
              {group.items.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.href + item.label}>
                    {mini ? (
                      <Tooltip content={item.label} side="right">
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          aria-label={item.label}
                          className={cn(
                            "flex h-8 w-full items-center justify-center rounded-md transition-colors",
                            active
                              ? "bg-foreground/[0.07] text-foreground"
                              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                        </Link>
                      </Tooltip>
                    ) : (
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
                          active
                            ? "bg-foreground/[0.06] font-medium text-foreground"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                        )}
                      >
                        {active && (
                          <span
                            aria-hidden
                            className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-foreground/50"
                          />
                        )}
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-foreground" : "text-subtle-foreground group-hover:text-muted-foreground"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className="border-t border-border p-2">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-md p-1.5 text-left transition-colors hover:bg-accent",
                  mini && "justify-center"
                )}
              >
                <Avatar size="sm" className="ring-1 ring-border">
                  <AvatarFallback>{user.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                {!mini && (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">
                      {user.name}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {role ?? "Member"}
                    </span>
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuLabel className="normal-case tracking-normal">
                <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={dashboardPath}>
                  <LayoutDashboard /> Dashboard
                </Link>
              </DropdownMenuItem>
              <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="h-4 w-4" /> Theme
                </span>
                <ThemeToggle />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div className={cn("mt-1 flex items-center gap-1", mini ? "flex-col" : "justify-between")}>
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-7 w-7 cursor-pointer items-center justify-center rounded-md text-subtle-foreground transition-colors hover:bg-accent hover:text-foreground md:flex"
          >
            {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
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
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border transition-[width] duration-200 ease-out md:block",
          collapsed ? "w-[52px]" : "w-[216px]"
        )}
      >
        <SidebarBody mini={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-[264px] border-r border-border bg-surface shadow-lg">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-3.5 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarBody mini={false} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className={cn("transition-[padding] duration-200 ease-out", collapsed ? "md:pl-[52px]" : "md:pl-[216px]")}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link href="/" className="flex items-center gap-2 md:hidden" aria-label="Innoverse home">
            <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-foreground">
              <span className="text-[12px] font-bold leading-none text-background">I</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="ml-auto flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-2 text-xs text-muted-foreground shadow-2xs transition-colors hover:border-border-strong hover:text-foreground sm:px-2.5"
            aria-label="Open command menu"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
            <CommandKbd className="hidden sm:flex" />
          </button>
          <NotificationBell />
        </header>

        <main id="main" className="mx-auto w-full max-w-[1160px] px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
