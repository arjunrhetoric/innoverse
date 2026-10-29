"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink,
  GitPullRequest,
  ShieldCheck,
  Users,
  CalendarDays,
  GitCommitHorizontal,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Meta } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { formatDate } from "@/lib/utils";

interface Candidate {
  certificateId: string;
  publicToken: string | null;
  verificationCode: string;
  issuedAt: string;
  revoked: boolean;
  confidence: { score: number; level: "high" | "medium" | "low"; reasons: string[] } | null;
  rubricOverall: number | null;
  evidence: { mergedPRs: number; commitsByStudent: number; activeDays: number } | null;
  student: {
    name: string;
    email: string;
    githubUsername: string | null;
    projectsCompleted: number;
  };
  project: string;
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

export default function CandidatesPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    fetch("/api/candidates", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load candidates");
        setCandidates(data.candidates ?? []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  const busy = authLoading || loading;

  return (
    <AppShell>
      <div className="px-4 pb-16 pt-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <PageHeader
            eyebrow={
              <span className="inline-flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Talent
              </span>
            }
            title="Certified candidates"
            description="Ranked by verified contribution confidence and rubric score — evidence you can open and audit, not a résumé."
            meta={
              !busy &&
              candidates.length > 0 ? (
                <>
                  <Meta label="Candidates" value={candidates.length} />
                  <Meta
                    label="Revoked"
                    value={candidates.filter((c) => c.revoked).length}
                  />
                </>
              ) : undefined
            }
          />

          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle p-4"
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {busy ? (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex gap-4 border-b border-border px-4 py-4 last:border-0"
                >
                  <Skeleton className="h-12 w-16" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No certified candidates yet"
              description="Candidates appear here once a Proof-of-Work Report is issued for a completed engagement."
              action={{ label: "Open engagements", href: "/engagements" }}
              secondary={{ label: "How reports work", href: "/verify" }}
            />
          ) : (
            <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {candidates.map((c, i) => (
                <li
                  key={c.certificateId}
                  className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    {/* Score block comes first — evidence before identity. */}
                    <div className="w-[92px] shrink-0 border-r border-border pr-3">
                      <p className="tnum text-2xl font-semibold leading-none tracking-tight text-foreground">
                        {c.confidence ? c.confidence.score : "—"}
                        <span className="text-xs font-normal text-subtle-foreground">
                          /100
                        </span>
                      </p>
                      <p className="mt-1 text-2xs uppercase tracking-[0.08em] text-muted-foreground">
                        Confidence
                        {c.confidence ? ` · ${c.confidence.level}` : ""}
                      </p>
                      <p className="mt-2 font-mono text-xs text-foreground">
                        <span className="tnum">
                          {c.rubricOverall != null ? c.rubricOverall.toFixed(1) : "—"}
                        </span>
                        <span className="text-subtle-foreground">/5</span>
                      </p>
                      <p className="text-2xs uppercase tracking-[0.08em] text-muted-foreground">
                        Rubric
                      </p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-2xs text-subtle-foreground">
                          #{i + 1}
                        </span>
                        <h3 className="truncate text-md font-medium text-foreground">
                          {c.student.name}
                        </h3>
                        <StatusBadge status={c.revoked ? "Revoked" : "Verified"} />
                        <Avatar size="sm" className="ring-1 ring-border">
                          <AvatarFallback>{initials(c.student.name)}</AvatarFallback>
                        </Avatar>
                      </div>

                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {c.project}
                        {c.student.githubUsername ? (
                          <>
                            {" · "}
                            <span className="font-mono">@{c.student.githubUsername}</span>
                          </>
                        ) : null}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                        {c.evidence ? (
                          <>
                            <span className="inline-flex items-center gap-1">
                              <GitPullRequest className="h-3.5 w-3.5 text-subtle-foreground" />
                              <span className="tnum font-mono text-foreground">
                                {c.evidence.mergedPRs}
                              </span>
                              merged PRs
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <GitCommitHorizontal className="h-3.5 w-3.5 text-subtle-foreground" />
                              <span className="tnum font-mono text-foreground">
                                {c.evidence.commitsByStudent}
                              </span>
                              commits
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5 text-subtle-foreground" />
                              <span className="tnum font-mono text-foreground">
                                {c.evidence.activeDays}
                              </span>
                              active days
                            </span>
                          </>
                        ) : (
                          <span>Evidence snapshot not captured</span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <span className="text-subtle-foreground">Issued</span>
                          <span className="font-mono">{formatDate(c.issuedAt)}</span>
                        </span>
                      </div>

                      {c.student.email && !c.revoked && (
                        <p className="mt-1.5 truncate text-xs text-subtle-foreground">
                          Contact <span className="font-mono">{c.student.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    {c.publicToken && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/r/${c.publicToken}`}>
                          Report
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/verify/${c.verificationCode}`}>Verify</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </AppShell>
  );
}
