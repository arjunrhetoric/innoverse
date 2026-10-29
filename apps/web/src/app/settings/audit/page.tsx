"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, AlertCircle, FilterX } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsNav, startupSettingsItems } from "@/components/layout/settings-nav";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Meta } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableWrap,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useUser } from "@/hooks/useUser";

interface AuditEvent {
  _id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorName: string | null;
  ip: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

function fmtWhen(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: "" };
  return {
    date: d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  };
}

function metaPairs(metadata: Record<string, unknown> | undefined): Array<[string, string]> {
  if (!metadata) return [];
  return Object.entries(metadata)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
    .slice(0, 2)
    .map(([k, v]) => [k, String(v)]);
}

export default function AuditPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!authLoading && user?.role !== "Startup") {
      router.push("/dashboard");
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "Startup") return;
    fetch("/api/audit?limit=100", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load audit log");
        setEvents(data.events ?? []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  const actionTypes = useMemo(
    () => Array.from(new Set(events.map((e) => e.action))).sort(),
    [events]
  );

  const filtered = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;
    return events.filter((e) => {
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      const t = new Date(e.createdAt).getTime();
      if (Number.isNaN(t)) return true;
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      return true;
    });
  }, [events, actionFilter, fromDate, toDate]);

  const isFiltered = actionFilter !== "all" || fromDate !== "" || toDate !== "";
  const clearFilters = () => {
    setActionFilter("all");
    setFromDate("");
    setToDate("");
  };

  const showLoading = authLoading || loading;

  return (
    <AppShell>
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-5xl">
<SettingsNav items={startupSettingsItems} />
          <PageHeader
            eyebrow={
              <span className="font-mono text-2xs uppercase tracking-[0.14em] text-subtle-foreground">
                Settings · Audit
              </span>
            }
            title="Audit log"
            description="An append-only record of the actions taken on your account. Entries cannot be edited or deleted."
            meta={
              <>
                <Meta label="Entries" value={showLoading ? "—" : String(events.length)} />
                <Meta label="Retention" value="append-only" />
              </>
            }
            actions={
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/startup">
                  <ShieldCheck className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            }
          />

          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle px-4 py-3"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {showLoading ? (
            <AuditSkeleton />
          ) : events.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No audit entries yet"
              description="Issuing a report, editing the branding kit or downgrading repository access each writes an entry here."
              action={{ label: "Open dashboard", href: "/dashboard/startup" }}
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid flex-1 gap-3 sm:grid-cols-3">
                  <Field id="action-filter" label="Action">
                    <Select
                      id="action-filter"
                      value={actionFilter}
                      onChange={(e) => setActionFilter(e.target.value)}
                    >
                      <option value="all">All actions</option>
                      {actionTypes.map((action) => (
                        <option key={action} value={action}>
                          {action}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field id="from-date" label="From">
                    <Input
                      id="from-date"
                      type="date"
                      value={fromDate}
                      max={toDate || undefined}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </Field>
                  <Field id="to-date" label="To">
                    <Input
                      id="to-date"
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <p className="text-xs text-muted-foreground tnum">
                    {filtered.length} of {events.length}
                  </p>
                  {isFiltered && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <FilterX className="h-3.5 w-3.5" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {filtered.length === 0 ? (
                <EmptyState
                  icon={FilterX}
                  title="No entries match these filters"
                  description="Widen the date range or pick a different action to see entries."
                  action={{ label: "Clear filters", onClick: clearFilters }}
                  inset={false}
                />
              ) : (
                <TableWrap sticky>
                  <Table stickyHead>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((event) => {
                        const when = fmtWhen(event.createdAt);
                        const pairs = metaPairs(event.metadata);
                        return (
                          <TableRow key={event._id}>
                            <TableCell className="whitespace-nowrap">
                              <span className="block font-mono text-xs text-foreground">
                                {when.date}
                              </span>
                              <span className="mt-0.5 block font-mono text-2xs text-subtle-foreground">
                                {when.time}
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className="block text-sm text-foreground">
                                {event.actorName ?? "—"}
                              </span>
                              <span className="mt-0.5 block font-mono text-2xs text-subtle-foreground">
                                {event._id.slice(-6)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-mono">
                                {event.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className="block text-xs capitalize text-muted-foreground">
                                {event.resourceType}
                              </span>
                              {event.resourceId && (
                                <span className="mt-0.5 block font-mono text-2xs text-subtle-foreground">
                                  {event.resourceId.slice(-8)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="block font-mono text-2xs text-muted-foreground">
                                {event.ip ?? "—"}
                              </span>
                              {pairs.length > 0 && (
                                <span className="mt-0.5 block max-w-[16rem] truncate font-mono text-2xs text-subtle-foreground">
                                  {pairs.map(([k, v]) => `${k}=${v}`).join(" · ")}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableWrap>
              )}
            </div>
          )}

          {!showLoading && events.length > 0 && (
            <p className="mt-3 text-2xs text-subtle-foreground">
              Showing the most recent {events.length} entries. Older entries are retained server-side
              but not listed here.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function AuditSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-end">
        <Skeleton className="h-14 w-full sm:w-48" />
        <Skeleton className="h-14 w-full sm:w-40" />
        <Skeleton className="h-14 w-full sm:w-40" />
      </div>
      <div className="border-b border-border bg-surface-2 px-3 py-2">
        <Skeleton className="h-3 w-full max-w-lg" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-3 py-3.5">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-36 rounded-full" />
            <Skeleton className="hidden h-4 w-24 sm:block" />
            <Skeleton className="ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
