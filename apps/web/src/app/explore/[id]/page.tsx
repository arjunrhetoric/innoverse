"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Code2,
  GitPullRequest,
  Compass,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/explore"
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Explore
          </Link>

          {loading ? (
            <Skeleton className="h-96 w-full rounded-2xl" />
          ) : error || !challenge ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <p className="text-muted-foreground">{error || "Challenge not found"}</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={challenge.completed ? "secondary" : "success"} className="text-[10px]">
                    {challenge.completed ? "Closed" : "Open"}
                  </Badge>
                  {challenge.contributionType === "issue" && (
                    <Badge variant="outline" className="text-[10px]">
                      <Compass className="mr-1 h-3 w-3" />
                      Open-source issue
                    </Badge>
                  )}
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {challenge.startup}
                  </span>
                </div>

                <h1 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
                  {challenge.title}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(challenge.deadline)}
                  </span>
                  {challenge.repo && (
                    <a
                      href={challenge.issueUrl || challenge.repoUrl || `https://github.com/${challenge.repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono hover:text-foreground"
                    >
                      <GitPullRequest className="h-3.5 w-3.5" />
                      {challenge.repo}
                      {challenge.issueNumber ? `#${challenge.issueNumber}` : ""}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {challenge.description}
                </div>

                {challenge.skills.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-1.5">
                    {challenge.skills.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">
                        <Code2 className="mr-1 h-2.5 w-2.5" />
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}

                {challenge.labels.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {challenge.labels.map((label) => (
                      <Badge key={label} variant="outline" className="text-[10px]">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-8 flex flex-wrap gap-2 border-t border-border/60 pt-5">
                  {challenge.completed ? (
                    <p className="text-sm text-muted-foreground">
                      This challenge is closed. Browse other open challenges.
                    </p>
                  ) : (
                    <>
                      <Button variant="default" asChild>
                        <Link href={applyHref}>
                          {isAuthenticated && role === "Student" ? "Apply with a proposal" : "Sign in to apply"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <p className="self-center text-[11px] text-muted-foreground">
                        {isAuthenticated && role === "Student"
                          ? "Upload a short deck and describe your approach."
                          : "Students sign in with GitHub to apply."}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
