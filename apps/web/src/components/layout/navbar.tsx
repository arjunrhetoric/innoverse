"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Bell,
  Menu,
  X,
  ChevronDown,
  Layers,
  PlayCircle,
  Workflow as WorkflowIcon,
  MessagesSquare,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { GithubIcon as Github } from "@/components/ui/icons";
import { signOut } from "next-auth/react";
import { useUser } from "@/hooks/useUser";
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
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const productLinks = [
  { href: "/#platform", label: "Platform", desc: "Workspace, matching, certificates", icon: Layers },
  { href: "/#showcase", label: "Product tour", desc: "Discover, review, track", icon: PlayCircle },
  { href: "/#workflow", label: "Workflow", desc: "Challenge to shipped in 3 moves", icon: WorkflowIcon },
  { href: "/#community", label: "Community", desc: "Builders shipping real work", icon: MessagesSquare },
];

const publicLinks = [{ href: "/#contact", label: "Contact" }];

export function Navbar() {
  const { user, isAuthenticated, isLoading, dashboardPath } = useUser();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isLanding = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!productOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProductOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [productOpen]);

  return (
    <motion.nav
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-colors duration-200",
        scrolled || !isLanding
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background font-bold text-[13px]">I</span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              INNOVERSE
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {isLanding && (
              <div
                className="relative"
                onMouseEnter={() => setProductOpen(true)}
                onMouseLeave={() => setProductOpen(false)}
              >
                <button
                  type="button"
                  aria-expanded={productOpen}
                  aria-haspopup="true"
                  onClick={() => setProductOpen((v) => !v)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 text-[13px] font-medium rounded-md transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    productOpen
                      ? "text-foreground bg-white/[0.04]"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  )}
                >
                  Product
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      productOpen && "rotate-180"
                    )}
                  />
                </button>
                {productOpen && (
                  <div className="absolute left-1/2 top-full z-50 w-80 -translate-x-1/2 pt-2">
                    <div className="animate-pane overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-2xl">
                      {productLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setProductOpen(false)}
                          className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-100 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-white/[0.03]">
                            <link.icon className="h-4 w-4 text-foreground" />
                          </span>
                          <span>
                            <span className="block text-sm font-medium text-foreground">
                              {link.label}
                            </span>
                            <span className="block text-[13px] text-muted-foreground">
                              {link.desc}
                            </span>
                          </span>
                        </Link>
                      ))}
                      <div className="mt-1.5 border-t border-border p-1.5">
                        <Link
                          href="/verify"
                          onClick={() => setProductOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-100 hover:bg-white/[0.05] hover:text-foreground"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Verify a certificate
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {isLanding &&
              publicLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-100 rounded-md hover:bg-white/[0.04]"
                >
                  {link.label}
                </Link>
              ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {isLoading ? (
              <div className="h-9 w-20 rounded-md bg-muted animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                {/* Notification bell */}
                <Button variant="ghost" size="icon" className="h-9 w-9 relative rounded-full">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand" />
                </Button>

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 px-2"
                    >
                      <Avatar className="h-7 w-7 border border-border">
                        <AvatarFallback className="text-xs bg-brand/15 text-brand-bright">
                          {user.name?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                        {user.name}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={dashboardPath}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <Github className="mr-2 h-4 w-4" />
                        View Profile
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === "Startup" && (
                      <DropdownMenuItem asChild>
                        <Link href="/settings/branding">
                          <Building2 className="mr-2 h-4 w-4" />
                          Company Branding
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button size="sm" variant="default" asChild>
                <Link href="/login">Get Started</Link>
              </Button>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden pb-4 border-t border-border mt-2 pt-4"
          >
            <div className="flex flex-col gap-1">
              {isLanding &&
                [...productLinks.map((l) => ({ href: l.href, label: l.label })), ...publicLinks].map((link) => (
                  <Link
                    key={link.href + link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-100 rounded-md hover:bg-white/[0.04]"
                  >
                    {link.label}
                  </Link>
                ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}
