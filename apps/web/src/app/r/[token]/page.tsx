"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Ban,
  CalendarDays,
  Download,
  FileWarning,
  Fingerprint,
  GitCommitHorizontal,
  GitPullRequest,
  MessageSquare,
  Milestone as MilestoneIcon,
  Printer,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Progress, ProgressRow } from "@/components/ui/progress";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

interface Report {
  publicToken: string;
  issuedAt: string;
  verificationCode: string;
  certificateFile: string;
  sha256: string | null;
  revoked: boolean;
  revokedAt: string | null;
  revocationReason: string | null;
  summary: string;
  rating: number;
  evidence: {
    mergedPRs: number;
    prsOpened: number;
    commits: number;
    commitsByStudent: number;
    commitsByOthers: number;
    activeDays: number;
    linesAdded: number;
    linesDeleted: number;
    reviewsGiven: number;
    milestonesCompleted: number;
    milestonesTotal: number;
  } | null;
  rubric: {
    rows: Array<{ key: string; label: string; score: number; weight: number; weighted: number }>;
    overall: number;
  } | null;
  confidence: { score: number; level: "high" | "medium" | "low"; reasons: string[] } | null;
  student: { name: string; githubUsername: string | null; projectsCompleted: number } | null;
  startup: { name: string; companyName: string | null } | null;
  problem: { title: string } | null;
}

export default function ReportPage() {
  const params = useParams();
  const token = params.token as string;
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Read the shareable URL on the client only; the server snapshot is empty. */
  const reportUrl = useSyncExternalStore(
    () => () => {},
    () => `${window.location.origin}/r/${token}`,
    () => ""
  );

  useEffect(() => {
    fetch(`/api/reports/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Report not found");
        setReport(data.report);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Report not found"))
      .finally(() => setLoading(false));
  }, [token]);

  const startupName = report?.startup?.companyName || report?.startup?.name || "Startup";
  const confidenceTone =
    report?.confidence?.level === "high"
      ? "success"
      : report?.confidence?.level === "medium"
        ? "warning"
        : "danger";

  return (
    <main className="min-h-screen bg-background">
      <div className="print-hide">
        <Navbar />
      </div>

      <div className="mx-auto w-full max-w-[1160px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <div className="mx-auto max-w-3xl">
          {/* Toolbar — screen only */}
          <div className="print-hide mb-5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/talent">Talent directory</Link>
              </Button>
              {!loading && report && (
                <Badge variant="outline" className="font-mono">
                  /r/{token.slice(0, 8)}…
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {reportUrl && (
                <CopyButton value={reportUrl} label="Copy report link" showValue={false} />
              )}
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer />
                Print
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="mt-4 h-8 w-64" />
                <Skeleton className="mt-2 h-3 w-80" />
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <Skeleton className="h-4 w-32" />
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              </div>
            </div>
          ) : error || !report ? (
            <div role="alert">
              <EmptyState
                icon={FileWarning}
                title="Report not found"
                description={error || "This link may have expired, or the report was never published."}
                action={{ label: "Browse verified talent", href: "/talent" }}
                secondary={{ label: "Verify a code", href: "/verify" }}
              />
            </div>
          ) : (
            <article className="overflow-hidden rounded-xl border border-border bg-card print-plain">
              {report.revoked && (
                <div className="flex items-start gap-2 border-b border-danger-border bg-danger-subtle px-5 py-3">
                  <Ban className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
                  <p className="text-xs leading-relaxed text-danger">
                    This report was revoked
                    {report.revokedAt ? ` on ${formatDate(report.revokedAt)}` : ""}
                    {report.revocationReason ? ` — ${report.revocationReason}` : "."}
                  </p>
                </div>
              )}

              {/* Document header */}
              <header className="border-b border-border px-5 py-6 sm:px-8 sm:py-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-2xs uppercase tracking-[0.18em] text-subtle-foreground">
                    Innoverse · Proof-of-Work Report
                  </span>
                  <StatusBadge status={report.revoked ? "revoked" : "verified"} />
                </div>

                <h1 className="mt-3 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                  {report.student?.name ?? "Student"}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {report.problem?.title ?? "Project"}
                </p>

                <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-border pt-5 sm:grid-cols-2">
                  <Fact label="Issued by" value={startupName} />
                  <Fact
                    label="Recipient"
                    value={
                      report.student?.githubUsername
                        ? `${report.student.name} · @${report.student.githubUsername}`
                        : report.student?.name ?? "Student"
                    }
                  />
                  <Fact label="Challenge" value={report.problem?.title ?? "Project"} />
                  <Fact label="Issued on" value={formatDate(report.issuedAt)} mono />
                </dl>
              </header>

              {report.summary && (
                <section className="border-b border-border px-5 py-6 sm:px-8">
                  <h2 className="text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground">
                    Reviewer summary
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">{report.summary}</p>
                </section>
              )}

              {/* Evidence */}
              {report.evidence && (
                <section className="border-b border-border px-5 py-6 sm:px-8">
                  <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <TrendingUp className="h-4 w-4 text-brand" aria-hidden />
                    Evidence snapshot
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Counted from the repository at the moment the report was issued.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
                    <EvidenceCell
                      icon={GitPullRequest}
                      label="Merged PRs"
                      value={report.evidence.mergedPRs}
                    />
                    <EvidenceCell
                      icon={GitCommitHorizontal}
                      label="Commits by student"
                      value={report.evidence.commitsByStudent}
                    />
                    <EvidenceCell
                      icon={CalendarDays}
                      label="Active days"
                      value={report.evidence.activeDays}
                    />
                    <EvidenceCell
                      icon={MessageSquare}
                      label="Reviews given"
                      value={report.evidence.reviewsGiven}
                    />
                    <EvidenceCell
                      icon={MilestoneIcon}
                      label="Milestones"
                      value={`${report.evidence.milestonesCompleted}/${report.evidence.milestonesTotal}`}
                    />
                    <EvidenceCell label="PRs opened" value={report.evidence.prsOpened} />
                    <EvidenceCell label="Lines added" value={report.evidence.linesAdded} />
                    <EvidenceCell label="Lines removed" value={report.evidence.linesDeleted} />
                  </div>
                </section>
              )}

              {/* Rubric + confidence */}
              <div className="grid divide-y divide-border border-b border-border md:grid-cols-2 md:divide-x md:divide-y-0">
                {report.rubric && (
                  <section className="px-5 py-6 sm:px-8">
                    <h2 className="text-sm font-medium text-foreground">Reviewer rubric</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Scored by {startupName} on a five-point scale.
                    </p>
                    <div className="mt-4 space-y-3">
                      {report.rubric.rows.map((row) => (
                        <ProgressRow
                          key={row.key}
                          label={row.label}
                          value={row.score}
                          max={5}
                          suffix={`${row.score.toFixed(1)} / 5`}
                        />
                      ))}
                    </div>
                    <p className="mt-4 flex items-baseline justify-between border-t border-border pt-3 text-xs">
                      <span className="text-muted-foreground">Overall</span>
                      <span className="tnum font-mono text-sm text-foreground">
                        {report.rubric.overall.toFixed(2)} / 5
                      </span>
                    </p>
                  </section>
                )}

                {report.confidence && (
                  <section className="px-5 py-6 sm:px-8">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="text-sm font-medium text-foreground">Contribution confidence</h2>
                      <span className="tnum text-2xl font-semibold tracking-tight text-foreground">
                        {report.confidence.score}
                        <span className="text-sm font-normal text-subtle-foreground">/100</span>
                      </span>
                    </div>
                    <Progress value={report.confidence.score} tone={confidenceTone} className="mt-3" />
                    <p className="mt-2 text-2xs uppercase tracking-[0.08em] text-subtle-foreground">
                      {report.confidence.level} confidence
                    </p>
                    <ul className="mt-4 space-y-1.5">
                      {report.confidence.reasons.map((reason) => (
                        <li key={reason} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                          <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              {/* Honest fallback for reports issued before evidence capture existed */}
              {!report.evidence && !report.rubric && !report.confidence && (
                <section className="border-b border-border px-5 py-6 sm:px-8">
                  <h2 className="text-sm font-medium text-foreground">Evidence not captured</h2>
                  <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
                    This report was issued before Innoverse started recording repository
                    evidence and reviewer scoring. The certificate record itself is still
                    verifiable — its code, issue date and fingerprint are shown below.
                  </p>
                </section>
              )}

              {/* Verification footer */}
              <footer className="bg-surface px-5 py-5 sm:px-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground">
                      <ShieldCheck className="h-3 w-3" aria-hidden />
                      Verification
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Code</span>
                      <CopyButton value={report.verificationCode} />
                    </div>
                    {report.sha256 && (
                      <div className="mt-2 flex items-start gap-1.5">
                        <Fingerprint
                          className="mt-1 h-3 w-3 shrink-0 text-subtle-foreground"
                          aria-hidden
                        />
                        <p className="break-all font-mono text-2xs leading-relaxed text-subtle-foreground">
                          {report.sha256}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {report.certificateFile && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`/api/certificates/verify/${report.verificationCode}/file`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download />
                          Download PDF
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/verify/${report.verificationCode}`}>
                        <ShieldCheck />
                        Verify this credential
                      </Link>
                    </Button>
                  </div>
                </div>

                <p className="mt-4 border-t border-border pt-3 font-mono text-2xs text-subtle-foreground">
                  Issued {formatDate(report.issuedAt)} · Innoverse
                </p>
              </footer>
            </article>
          )}
        </div>
      </div>

      <div className="print-hide">
        <Footer />
      </div>
    </main>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs uppercase tracking-[0.08em] text-subtle-foreground">{label}</dt>
      <dd className={`mt-0.5 break-words text-sm text-foreground ${mono ? "tnum font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function EvidenceCell({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-card px-3 py-3">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-subtle-foreground" aria-hidden />}
        <p className="text-2xs uppercase tracking-[0.06em] text-muted-foreground">{label}</p>
      </div>
      <p className="tnum mt-1 text-md font-medium text-foreground">{value}</p>
    </div>
  );
}
