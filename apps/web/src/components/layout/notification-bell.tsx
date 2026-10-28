"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/useUser";
import { useSSE } from "@/hooks/useSSE";
import { formatRelativeTime } from "@/lib/utils";

interface NotificationItem {
  _id: string;
  title: string | null;
  message: string;
  link: string | null;
  type: string;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { user } = useUser();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => {
    if (!user?.id) return;
    fetch("/api/notifications", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setItems(data.notifications ?? []);
        setUnread(data.unread ?? 0);
      })
      .catch(() => null);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useSSE(user?.id ? `user:${user.id}` : null, () => load());

  const markRead = async (ids?: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids?.length ? { ids } : { all: true }),
      });
      load();
    } catch {
      // Non-critical.
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-medium text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-xs font-medium">Notifications</DropdownMenuLabel>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markRead()}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Check className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            items.map((item) => {
              const content = (
                <div
                  className={`px-2 py-2.5 ${item.read ? "" : "bg-primary/[0.04]"}`}
                  onClick={() => !item.read && markRead([item._id])}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        item.read ? "bg-transparent" : "bg-primary"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{item.title || "Update"}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                        {item.message}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                        {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );

              return item.link ? (
                <Link key={item._id} href={item.link} className="block hover:bg-white/[0.03]">
                  {content}
                </Link>
              ) : (
                <div key={item._id} className="hover:bg-white/[0.03]">
                  {content}
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
