"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Code2, Calendar, ShieldCheck, GitPullRequest } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, truncateText } from "@/lib/utils";

interface Challenge {
  id: string;
  title: string;
  description: string;
  skills: string[];
  deadline: string;
  startup: string;
  hasRepo: boolean;
}

interface ReportCard {
  token: string;
  issuedAt: string;
  confidence: { score: number; level: string } | null;
  rubricOverall: number | null;
  studentName: string;
  problemTitle: string;
}

export default function ExplorePage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [reports, setReports] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/explore")
      .then((res) => res.json())
      .then((data) => {
        setChallenges(data.challenges ?? []);
        setReports(data.reports ?? []);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Public
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
              Explore real startup work
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              No account needed. Browse open challenges and published Proof-of-Work Reports.
            </p>
          </motion.div>

          {reports.length > 0 && (
            <section className="mt-12">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Published reports
                </h2>
                <Link href="/verify" className="text-xs text-muted-foreground hover:text-foreground">
                  Verify by code →
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reports.map((r) => (
                  <Link
                    key={r.token}
                    href={`/r/${r.token}`}
                    className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/25"
                  >
                    <p className="text-sm font-medium">{r.problemTitle}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">by {r.studentName}</p>
                    <div className="mt-3 flex items-center gap-2">
                      {r.confidence && (
                        <Badge variant="secondary" className="text-[10px]">
                          {r.confidence.score}/100 confidence
                        </Badge>
                      )}
                      {r.rubricOverall != null && (
                        <Badge variant="outline" className="text-[10px]">
                          rubric {r.rubricOverall.toFixed(1)}/5
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-12">
            <h2 className="mb-4 text-sm font-medium">Open challenges</h2>
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 rounded-lg" />
                ))}
              </div>
            ) : challenges.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-16 text-center">
                <p className="text-sm text-muted-foreground">No open challenges yet.</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link href="/login">Be the first startup to post one</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {challenges.map((c) => (
                  <div
                    key={c.id}
                    className="flex h-full flex-col rounded-lg border border-border bg-card p-5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium leading-snug">{c.title}</h3>
                      {c.hasRepo && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          <GitPullRequest className="mr-1 h-3 w-3" />
                          GitHub
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{c.startup}</p>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {truncateText(c.description, 140)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.skills.slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">
                          <Code2 className="mr-1 h-2.5 w-2.5" />
                          {s}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(c.deadline)}
                      </span>
                      <Link
                        href="/login"
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Apply
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
