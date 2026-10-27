"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  GitPullRequest,
  Star,
  MapPin,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-5">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/talent">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Talent
              </Link>
            </Button>
          </div>

          {loading ? (
            <Skeleton className="h-80 w-full rounded-2xl" />
          ) : error || !data ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <p className="text-muted-foreground">{error || "Profile not found"}</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
                      {data.student.name}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {data.student.headline || "Student developer"}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {data.student.githubUsername && (
                        <a
                          href={`https://github.com/${data.student.githubUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          @{data.student.githubUsername}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {data.student.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {data.student.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-primary" />
                        {data.reports.length} verified report{data.reports.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  {data.reports[0] && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/r/${data.reports[0].token}`}>
                        Open latest report
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>

                {data.student.skills.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {data.student.skills.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="mb-3 text-sm font-medium">Proof-of-Work Reports</h2>
                {data.reports.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border py-12 text-center">
                    <p className="text-sm text-muted-foreground">No published reports yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.reports.map((r) => (
                      <div key={r.verificationCode} className="rounded-xl border border-border bg-card p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-sm font-medium">{r.project}</h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {r.startup} · {formatDate(r.issuedAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {r.confidence && (
                              <Badge
                                variant={r.confidence.level === "high" ? "success" : r.confidence.level === "medium" ? "info" : "destructive"}
                                className="text-[10px]"
                              >
                                {r.confidence.score}/100
                              </Badge>
                            )}
                            {r.rubricOverall != null && (
                              <Badge variant="outline" className="text-[10px]">
                                <Star className="mr-1 h-3 w-3 text-amber-500" />
                                {r.rubricOverall.toFixed(1)}/5
                              </Badge>
                            )}
                          </div>
                        </div>

                        {r.evidence && (
                          <div className="mt-3 flex flex-wrap gap-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <GitPullRequest className="h-3 w-3" />
                              {r.evidence.mergedPRs} merged PRs
                            </span>
                            <span>{r.evidence.commitsByStudent} commits</span>
                            <span>{r.evidence.activeDays} active days</span>
                          </div>
                        )}

                        {r.summary && (
                          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                            {r.summary}
                          </p>
                        )}

                        <div className="mt-3 flex gap-2">
                          {r.token && (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/r/${r.token}`}>Open report</Link>
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/verify/${r.verificationCode}`}>Verify</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
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
