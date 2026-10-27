"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, ShieldCheck, ExternalLink, GitPullRequest, Star } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="flex items-center gap-2 text-2xl font-medium tracking-tight sm:text-3xl">
              <Users className="h-6 w-6 text-primary" />
              Certified candidates
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Ranked by verified contribution confidence and rubric score — evidence you can open and audit, not a résumé.
            </p>
          </motion.div>

          {error && <p className="mt-6 text-sm text-destructive">{error}</p>}

          {authLoading || loading ? (
            <div className="mt-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="mt-10 rounded-lg border border-dashed border-border py-16 text-center">
              <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Candidates appear here once you issue a Proof-of-Work Report.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-3">
              {candidates.map((c, i) => (
                <motion.div
                  key={c.certificateId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{c.student.name}</h3>
                        {c.revoked ? (
                          <Badge variant="destructive" className="text-[10px]">Revoked</Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">Verified</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {c.project}
                        {c.student.githubUsername ? ` · @${c.student.githubUsername}` : ""}
                        {` · ${formatDate(c.issuedAt)}`}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {c.confidence && (
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-primary" />
                            {c.confidence.score}/100 confidence
                          </span>
                        )}
                        {c.rubricOverall != null && (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            {c.rubricOverall.toFixed(1)}/5 rubric
                          </span>
                        )}
                        {c.evidence && (
                          <span className="inline-flex items-center gap-1">
                            <GitPullRequest className="h-3 w-3" />
                            {c.evidence.mergedPRs} merged PRs · {c.evidence.commitsByStudent} commits
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {c.publicToken && (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/r/${c.publicToken}`}>
                            Report
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/verify/${c.verificationCode}`}>Verify</Link>
                      </Button>
                    </div>
                  </div>
                  {c.student.email && (
                    <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      Contact: {c.student.email}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
