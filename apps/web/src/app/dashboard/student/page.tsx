"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Rocket,
  FileText,
  Calendar,
  ChevronRight,
  AlertCircle,
  FileSignature,
  GitFork,
  Activity,
  Compass,
  ArrowRight,
  PenLine,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton, SkeletonRows, SkeletonStats } from "@/components/ui/skeleton";
import { StatBand } from "@/components/ui/stat";
import { StatusDot } from "@/components/ui/status-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useUser } from "@/hooks/useUser";
import { dashboard } from "@/lib/api";
import { cn, formatDate, truncateText } from "@/lib/utils";
import type { Problem, Proposal } from "@/lib/types";

export default function StudentDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("challenges");
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
      router.push("/dashboard");
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
    const q = search.toLowerCase();
    return problems
      .filter(
        (p) =>
          !search.trim() ||
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.skillsRequired.some((s) => s.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        // Open challenges first, then most recently posted.
        const now = Date.now();
        const aOpen = new Date(a.finalDeadline).getTime() >= now;
        const bOpen = new Date(b.finalDeadline).getTime() >= now;
        if (aOpen !== bOpen) return aOpen ? -1 : 1;
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      });
  }, [problems, search]);

  const awaitingSignatureCount = useMemo(
    () => proposals.filter((p) => p.status === "Approved" && !p.termsAcceptedAt).length,
    [proposals]
  );

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

      <PageHeader
        eyebrow={
          <span className="font-mono text-2xs uppercase tracking-[0.18em] text-subtle-foreground">
            Student workspace
          </span>
        }
        title={user?.name || "Student"}
        description="Challenges you can apply to, and the current state of every proposal you have submitted."
        actions={
          <Button variant="default" size="sm" asChild>
            <Link href="/explore">
              <Compass className="h-4 w-4" />
              Explore challenges
            </Link>
          </Button>
        }
      />

      <StatBand
        className="mb-6"
        items={[
          { label: "Challenges", value: stats.total, hint: "Open to apply" },
          { label: "Proposals", value: stats.proposals, hint: "Submitted" },
          { label: "Approved", value: stats.approved, hint: "Accepted by startups" },
          { label: "Pending", value: stats.pending, hint: "Awaiting review" },
        ]}
      />

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-2 rounded-lg border border-danger-border bg-danger-subtle px-3 py-2.5"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {awaitingSignatureCount > 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-warning-border bg-warning-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {awaitingSignatureCount === 1
                  ? "An agreement is waiting for your signature"
                  : `${awaitingSignatureCount} agreements are waiting for your signature`}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Repository access is granted once both parties sign.
              </p>
            </div>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => setTab("proposals")}>
            Review proposals
          </Button>
        </div>
      )}

      {proposals.length === 0 && !search && <FirstRunChecklist />}

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="proposals">My proposals</TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
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
              title={search ? "No challenge matches that filter" : "No challenges are open to you yet"}
              description={
                search
                  ? "Nothing here matches this search. Clear the filter to see every challenge you can apply to."
                  : "Challenges from startups appear here as soon as they are published. Browse the full catalogue in the meantime."
              }
              action={
                search
                  ? { label: "Clear filter", onClick: () => setSearch("") }
                  : { label: "Browse all challenges", href: "/explore" }
              }
            />
          ) : (
            <ul className="overflow-hidden rounded-lg border border-border bg-card">
              {filteredProblems.map((problem, i) => (
                <ChallengeRow
                  key={problem._id}
                  problem={problem}
                  last={i === filteredProblems.length - 1}
                />
              ))}
            </ul>
          )}
        </TabsContent>

        {/* Proposals Tab */}
        <TabsContent value="proposals">
          {proposals.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No proposals yet"
              description="A proposal is how you apply to a challenge: a written approach plus a short presentation. Pick a challenge to send your first one."
              action={{ label: "Find a challenge", href: "/explore" }}
            />
          ) : (
            <ul className="overflow-hidden rounded-lg border border-border bg-card">
              {proposals.map((proposal, i) => (
                <ProposalRow
                  key={proposal._id}
                  proposal={proposal}
                  last={i === proposals.length - 1}
                />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function ChallengeRow({ problem, last }: { problem: Problem; last?: boolean }) {
  const isExpired = new Date(problem.finalDeadline) < new Date();

  return (
    <li
      className={cn(
        "group flex items-start gap-3 px-4 py-4 transition-colors",
        !last && "border-b border-border",
        !isExpired && "hover:bg-surface/60"
      )}
    >
      <StatusDot status={isExpired ? "default" : "active"} className="mt-1.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <h3 className="line-clamp-2 break-words text-md font-medium tracking-tight text-foreground">
            {isExpired ? (
              problem.title
            ) : (
              <Link
                href={`/proposals/submit/${problem._id}`}
                className="rounded-sm transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {problem.title}
              </Link>
            )}
          </h3>
          <StatusBadge status={isExpired ? "Expired" : "Active"} withDot={false} />
          {problem.contributionType === "issue" && (
            <Badge variant="default" className="font-mono">
              Open source{problem.githubIssueNumber ? ` · #${problem.githubIssueNumber}` : ""}
            </Badge>
          )}
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {truncateText(problem.description, 160)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {problem.githubOwner && problem.githubRepoName && (
            <span className="font-mono text-xs text-subtle-foreground">
              {problem.githubOwner}/{problem.githubRepoName}
            </span>
          )}
          {problem.skillsRequired?.length > 0 && (
            <span className="text-xs text-subtle-foreground">
              {(problem.skillsRequired || []).slice(0, 3).join(" · ")}
              {problem.skillsRequired.length > 3 && ` +${problem.skillsRequired.length - 3}`}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-subtle-foreground">
            <Calendar className="h-3 w-3" />
            Deadline <span className="tnum font-mono">{formatDate(problem.finalDeadline)}</span>
          </span>
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 self-center">
        {isExpired ? (
          <span className="text-xs text-subtle-foreground">Closed</span>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/proposals/submit/${problem._id}`} aria-label={`Apply to ${problem.title}`}>
              Apply
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        )}
      </div>
    </li>
  );
}

function ProposalRow({ proposal, last }: { proposal: Proposal; last?: boolean }) {
  const problem = typeof proposal.problemId === "object" ? proposal.problemId : null;
  const problemId = problem?._id || (typeof proposal.problemId === "string" ? proposal.problemId : null);

  const awaitingSignature = proposal.status === "Approved" && !proposal.termsAcceptedAt;
  const awaitingInvite =
    proposal.status === "Approved" && Boolean(proposal.termsAcceptedAt) && !proposal.accessGrantedAt;

  return (
    <li
      className={cn(
        "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
        !last && "border-b border-border"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <h4 className="line-clamp-2 break-words text-md font-medium tracking-tight text-foreground">
            {problem?.title || "Challenge"}
          </h4>
          <StatusBadge status={proposal.status} />
          {awaitingInvite && (
            <Badge variant="info">
              <span className="h-1.5 w-1.5 rounded-full bg-info" aria-hidden />
              Invite pending
            </Badge>
          )}
        </div>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {truncateText(proposal.description, 140)}
        </p>
        <p className="mt-1.5 text-xs text-subtle-foreground">
          Submitted <span className="tnum font-mono">{formatDate(proposal.submittedAt)}</span>
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {awaitingSignature && (
          <Button size="sm" variant="default" asChild>
            <Link href={`/proposals/${proposal._id}/agreement`}>
              <FileSignature className="h-3.5 w-3.5" />
              Sign agreement
            </Link>
          </Button>
        )}

        {awaitingInvite && (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/proposals/${proposal._id}/agreement`}>Open agreement</Link>
          </Button>
        )}

        {proposal.status === "Approved" && proposal.termsAcceptedAt && proposal.accessGrantedAt && problemId && (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/project/${problemId}`}>
              <Activity className="h-3.5 w-3.5" />
              Track
            </Link>
          </Button>
        )}

        {proposal.status === "Approved" && proposal.accessGrantedAt && proposal.repoUrl && (
          <Button size="sm" variant="outline" asChild>
            <a href={proposal.repoUrl} target="_blank" rel="noopener noreferrer">
              <GitFork className="h-3.5 w-3.5" />
              Repo
            </a>
          </Button>
        )}

        {proposal.status === "Pending" && (
          <span className="text-xs text-muted-foreground">Waiting on the startup</span>
        )}
      </div>
    </li>
  );
}

function FirstRunChecklist() {
  const steps = [
    {
      title: "Find a challenge",
      description: "Browse open challenges and read the deadline and required skills.",
      href: "/explore",
      cta: "Browse challenges",
    },
    {
      title: "Submit a proposal",
      description: "Write your approach and attach a short presentation (PPT or PPTX).",
      href: "/explore",
      cta: "Pick a challenge",
    },
    {
      title: "Sign the agreement",
      description:
        "When a startup approves you, sign the collaboration agreement to get read access to the repository.",
      href: "/dashboard/student",
      cta: null,
    },
  ] as const;

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex flex-col gap-1 border-b border-border px-5 py-4">
        <h2 className="text-md font-semibold tracking-tight text-foreground">Your first proposal</h2>
        <p className="text-sm text-muted-foreground">
          Three steps from browsing to read access on a real repository.
        </p>
      </header>
      <ol className="divide-y divide-border">
        {steps.map((step, i) => (
          <li key={step.title} className="flex items-start gap-3 px-5 py-3.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-2xs font-medium text-muted-foreground">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
            {step.cta && (
              <Button size="sm" variant="outline" asChild className="shrink-0">
                <Link href={step.href}>
                  {step.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <AppShell>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-3.5 w-full max-w-md" />
      </div>
      <SkeletonStats />
      <div className="mb-4 mt-6 flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-full max-w-xs" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <SkeletonRows rows={5} />
      </div>
    </AppShell>
  );
}
