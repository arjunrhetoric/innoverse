"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Bookmark,
  Handshake,
  Building2,
  ShieldCheck,
  UserCircle2,
  Landmark,
  Compass,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";

const LINKS = {
  Startup: [
    { href: "/dashboard/startup", label: "Overview", icon: LayoutDashboard },
    { href: "/candidates", label: "Candidates", icon: Users },
    { href: "/shortlist", label: "Shortlist", icon: Bookmark },
    { href: "/engagements", label: "Engagements", icon: Handshake },
    { href: "/settings/branding", label: "Branding", icon: Building2 },
    { href: "/settings/security", label: "Access", icon: ShieldCheck },
    { href: "/settings/audit", label: "Audit", icon: ShieldCheck },
  ],
  Student: [
    { href: "/dashboard/student", label: "Overview", icon: LayoutDashboard },
    { href: "/engagements", label: "Engagements", icon: Handshake },
    { href: "/talent", label: "Talent directory", icon: Users },
    { href: "/settings/profile", label: "Public profile", icon: UserCircle2 },
  ],
  Institution: [
    { href: "/dashboard/institution", label: "Cohorts", icon: Landmark },
    { href: "/talent", label: "Talent", icon: Compass },
  ],
} as const;

/** Role-aware secondary navigation, visible on every dashboard. */
export function QuickLinks() {
  const { role } = useUser();
  const pathname = usePathname();
  if (!role) return null;

  const links = LINKS[role as keyof typeof LINKS];
  if (!links) return null;

  return (
    <nav className="mb-6 flex flex-wrap gap-1.5">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
              active
                ? "border-foreground/25 bg-white/[0.05] text-foreground"
                : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground"
            )}
          >
            <link.icon className="h-3.5 w-3.5" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
