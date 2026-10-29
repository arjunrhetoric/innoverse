"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Code2,
  ExternalLink,
  GitPullRequest,
  ShieldCheck,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageHeader, Meta } from "@/components/ui/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useUser } from "@/hooks/useUser";
import { formatDate } from "@/lib/utils";

interface Challenge {
  id: string;
  title: string;
  description: string;
  skills: string[];
  deadline: string;
  startup: string;
  contributionType: "project" | "issue";
  repo: string | null;
  repoUrl: string | null;
  issueNumber: number | null;
  issueUrl: string | null;
  labels: string[];
  completed: boolean;
}

export default function ExploreChallengePage() {
  const params = useParams();
  const id = params.id as string;
  const { isAuthenticated, role } = useUser();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/explore/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Challenge not found");
        setChallenge(data.challenge);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Challenge not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const applyHref =
    isAuthenticated && role === "Student"
      ? `/proposals/submit/${id}`
      : "/login";

  const repoHref = challenge
    ? challenge.issueUrl || challenge.repoUrl || `https://github.com/${challenge.repo}`
    : "#";
  const repoLabel = challenge
    ? `${challenge.repo}${challenge.issueNumber ? `#${challenge.issueNumber}` : ""}`
    : "";

  const shipText = challenge
    ? challenge.contributionType === "issue"
      ? `A merged pull request${challenge.repo ? ` against ${repoLabel}` : ""}, reviewed by the startup. Every commit in the branch is recorded for the report.`
      : `A delivered project built against this brief${challenge.repo ? ` in ${repoLabel}` : ""}. Commits, pull requests and reviews are recorded as the work happens.`
    : "";

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto w-full max-w-[1160px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        {loading ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="mt-6 h-48 w-full rounded-lg" />
            </div>
            <Skeleton className="h-56 w-full rounded-lg" />
          </div>
        ) : error || !challenge ? (
          <div role="alert" className="mx-auto max-w-xl">
            <EmptyState
              icon={CalendarDays}
              title="This challenge is not available"
              description={error || "Challenge not found. It may have been closed or removed by the startup."}
              action={{ label: "Back to explore", href: "/explore" }}
              secondary={{ label: "Verify a code", href: "/verify" }}
            />
          </div>
        ) : (
          <>
            <PageHeader
              back={{ href: "/explore", label: "Explore" }}
              eyebrow={
                <>
                  <StatusBadge status={challenge.completed ? "closed" : "open"} />
                  <span className="font-mono text-2xs uppercase tracking-[0.14em] text-muted-foreground">
                    {challenge.startup}
                  </span>
                </>
              }
              title={challenge.title}
              meta={
                <>
                  <Meta label="Deadline" value={formatDate(challenge.deadline)} />
                  <Meta
                    label="Contribution"
                    value={challenge.contributionType === "issue" ? "Open-source issue" : "Project"}
                  />
                  {challenge.repo && (
                    <a
                      href={repoHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <GitPullRequest className="h-3.5 w-3.5" aria-hidden />
                      <span className="font-mono">{repoLabel}</span>
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  )}
                </>
              }
              actions={
                !challenge.completed && (
                  <Button variant="default" size="lg" asChild>
                    <Link href={applyHref}>
                      {isAuthenticated && role === "Student"
                        ? "Apply with a proposal"
                        : "Sign in to apply"}
                      <ArrowRight />
                    </Link>
                  </Button>
                )
              }
            />

            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <article className="min-w-0 space-y-8">
                <section aria-labelledby="summary">
                  <h2 id="summary" className="mb-2 text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground">
                    Summary
                  </h2>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {challenge.description}
                  </div>
                </section>

                {challenge.skills.length > 0 && (
                  <section aria-labelledby="requirements">
                    <h2
                      id="requirements"
                      className="mb-2 text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground"
                    >
                      Requirements
                    </h2>
                    <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                      The startup expects working familiarity with these:
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {challenge.skills.map((s) => (
                        <li key={s}>
                          <Badge variant="secondary" className="font-mono">
                            <Code2 className="h-3 w-3" aria-hidden />
                            {s}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {challenge.labels.length > 0 && (
                  <section aria-labelledby="labels">
                    <h2
                      id="labels"
                      className="mb-2 text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground"
                    >
                      Issue labels
                    </h2>
                    <ul className="flex flex-wrap gap-1.5">
                      {challenge.labels.map((label) => (
                        <li key={label}>
                          <Badge variant="outline" className="font-mono">
                            {label}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section
                  aria-labelledby="ship"
                  className="rounded-lg border border-border bg-surface-2 p-5"
                >
                  <h2 id="ship" className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden />
                    What you will ship
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{shipText}</p>
                  <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-subtle-foreground">
                    Contribution confidence is scored from your commits, pull requests and review
                    activity in the repository. A startup-signed Proof-of-Work Report is issued on
                    completion.
                  </p>
                </section>

                {challenge.completed && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                    <StatusBadge status="closed" />
                    <p className="text-sm text-muted-foreground">
                      This challenge is closed. Browse other open briefs.
                    </p>
                    <Button variant="outline" size="sm" className="ml-auto" asChild>
                      <Link href="/explore">Browse challenges</Link>
                    </Button>
                  </div>
                )}
              </article>

              <aside aria-label="Challenge facts" className="lg:sticky lg:top-20 lg:self-start">
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <h2 className="border-b border-border px-4 py-3 text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground">
                    Facts
                  </h2>
                  <dl className="divide-y divide-border text-xs">
                    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                      <dt className="text-muted-foreground">Company</dt>
                      <dd className="truncate font-mono text-foreground">{challenge.startup}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>
                        <StatusBadge status={challenge.completed ? "closed" : "open"} />
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                      <dt className="text-muted-foreground">Contribution</dt>
                      <dd className="text-foreground">
                        {challenge.contributionType === "issue" ? "Issue" : "Project"}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                      <dt className="text-muted-foreground">Deadline</dt>
                      <dd className="tnum font-mono text-foreground">{formatDate(challenge.deadline)}</dd>
                    </div>
                    {challenge.repo && (
                      <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                        <dt className="text-muted-foreground">Repository</dt>
                        <dd className="min-w-0">
                          <a
                            href={repoHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-full items-center gap-1 truncate font-mono text-foreground underline-offset-4 hover:underline"
                          >
                            <span className="truncate">{repoLabel}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-surface px-4 py-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Work delivered here becomes a verifiable report, not a résumé line.{" "}
                    <Link href="/verify" className="text-foreground underline underline-offset-4">
                      See what verification shows
                    </Link>
                    .
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
