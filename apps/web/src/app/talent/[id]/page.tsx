"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  ExternalLink,
  FileText,
  GitPullRequest,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageHeader, Meta } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat, StatBand } from "@/components/ui/stat";
import { ProgressRow } from "@/components/ui/progress";
import { Skeleton, SkeletonStats } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useUser } from "@/hooks/useUser";
import { formatDate } from "@/lib/utils";

interface Profile {
  student: {
    id: string;
    name: string;
    headline: string | null;
    skills: string[];
    location: string | null;
    githubUsername: string | null;
    projectsCompleted: number;
    memberSince: string;
  };
  reports: Array<{
    token: string | null;
    verificationCode: string;
    project: string;
    startup: string;
    issuedAt: string;
    rating: number;
    confidence: { score: number; level: string; reasons: string[] } | null;
    rubricOverall: number | null;
    evidence: { mergedPRs: number; commitsByStudent: number; activeDays: number } | null;
    summary: string | null;
  }>;
}

export default function TalentProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useUser();
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shortlisted, setShortlisted] = useState(false);
  const [savingShortlist, setSavingShortlist] = useState(false);

  useEffect(() => {
    fetch(`/api/talent/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Profile not found");
        setData(json);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Profile not found"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user?.role !== "Startup") return;
    fetch("/api/shortlist", { credentials: "include" })
      .then((res) => res.json())
      .then((json) =>
        setShortlisted(
          (json.shortlist ?? []).some(
            (entry: { student?: { id?: string } }) => entry.student?.id === id
          )
        )
      )
      .catch(() => null);
  }, [user, id]);

  const toggleShortlist = async () => {
    setSavingShortlist(true);
    setError("");
    try {
      const res = await fetch(
        shortlisted ? `/api/shortlist/${id}` : "/api/shortlist",
        {
          method: shortlisted ? "DELETE" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          ...(shortlisted ? {} : { body: JSON.stringify({ studentId: id }) }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not update shortlist");
      setShortlisted(!shortlisted);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update shortlist");
    } finally {
      setSavingShortlist(false);
    }
  };

  const reports = data?.reports ?? [];
  const mergedPRs = reports.reduce((sum, r) => sum + (r.evidence?.mergedPRs ?? 0), 0);
  const confidences = reports
    .map((r) => r.confidence?.score)
    .filter((n): n is number => typeof n === "number");
  const rubrics = reports
    .map((r) => r.rubricOverall)
    .filter((n): n is number => typeof n === "number");
  const avgConfidence = confidences.length
    ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
    : null;
  const avgRubric = rubrics.length
    ? rubrics.reduce((a, b) => a + b, 0) / rubrics.length
    : null;
  const latest = reports.find((r) => r.token);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto w-full max-w-[1160px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
            <SkeletonStats count={4} />
            <Skeleton className="h-56 w-full rounded-lg" />
          </div>
        ) : !data ? (
          <div role="alert" className="mx-auto max-w-xl">
            <EmptyState
              icon={Users}
              title="Profile not available"
              description={error || "This student has not published a public profile."}
              action={{ label: "Back to talent", href: "/talent" }}
            />
          </div>
        ) : (
          <>
            <PageHeader
              back={{ href: "/talent", label: "Talent" }}
              eyebrow={
                <Badge variant="success">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Verified evidence
                </Badge>
              }
              title={data.student.name}
              description={data.student.headline || "Student developer"}
              meta={
                <>
                  {data.student.githubUsername && (
                    <a
                      href={`https://github.com/${data.student.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span className="font-mono">@{data.student.githubUsername}</span>
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  )}
                  {data.student.location && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" aria-hidden />
                      {data.student.location}
                    </span>
                  )}
                  {data.student.memberSince &&
                    !Number.isNaN(new Date(data.student.memberSince).getTime()) && (
                      <Meta label="Member since" value={formatDate(data.student.memberSince)} />
                    )}
                  <Meta label="Projects" value={data.student.projectsCompleted} />
                </>
              }
              actions={
                <>
                  {latest?.token && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/r/${latest.token}`}>
                        <FileText />
                        Open latest report
                      </Link>
                    </Button>
                  )}
                  {user?.role === "Startup" && (
                    <Button
                      size="sm"
                      variant={shortlisted ? "outline" : "default"}
                      onClick={toggleShortlist}
                      disabled={savingShortlist}
                    >
                      {shortlisted ? <BookmarkCheck /> : <Bookmark />}
                      {savingShortlist
                        ? "Saving…"
                        : shortlisted
                          ? "Remove from shortlist"
                          : "Shortlist"}
                    </Button>
                  )}
                </>
              }
            />

            {error && (
              <p
                role="alert"
                className="mb-5 rounded-md border border-danger-border bg-danger-subtle px-3 py-2 text-xs text-danger"
              >
                {error}
              </p>
            )}

            <StatBand
              className="mb-8"
              items={[
                { label: "Verified reports", value: reports.length },
                { label: "Merged PRs", value: mergedPRs },
                {
                  label: "Avg confidence",
                  value: avgConfidence != null ? `${avgConfidence}/100` : "—",
                },
                {
                  label: "Avg rubric",
                  value: avgRubric != null ? `${avgRubric.toFixed(1)}/5` : "—",
                },
              ]}
            />

            {data.student.skills.length > 0 && (
              <ul className="mb-8 flex flex-wrap gap-1.5">
                {data.student.skills.map((s) => (
                  <li key={s}>
                    <Badge variant="secondary" className="font-mono">
                      {s}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
              <section aria-labelledby="reports">
                <h2 id="reports" className="mb-3 text-sm font-medium text-foreground">
                  Proof-of-Work Reports
                </h2>

                {reports.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No published reports yet"
                    description="Reports are issued by the startup when a project is complete. Nothing has been published for this student so far."
                    action={{ label: "See open challenges", href: "/explore" }}
                  />
                ) : (
                  <ul className="space-y-4">
                    {reports.map((r) => (
                      <li key={r.verificationCode}>
                        <article className="overflow-hidden rounded-lg border border-border bg-card">
                          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                            <div className="min-w-0">
                              <h3 className="text-sm font-medium text-foreground">{r.project}</h3>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {r.startup} ·{" "}
                                <span className="tnum font-mono">{formatDate(r.issuedAt)}</span>
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {r.confidence && (
                                <Badge
                                  variant={
                                    r.confidence.level === "high"
                                      ? "success"
                                      : r.confidence.level === "medium"
                                        ? "info"
                                        : "danger"
                                  }
                                  className="tnum"
                                >
                                  {r.confidence.score}/100
                                </Badge>
                              )}
                              {r.rubricOverall != null && (
                                <Badge variant="outline" className="tnum">
                                  {r.rubricOverall.toFixed(1)}/5
                                </Badge>
                              )}
                            </div>
                          </header>

                          <div className="space-y-4 px-5 py-4">
                            {r.rubricOverall != null && (
                              <ProgressRow
                                label="Reviewer rubric"
                                value={r.rubricOverall}
                                max={5}
                                suffix={`${r.rubricOverall.toFixed(1)} / 5`}
                                tone="brand"
                              />
                            )}

                            {r.evidence && (
                              <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
                                <Stat
                                  label="Merged PRs"
                                  value={r.evidence.mergedPRs}
                                  icon={GitPullRequest}
                                />
                                <Stat label="Commits" value={r.evidence.commitsByStudent} />
                                <Stat label="Active days" value={r.evidence.activeDays} />
                              </div>
                            )}

                            {r.summary && (
                              <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                                {r.summary}
                              </p>
                            )}
                          </div>

                          <footer className="flex flex-wrap items-center gap-2 border-t border-border bg-surface px-5 py-3">
                            {r.token && (
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/r/${r.token}`}>
                                  <FileText />
                                  Open report
                                </Link>
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" asChild>
                              <Link href={`/verify/${r.verificationCode}`}>
                                <ShieldCheck />
                                Verify credential
                              </Link>
                            </Button>
                            <span className="ml-auto font-mono text-2xs text-subtle-foreground">
                              {r.verificationCode}
                            </span>
                          </footer>
                        </article>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                <div className="rounded-lg border border-border bg-card p-4">
                  <h2 className="text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground">
                    For startups
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Shortlisting saves this student to your pipeline. Reports stay public, so every
                    claim can be re-checked before you talk.
                  </p>
                  {user?.role === "Startup" ? (
                    <Button
                      className="mt-3 w-full"
                      variant={shortlisted ? "outline" : "default"}
                      onClick={toggleShortlist}
                      disabled={savingShortlist}
                    >
                      {shortlisted ? <BookmarkCheck /> : <Bookmark />}
                      {savingShortlist
                        ? "Saving…"
                        : shortlisted
                          ? "Remove from shortlist"
                          : "Add to shortlist"}
                    </Button>
                  ) : (
                    <Button className="mt-3 w-full" variant="outline" asChild>
                      <Link href="/login">
                        Sign in as a startup
                        <ArrowUpRight />
                      </Link>
                    </Button>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-surface p-4">
                  <h2 className="text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground">
                    How to read this
                  </h2>
                  <ul className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
                    <li className="flex gap-2">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                      Confidence scores commit share, review activity and active days.
                    </li>
                    <li className="flex gap-2">
                      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                      Reports are signed by the issuing startup and fingerprinted with SHA-256.
                    </li>
                    <li className="flex gap-2">
                      <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                      Every report carries an issue date you can verify by code.
                    </li>
                  </ul>
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
