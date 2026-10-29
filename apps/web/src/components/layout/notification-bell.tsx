"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusDot } from "@/components/ui/status-dot";
import { useUser } from "@/hooks/useUser";
import { useSSE } from "@/hooks/useSSE";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    if (!user?.id) return;
    fetch("/api/notifications", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setItems(data.notifications ?? []);
        setUnread(data.unread ?? 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
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
      /* non-critical */
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu onOpenChange={(open) => open && load()}>
      <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand px-0.5 text-[9px] font-semibold leading-none text-brand-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <p className="text-xs font-medium text-foreground">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markRead()}
              className="inline-flex cursor-pointer items-center gap-1 text-2xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="mx-0 my-0" />
        <div className="max-h-[360px] overflow-y-auto">
          {!loaded ? (
            <div className="space-y-3 p-3" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-2.5 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-full animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs font-medium text-foreground">You&apos;re all caught up</p>
              <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
                Milestone reviews, agreements and review requests land here.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <NotificationRow key={item._id} item={item} onRead={() => markRead([item._id])} />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({ item, onRead }: { item: NotificationItem; onRead: () => void }) {
  const body = (
    <div
      className={cn(
        "flex gap-2.5 px-3 py-2.5 transition-colors",
        !item.read && "bg-brand-subtle/60"
      )}
    >
      <span className="mt-1.5">
        <StatusDot status={item.read ? "muted" : "brand"} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs leading-snug", item.read ? "text-muted-foreground" : "font-medium text-foreground")}>
          {item.title || "Update"}
        </p>
        <p className="mt-0.5 line-clamp-2 text-2xs leading-relaxed text-muted-foreground">
          {item.message}
        </p>
        <p className="mt-1 font-mono text-[10px] text-subtle-foreground">
          {formatRelativeTime(item.createdAt)}
        </p>
      </div>
    </div>
  );

  return item.link ? (
    <Link
      href={item.link}
      onClick={() => !item.read && onRead()}
      className="block border-b border-border last:border-0 hover:bg-accent/60"
    >
      {body}
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => !item.read && onRead()}
      className="block w-full cursor-pointer border-b border-border text-left last:border-0 hover:bg-accent/60"
    >
      {body}
    </button>
  );
}
