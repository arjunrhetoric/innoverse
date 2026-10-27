"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Users, FileCheck2, GitPullRequest, ShieldCheck, ExternalLink, Download } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/ui/copy-button";
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

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/institution">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cohorts
              </Link>
            </Button>
          </div>

          {loading ? (
            <Skeleton className="h-96 w-full rounded-2xl" />
          ) : error || !data ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <p className="text-muted-foreground">{error || "Cohort not found"}</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">{data.cohort.name}</h1>
                {data.cohort.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{data.cohort.description}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Join code</span>
                  <span className="font-mono text-sm font-medium">{data.cohort.joinCode}</span>
                  <CopyButton value={data.cohort.joinCode} />
                  <span className="text-muted-foreground">Share this with students to enrol them.</span>
                  <Button size="sm" variant="outline" asChild className="ml-auto">
                    <a href={`/api/cohorts/${data.cohort.id}/export`}>
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Export CSV
                    </a>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> Students
                  </p>
                  <p className="mt-1 text-2xl font-medium tracking-tight">{data.stats.members}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileCheck2 className="h-3 w-3" /> Reports
                  </p>
                  <p className="mt-1 text-2xl font-medium tracking-tight">{data.stats.reports}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <GitPullRequest className="h-3 w-3" /> Merged PRs
                  </p>
                  <p className="mt-1 text-2xl font-medium tracking-tight">{data.stats.mergedPRs}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3 w-3" /> Participation
                  </p>
                  <p className="mt-1 text-2xl font-medium tracking-tight">
                    {data.stats.participation}%
                  </p>
                </div>
              </div>

              {data.skills.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="mb-3 text-sm font-medium">Skills coverage</h2>
                  <div className="space-y-2">
                    {data.skills.map((s) => {
                      const max = data.skills[0]?.count || 1;
                      return (
                        <div key={s.name} className="flex items-center gap-3">
                          <span className="w-32 shrink-0 truncate text-xs">{s.name}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(s.count / max) * 100}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-[11px] text-muted-foreground">{s.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h2 className="mb-3 text-sm font-medium">Students</h2>
                {data.members.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border py-16 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No students have joined yet. Share the join code.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Student</th>
                          <th className="px-4 py-2.5 font-medium">Reports</th>
                          <th className="px-4 py-2.5 font-medium">Confidence</th>
                          <th className="px-4 py-2.5 font-medium">Merged PRs</th>
                          <th className="px-4 py-2.5 font-medium">Joined</th>
                          <th className="px-4 py-2.5 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {data.members.map((m) => (
                          <tr key={m.id} className="border-t border-border/60">
                            <td className="px-4 py-2.5">
                              <p className="font-medium">{m.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {m.githubUsername ? `@${m.githubUsername}` : m.headline || "Student"}
                              </p>
                            </td>
                            <td className="px-4 py-2.5">{m.reportCount}</td>
                            <td className="px-4 py-2.5">
                              {m.avgConfidence != null ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {m.avgConfidence}/100
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">{m.mergedPRs}</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                              {formatDate(m.joinedAt)}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {m.latestReportToken && (
                                <Link
                                  href={`/r/${m.latestReportToken}`}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                >
                                  Report
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
