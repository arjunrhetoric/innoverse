"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Rocket,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import { StatusDot } from "@/components/ui/status-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { useUser } from "@/hooks/useUser";
import { dashboard } from "@/lib/api";
import { formatDate, getStatusColor, truncateText } from "@/lib/utils";
import type { Problem, Proposal } from "@/lib/types";

export default function StudentDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!user?.role) {
      router.push("/role-selection");
      return;
    }
    if (user.role !== "Student") {
      router.push("/dashboard/startup");
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await dashboard.student();
        setProblems(data.problems || []);
        setProposals(data.proposals || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated && user?.role === "Student") fetchData();
  }, [isAuthenticated, user]);

  const filteredProblems = useMemo(() => {
    if (!search.trim()) return problems;
    const q = search.toLowerCase();
    return problems.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.skillsRequired.some((s) => s.toLowerCase().includes(q))
    );
  }, [problems, search]);

  const stats = useMemo(
    () => ({
      total: problems.length,
      proposals: proposals.length,
      approved: proposals.filter((p) => p.status === "Approved").length,
      pending: proposals.filter((p) => p.status === "Pending").length,
    }),
    [problems, proposals]
  );

  if (authLoading || loading) {
    return <DashboardSkeleton />;
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Discover
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="type-display text-2xl font-medium text-foreground sm:text-[28px]">
              Welcome back, {user?.name || "Student"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore innovation challenges and build your developer portfolio.
            </p>
          </div>
        </div>
      </div>

      {/* Stats band */}
      <div className="mb-6 grid grid-cols-2 gap-6 border-y border-border py-5 sm:grid-cols-4">
        <Stat label="Challenges" value={stats.total} />
        <Stat label="Proposals" value={stats.proposals} />
        <Stat label="Approved" value={stats.approved} />
        <Stat label="Pending" value={stats.pending} />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="challenges" className="w-full">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="proposals">My Proposals</TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by title or skill…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Filter challenges"
            />
          </div>
        </div>

        {/* Challenges Tab */}
        <TabsContent value="challenges">
          {filteredProblems.length === 0 ? (
            <EmptyState
              icon={Rocket}
              title="No challenges found"
              description={search ? "Try adjusting your search query." : "Check back later for new challenges."}
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              {filteredProblems.map((problem, i) => (
                <ChallengeRow
                  key={problem._id}
                  problem={problem}
                  last={i === filteredProblems.length - 1}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Proposals Tab */}
        <TabsContent value="proposals">
          {proposals.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No proposals yet"
              description="Start by applying to a challenge you're interested in."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              {proposals.map((proposal, i) => (
                <ProposalRow
                  key={proposal._id}
                  proposal={proposal}
                  last={i === proposals.length - 1}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}



// ─── Sub-Components ──────────────────────────────────────────────────────────

function ChallengeRow({ problem, last }: { problem: Problem; last?: boolean }) {
  const isExpired = new Date(problem.finalDeadline) < new Date();

  const inner = (
    <>
      <StatusDot status={isExpired ? "default" : "active"} className="mt-1.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="truncate text-[15px] font-medium tracking-tight text-foreground">
            {problem.title}
          </h3>
          {isExpired ? (
            <Badge variant="outline" className="shrink-0 font-mono text-[11px] text-muted-foreground">
              Expired
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 border-emerald-500/30 bg-emerald-500/10 font-mono text-[11px] text-emerald-500">
              Active
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {truncateText(problem.description, 110)}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-xs text-muted-foreground">
            {(problem.skillsRequired || []).slice(0, 3).join(" · ")}
            {(problem.skillsRequired?.length || 0) > 3 &&
              ` +${problem.skillsRequired.length - 3}`}
          </span>
          <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(problem.finalDeadline)}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-100 group-hover:translate-x-0.5" />
    </>
  );

  const rowClass =
    "group flex items-start gap-3 px-4 py-3.5 transition-colors duration-100 hover:bg-white/[0.03]";

  if (isExpired) {
    return <div className={`${rowClass} ${last ? "" : "border-b border-border"}`}>{inner}</div>;
  }
  return (
    <Link
      href={`/proposals/submit/${problem._id}`}
      className={`${rowClass} ${last ? "" : "border-b border-border"}`}
      aria-label={`Apply to ${problem.title}`}
    >
      {inner}
    </Link>
  );
}

function ProposalRow({ proposal, last }: { proposal: Proposal; last?: boolean }) {
  const problem = typeof proposal.problemId === "object" ? proposal.problemId : null;
  const problemId = problem?._id || (typeof proposal.problemId === "string" ? proposal.problemId : null);

  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3.5 transition-colors duration-100 hover:bg-white/[0.03] ${
        last ? "" : "border-b border-border"
      }`}
    >
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-[15px] font-medium tracking-tight text-foreground">
          {problem?.title || "Challenge"}
        </h4>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {truncateText(proposal.description, 80)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge className={getStatusColor(proposal.status)} variant="outline">
          {proposal.status === "Approved" && <CheckCircle2 className="mr-1 h-3 w-3" />}
          {proposal.status === "Rejected" && <XCircle className="mr-1 h-3 w-3" />}
          {proposal.status === "Pending" && <Clock className="mr-1 h-3 w-3" />}
          {proposal.status}
        </Badge>
        {proposal.status === "Approved" && problemId && (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/project/${problemId}`}>Track</Link>
          </Button>
        )}
        {proposal.status === "Approved" && proposal.repoUrl && (
          <Button size="sm" variant="ghost" asChild>
            <a href={proposal.repoUrl} target="_blank" rel="noopener noreferrer">
              Repo
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <AppShell>
      <Skeleton className="mb-2 h-4 w-28" />
      <Skeleton className="mb-8 h-8 w-72" />
      <div className="mb-6 grid grid-cols-2 gap-6 border-y border-border py-5 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
      <Skeleton className="mb-4 h-10 w-full max-w-md" />
      <div className="overflow-hidden rounded-lg border border-border">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-[76px] rounded-none border-b border-border last:border-0" />
        ))}
      </div>
    </AppShell>
  );
}
