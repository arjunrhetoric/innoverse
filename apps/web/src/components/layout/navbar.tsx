"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, LogOut, LayoutDashboard, User, Settings, Handshake, Bookmark, Building2, ShieldCheck, Users } from "lucide-react";
import { GithubIcon as Github } from "@/components/ui/icons";
import { signOut } from "next-auth/react";
import { useUser } from "@/hooks/useUser";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/talent", label: "Talent" },
  { href: "/verify", label: "Verify" },
];

export function Navbar() {
  const { user, isAuthenticated, isLoading, dashboardPath } = useUser();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const navLink = (active: boolean) =>
    cn(
      "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors duration-[var(--dur-1)]",
      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Innoverse home">
            <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-foreground">
              <span className="text-[12px] font-bold leading-none text-background">I</span>
            </span>
            <span className="text-[13px] font-semibold tracking-[0.02em] text-foreground">
              Innoverse
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={navLink(pathname === link.href)}
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />

          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" aria-hidden />
          ) : isAuthenticated && user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex cursor-pointer items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-accent"
                    aria-label="Account menu"
                  >
                    <Avatar size="sm" className="ring-1 ring-border">
                      <AvatarFallback>{user.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
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
                  <DropdownMenuItem asChild>
                    <Link href={user.role === "Startup" ? "/settings/branding" : "/profile"}>
                      <User /> {user.role === "Startup" ? "Branding" : "Profile"}
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "Student" && (
                    <DropdownMenuItem asChild>
                      <Link href="/engagements">
                        <Handshake /> Engagements
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === "Startup" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/candidates">
                          <Users /> Candidates
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/shortlist">
                          <Bookmark /> Shortlist
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings/audit">
                          <ShieldCheck /> Audit log
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {user.role === "Institution" && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/institution">
                        <Building2 /> Cohorts
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/verify">
                      <ShieldCheck /> Verify a credential
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onClick={() => signOut({ callbackUrl: "/" })}>
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/login">
                  <Github className="h-3.5 w-3.5" />
                  Get started
                </Link>
              </Button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="ml-0.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto max-w-7xl px-4 py-3" aria-label="Mobile">
            <ul className="space-y-0.5">
              {[...primaryLinks, ...(isAuthenticated ? [{ href: dashboardPath, label: "Dashboard" }] : [])].map(
                (link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex h-10 items-center rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
