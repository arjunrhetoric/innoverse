"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Ban,
  Download,
  Loader2,
  GitPullRequest,
  GitCommitHorizontal,
  CalendarDays,
  MessageSquare,
  Milestone as MilestoneIcon,
  TrendingUp,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-4xl">
          {loading ? (
            <Skeleton className="h-96 w-full rounded-2xl" />
          ) : error || !report ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <p className="text-muted-foreground">{error || "Report not found"}</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/">Go home</Link>
              </Button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {report.revoked && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                  <Ban className="h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-sm text-red-500">
                    This report was revoked
                    {report.revokedAt ? ` on ${new Date(report.revokedAt).toLocaleDateString()}` : ""}
                    {report.revocationReason ? ` — ${report.revocationReason}` : "."}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Innoverse · Proof-of-Work Report
                </p>
                <h1 className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">
                  {report.student?.name ?? "Student"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {report.problem?.title ?? "Project"} · {report.startup?.companyName || report.startup?.name || "Startup"}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant={report.revoked ? "destructive" : "success"} className="text-[10px]">
                    {report.revoked ? "Revoked" : "Verified"}
                  </Badge>
                  {report.confidence && (
                    <Badge
                      variant={report.confidence.level === "high" ? "success" : report.confidence.level === "medium" ? "info" : "destructive"}
                      className="text-[10px]"
                    >
                      {report.confidence.score}/100 confidence · {report.confidence.level}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Issued {new Date(report.issuedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Evidence */}
              {report.evidence && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-medium">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Evidence snapshot
                  </h2>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Stat icon={GitPullRequest} label="Merged PRs" value={String(report.evidence.mergedPRs)} />
                    <Stat icon={GitCommitHorizontal} label="Commits by student" value={String(report.evidence.commitsByStudent)} />
                    <Stat icon={CalendarDays} label="Active days" value={String(report.evidence.activeDays)} />
                    <Stat icon={MessageSquare} label="Review comments" value={String(report.evidence.reviewsGiven)} />
                    <Stat icon={MilestoneIcon} label="Milestones" value={`${report.evidence.milestonesCompleted}/${report.evidence.milestonesTotal}`} />
                    <Stat label="PRs opened" value={String(report.evidence.prsOpened)} />
                    <Stat label="Lines added" value={String(report.evidence.linesAdded)} />
                    <Stat label="Lines removed" value={String(report.evidence.linesDeleted)} />
                  </div>
                </div>
              )}

              {/* Rubric + confidence */}
              <div className="grid gap-5 md:grid-cols-2">
                {report.rubric && (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h2 className="mb-4 text-sm font-medium">Reviewer rubric</h2>
                    <div className="space-y-4">
                      {report.rubric.rows.map((row) => (
                        <div key={row.key}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span>{row.label}</span>
                            <span className="text-muted-foreground">{row.score.toFixed(1)} / 5</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(row.score / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                      Overall <span className="font-medium text-foreground">{report.rubric.overall.toFixed(2)} / 5</span>
                    </p>
                  </div>
                )}

                {report.confidence && (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-medium">Contribution confidence</h2>
                      <span className="text-2xl font-medium tracking-tight">{report.confidence.score}</span>
                    </div>
                    <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          report.confidence.level === "high"
                            ? "bg-emerald-500"
                            : report.confidence.level === "medium"
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${report.confidence.score}%` }}
                      />
                    </div>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {report.confidence.reasons.map((reason) => (
                        <li key={reason} className="flex gap-1.5">
                          <span className="text-primary">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {report.summary && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="mb-2 text-sm font-medium">Reviewer summary</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{report.summary}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {report.certificateFile && (
                  <Button variant="outline" asChild>
                    <a href={report.certificateFile} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Download certificate (PDF)
                    </a>
                  </Button>
                )}
                <Button variant="ghost" asChild>
                  <Link href={`/verify/${report.verificationCode}`}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Verify this credential
                  </Link>
                </Button>
              </div>

              {report.sha256 && (
                <p className="font-mono text-[10px] text-muted-foreground/70 break-all">
                  SHA-256 {report.sha256}
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <p className="mt-1 text-lg font-medium tracking-tight">{value}</p>
    </div>
  );
}
