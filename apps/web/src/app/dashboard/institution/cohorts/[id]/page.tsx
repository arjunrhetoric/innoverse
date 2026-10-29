"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  ExternalLink,
  Download,
  Landmark,
  AlertCircle,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Meta } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Section } from "@/components/ui/card";
import { StatBand } from "@/components/ui/stat";
import { ProgressRow } from "@/components/ui/progress";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Table,
  TableWrap,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { formatDate } from "@/lib/utils";

interface Detail {
  cohort: { id: string; name: string; description: string; joinCode: string; createdAt: string };
  stats: {
    members: number;
    withReports: number;
    reports: number;
    mergedPRs: number;
    avgConfidence: number | null;
    participation: number;
  };
  skills: Array<{ name: string; count: number }>;
  members: Array<{
    id: string;
    name: string;
    headline: string | null;
    githubUsername: string | null;
    joinedAt: string;
    reportCount: number;
    avgConfidence: number | null;
    mergedPRs: number;
    latestReportToken: string | null;
  }>;
}

export default function CohortDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role !== "Institution") router.push("/dashboard");
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "Institution") return;
    fetch(`/api/cohorts/${id}`, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Cohort not found");
        setData(json);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Cohort not found"))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated, user]);

  if (authLoading || loading) {
    return (
      <AppShell>
        <CohortSkeleton />
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <PageHeader back={{ href: "/dashboard/institution", label: "Cohorts" }} title="Cohort" />
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg border border-danger-border bg-danger-subtle px-5 py-4"
        >
          <p className="flex items-center gap-2 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error || "Cohort not found"}
          </p>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/institution">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to cohorts
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const { cohort, stats, skills, members } = data;
  const topSkill = skills.length ? Math.max(...skills.map((s) => s.count)) : 0;
  const skillsCapped = skills.length >= 12;

  return (
    <AppShell>
      <PageHeader
        back={{ href: "/dashboard/institution", label: "Cohorts" }}
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            <Landmark className="h-3.5 w-3.5 text-subtle-foreground" />
            {user?.name || "Institution"}
          </span>
        }
        title={cohort.name}
        description={cohort.description || "Verified student evidence for this cohort."}
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-xs text-subtle-foreground">Join code</span>
              <span className="font-mono text-xs font-medium text-foreground">
                {cohort.joinCode}
              </span>
              <CopyButton value={cohort.joinCode} size="icon" label="Copy join code" />
            </span>
            <Meta label="Created" value={formatDate(cohort.createdAt)} />
            <Meta label="Students" value={stats.members} />
          </>
        }
        actions={
          <Button size="sm" variant="outline" asChild>
            <a href={`/api/cohorts/${cohort.id}/export`}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </a>
          </Button>
        }
      />

      <StatBand
        className="mb-6"
        items={[
          {
            label: "Participation",
            value: `${stats.participation}%`,
            hint: `${stats.withReports} of ${stats.members} student${stats.members === 1 ? "" : "s"} with a report`,
          },
          {
            label: "Reports issued",
            value: stats.reports,
            hint: stats.reports === 0 ? "None yet" : `${stats.avgConfidence ?? "—"} avg confidence`,
          },
          {
            label: "Merged PRs",
            value: stats.mergedPRs,
            hint: "Evidence attached to reports",
          },
          {
            label: "Skills covered",
            value: skills.length,
            hint: skillsCapped ? "Top 12 by frequency" : "Distinct member skills",
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <Section
          title="Members"
          description="Reports are issued from verified GitHub evidence and startup sign-off."
          actions={
            <Badge variant="default">
              {members.length} member{members.length === 1 ? "" : "s"}
            </Badge>
          }
          contentClassName="p-0"
        >
          {members.length === 0 ? (
            <EmptyRoster joinCode={cohort.joinCode} />
          ) : (
            <TableWrap sticky>
              <Table stickyHead>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead numeric>Reports</TableHead>
                    <TableHead numeric>Merged PRs</TableHead>
                    <TableHead numeric>Confidence</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="pr-5 text-right">
                      <span className="sr-only">Latest report</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="pl-5">
                        <p className="text-sm font-medium text-foreground">{m.name}</p>
                        <p className="mt-0.5 truncate text-2xs text-muted-foreground">
                          {m.githubUsername ? `@${m.githubUsername}` : m.headline || "Student"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={m.reportCount === 0 ? "Pending" : "Verified"} />
                      </TableCell>
                      <TableCell numeric>{m.reportCount}</TableCell>
                      <TableCell numeric>{m.mergedPRs}</TableCell>
                      <TableCell numeric className="text-muted-foreground">
                        {m.avgConfidence != null ? `${m.avgConfidence}/100` : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {formatDate(m.joinedAt)}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        {m.latestReportToken ? (
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/r/${m.latestReportToken}`}>
                              Report
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-2xs text-subtle-foreground">No report</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrap>
          )}
        </Section>

        <Section
          title="Skills coverage"
          description={
            skills.length
              ? "Number of members whose profile lists each skill."
              : "Populated from member profiles once students join."
          }
        >
          {skills.length === 0 ? (
            <div className="px-5 pb-5">
              <p className="rounded-md border border-dashed border-border bg-surface/40 px-3 py-4 text-xs leading-relaxed text-muted-foreground">
                No skills recorded yet. Skills appear here from the profiles of students in this
                cohort.
              </p>
            </div>
          ) : (
            <div className="space-y-3 px-5 pb-5">
              {skills.map((s) => (
                <ProgressRow
                  key={s.name}
                  label={s.name}
                  value={s.count}
                  max={topSkill || 1}
                  tone="brand"
                  suffix={`${s.count}`}
                />
              ))}
            </div>
          )}
        </Section>
      </div>
    </AppShell>
  );
}

/** Honest zero state for a cohort with no members: the join code is the next action. */
function EmptyRoster({ joinCode }: { joinCode: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card shadow-2xs">
        <Users className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">No students have joined yet</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
        Students join by entering this code from their dashboard. Reports and participation appear
        here as soon as they do.
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5">
        <FileText className="h-3.5 w-3.5 text-subtle-foreground" aria-hidden />
        <span className="font-mono text-sm font-medium tracking-wide text-foreground">
          {joinCode}
        </span>
        <CopyButton value={joinCode} size="icon" label="Copy join code" />
      </div>
    </div>
  );
}

/** Mirrors the loaded detail: header, stat band, member table + skills rail. */
function CohortSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-4 h-2.5 w-28" />
        <Skeleton className="mt-3 h-7 w-72" />
        <Skeleton className="mt-2.5 h-3.5 w-full max-w-xl" />
        <div className="mt-4 flex flex-wrap gap-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="mt-6 h-px bg-border" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card px-4 py-3">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-2 h-5 w-12" />
            <Skeleton className="mt-2 h-2.5 w-24" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-4 border-b border-border px-5 py-2.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="ml-auto h-2.5 w-12" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-b-0"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <Skeleton className="h-3.5 w-28" />
          </div>
          <div className="space-y-3 px-5 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-2.5 w-24" />
                  <Skeleton className="h-2.5 w-6" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
