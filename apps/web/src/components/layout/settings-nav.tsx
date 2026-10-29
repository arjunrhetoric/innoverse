"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Settings sub-navigation. One consistent row across every settings page so the
 * section reads as a single place rather than four disconnected forms.
 */
export function SettingsNav({
  items,
}: {
  items: { href: string; label: string; description?: string }[];
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="mb-6 overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-5">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center border-b-2 px-0.5 pb-2.5 text-sm transition-colors",
                  active
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export const startupSettingsItems = [
  { href: "/settings/branding", label: "Branding" },
  { href: "/settings/security", label: "Repository access" },
  { href: "/settings/audit", label: "Audit log" },
];
