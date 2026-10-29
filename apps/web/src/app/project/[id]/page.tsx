"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  GitBranch,
  CheckCircle2,
  Milestone as MilestoneIcon,
  Plus,
  Calendar,
  Loader2,
  ExternalLink,
  XCircle,
  Send,
  Eye,
  Circle,
  AlertCircle,
  GitPullRequest,
  GitCommitHorizontal,
  GitMerge,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Meta } from "@/components/ui/page-header";
import { StatBand } from "@/components/ui/stat";
import { StatusDot } from "@/components/ui/status-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Progress, ProgressRow } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { projectTracking, milestones as milestonesApi } from "@/lib/api";
import { projectChannel } from "@/lib/channels";
import { useSSE } from "@/hooks/useSSE";
import { useUser } from "@/hooks/useUser";
import { PrReview } from "@/components/pr-review";
import { CertificateSection } from "@/components/certificate-section";
import { KnowledgePanel } from "@/components/knowledge-panel";
import type { PullRequest, Milestone, EngagementSummary } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";

/** Evidence URLs point at a PR, a commit, or anything else — label them honestly. */
function evidenceMeta(url: string) {
  const pr = url.match(/\/pull\/(\d+)/);
  if (pr) return { label: `PR #${pr[1]}`, Icon: GitPullRequest };
  const commit = url.match(/\/commit\/([0-9a-f]{7,40})/i);
  if (commit) return { label: `Commit ${commit[1].slice(0, 7)}`, Icon: GitCommitHorizontal };
  return { label: "Evidence", Icon: ExternalLink };
}

function milestoneStatus(ms: Milestone): string {
  if (ms.completed) return "Completed";
  if (ms.submittedAt) return "In review";
  if (ms.reviewNote) return "Changes requested";
  return "Pending";
}

function prStatus(prItem: PullRequest): string {
  if (prItem.merged_at) return "Merged";
  return prItem.state === "open" ? "Open" : "Closed";
}

export default function ProjectTrackingPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user, role } = useUser();
  const isStartup = role === "Startup";

  const [prList, setPrList] = useState<PullRequest[]>([]);
  const [milestoneList, setMilestoneList] = useState<Milestone[]>([]);
  const [progress, setProgress] = useState(0);
  const [problemTitle, setProblemTitle] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [selectedPr, setSelectedPr] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    description: "",
    deadline: "",
  });
  const [creating, setCreating] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [submitMs, setSubmitMs] = useState<Milestone | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [rejectMs, setRejectMs] = useState<Milestone | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [engagementList, setEngagementList] = useState<EngagementSummary[]>([]);

  const refreshTracking = async () => {
    try {
      const data = await projectTracking.getData(projectId);
      setPrList(data.pullRequests || []);
      setMilestoneList(data.milestones || []);
      setProgress(data.progress || 0);
      setProblemTitle(data.problemData?.title || "Project");
      setProblemDescription(data.problemData?.description || "");
      setRepoOwner(data.problemData?.githubOwner || "");
      setRepoName(data.problemData?.githubRepoName || "");
      setCanSubmit(Boolean(data.canSubmitMilestones));
      setEngagementList(data.engagements ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await refreshTracking();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Live updates from the other side (milestones, PRs, certificates).
  useSSE(projectId ? projectChannel(projectId) : null, (event) => {
    if (event?.actorId && user?.id && event.actorId === user.id) return;
    refreshTracking();
  });

  const handleSubmitEvidence = async () => {
    if (!submitMs) return;
    setSubmittingEvidence(true);
    setActionError("");
    try {
      await milestonesApi.submit(submitMs._id, evidenceUrl.trim());
      setSubmitMs(null);
      setEvidenceUrl("");
      await refreshTracking();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Could not submit the milestone");
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!rejectMs) return;
    setRejecting(true);
    setActionError("");
    try {
      await milestonesApi.requestChanges(rejectMs._id, rejectNote.trim());
      setRejectMs(null);
      setRejectNote("");
      await refreshTracking();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Could not request changes");
    } finally {
      setRejecting(false);
    }
  };

  const handleCompleteEngagementMilestone = async (
    engagementId: string,
    milestoneId: string
  ) => {
    setActionError("");
    try {
      const res = await fetch(
        `/api/engagements/${engagementId}/milestones/${milestoneId}/complete`,
        { method: "POST", credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not complete the milestone");
      await refreshTracking();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Could not complete the milestone");
    }
  };

  const handleCreateMilestone = async () => {
    setCreating(true);
    try {
      await milestonesApi.create({
        ...milestoneForm,
        problemId: projectId,
      });
      setShowMilestoneForm(false);
      setMilestoneForm({ title: "", description: "", deadline: "" });
      // Refetch
      const data = await projectTracking.getData(projectId);
      setMilestoneList(data.milestones || []);
      setProgress(data.progress || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleCompleteMilestone = async (id: string) => {
    try {
      await milestonesApi.complete(id);
      const data = await projectTracking.getData(projectId);
      setMilestoneList(data.milestones || []);
      setProgress(data.progress || 0);
    } catch (err) {
      console.error(err);
    }
  };

  /* ── Derived counts — real data only, no invented metrics ──────────────── */

  const counts = useMemo(() => {
    const total = milestoneList.length;
    const completed = milestoneList.filter((m) => m.completed).length;
    const inReview = milestoneList.filter((m) => !m.completed && Boolean(m.submittedAt)).length;
    const changes = milestoneList.filter(
      (m) => !m.completed && !m.submittedAt && Boolean(m.reviewNote)
    ).length;
    const pending = Math.max(0, total - completed - inReview - changes);
    const merged = prList.filter((p) => p.merged_at).length;
    const open = prList.filter((p) => p.state === "open" && !p.merged_at).length;
    const closed = Math.max(0, prList.length - merged - open);
    const paidMilestones = engagementList.reduce((n, e) => n + e.milestones.length, 0);
    return { total, completed, inReview, changes, pending, merged, open, closed, paidMilestones };
  }, [milestoneList, prList, engagementList]);

  if (loading) {
    return (
      <AppShell>
        <div className="mb-3 space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-[min(28rem,100%)]" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <Skeleton className="mt-5 h-9 w-full max-w-md" />
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
          <SkeletonRows rows={4} />
        </div>
      </AppShell>
    );
  }

  const repoFull = repoOwner && repoName ? `${repoOwner}/${repoName}` : "";
  const repoUrl = repoFull ? `https://github.com/${repoFull}` : "";

  return (
    <AppShell>
      <Tabs defaultValue="milestones">
        <PageHeader
          bordered={false}
          back={{
            href: isStartup ? "/dashboard/startup" : "/dashboard/student",
            label: isStartup ? "Challenges" : "Discover",
          }}
          eyebrow={
            <>
              <StatusDot status={progress === 100 ? "success" : "active"} />
              <span className="text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {progress === 100 ? "Completed" : "In progress"}
              </span>
              <span aria-hidden className="text-2xs text-border-strong">
                /
              </span>
              <span className="text-2xs text-subtle-foreground">
                {counts.completed}/{counts.total} milestones
              </span>
            </>
          }
          title={problemTitle}
          description={
            problemDescription ||
            (isStartup
              ? "Review submitted evidence, approve milestones and track delivery on this challenge."
              : "Deliver milestones, link the pull request that proves the work, and track review status.")
          }
          meta={
            <>
              <Meta label="Milestones" value={`${counts.completed}/${counts.total}`} />
              <Meta label="Pull requests" value={prList.length} />
              {repoFull ? (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="text-subtle-foreground">Repo</span>
                  <span className="font-mono">{repoFull}</span>
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : (
                <Meta label="Repo" value="Not linked" />
              )}
            </>
          }
          actions={
            <>
              {repoFull && (
                <Button variant="outline" size="sm" asChild>
                  <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden />
                    Open repo
                  </a>
                </Button>
              )}
              {isStartup && (
                <Button variant="default" size="sm" onClick={() => setShowMilestoneForm(true)}>
                  <Plus aria-hidden />
                  Add milestone
                </Button>
              )}
            </>
          }
          tabs={
            <TabsList>
              <TabsTrigger value="milestones">
                Milestones
                {counts.total > 0 && (
                  <span className="tnum font-mono text-2xs text-subtle-foreground">
                    {counts.completed}/{counts.total}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="prs">
                Pull requests
                {prList.length > 0 && (
                  <span className="tnum font-mono text-2xs text-subtle-foreground">
                    {prList.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              {isStartup && <TabsTrigger value="certificates">Certificates</TabsTrigger>}
              {isStartup && <TabsTrigger value="knowledge">Knowledge</TabsTrigger>}
            </TabsList>
          }
        />

        {/* ── Milestones ─────────────────────────────────────────────────── */}
        <TabsContent value="milestones" className="space-y-8">
          {actionError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger-border bg-danger-subtle px-3 py-2 text-xs leading-relaxed text-danger"
            >
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              {actionError}
            </p>
          )}

          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                <span className="tnum font-mono text-foreground">{counts.completed}</span> of{" "}
                <span className="tnum font-mono text-foreground">{counts.total}</span> challenge
                milestones complete
              </p>
              <span className="tnum font-mono text-xs text-foreground">{progress}%</span>
            </div>
            <Progress
              value={progress}
              tone={progress === 100 ? "success" : "neutral"}
              className="mt-2.5"
            />
          </div>

          <section aria-labelledby="challenge-milestones" className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="challenge-milestones" className="text-sm font-medium text-foreground">
                Challenge milestones
              </h2>
              <p className="text-2xs text-subtle-foreground">
                Evidence links point to the pull request or commit that proves the work.
              </p>
            </div>

            {milestoneList.length === 0 ? (
              <EmptyState
                icon={MilestoneIcon}
                title="No milestones yet"
                description={
                  isStartup
                    ? "Break the challenge into milestones so deliverables and deadlines are explicit."
                    : "The challenge owner hasn't published milestones yet. Pull requests still appear under the pull requests tab."
                }
                action={
                  isStartup
                    ? { label: "Add milestone", onClick: () => setShowMilestoneForm(true) }
                    : undefined
                }
              />
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {milestoneList.map((ms) => {
                  const inReview = Boolean(ms.submittedAt) && !ms.completed;
                  const status = milestoneStatus(ms);
                  const evidence = ms.evidenceUrl ? evidenceMeta(ms.evidenceUrl) : null;
                  const EvidenceIcon = evidence?.Icon;
                  return (
                    <div
                      key={ms._id}
                      className="flex flex-col gap-3 px-4 py-3.5 transition-colors duration-[var(--dur-1)] hover:bg-surface-2/60 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span
                          aria-hidden
                          className={cn(
                            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                            ms.completed
                              ? "border-success-border bg-success-subtle text-success"
                              : inReview
                                ? "border-info-border bg-info-subtle text-info"
                                : ms.reviewNote
                                  ? "border-warning-border bg-warning-subtle text-warning"
                                  : "border-border bg-surface text-subtle-foreground"
                          )}
                        >
                          {ms.completed ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : inReview ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : ms.reviewNote ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                        </span>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h3
                              className={cn(
                                "truncate text-sm font-medium tracking-tight",
                                ms.completed ? "text-muted-foreground" : "text-foreground"
                              )}
                            >
                              {ms.title}
                            </h3>
                            <StatusBadge status={status} />
                          </div>

                          {ms.description && (
                            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {ms.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs">
                            <span className="inline-flex items-center gap-1 font-mono text-muted-foreground">
                              <Calendar className="h-3 w-3" aria-hidden />
                              <span className="text-subtle-foreground">Due</span>
                              {ms.deadline ? formatDate(ms.deadline) : "—"}
                            </span>
                            {evidence && EvidenceIcon && ms.evidenceUrl && (
                              <a
                                href={ms.evidenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-brand underline-offset-2 hover:underline"
                              >
                                <EvidenceIcon className="h-3 w-3" aria-hidden />
                                {evidence.label}
                              </a>
                            )}
                            {ms.completed && ms.completedAt && (
                              <span className="font-mono text-subtle-foreground">
                                completed {formatDate(ms.completedAt)}
                              </span>
                            )}
                          </div>

                          {ms.reviewNote && !ms.completed && (
                            <p className="flex items-start gap-1.5 border-l-2 border-warning-border pl-2 text-2xs leading-relaxed text-warning">
                              <span className="shrink-0 font-medium">Startup:</span>
                              <span className="min-w-0">{ms.reviewNote}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        {isStartup && !ms.completed && inReview && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleCompleteMilestone(ms._id)}
                            >
                              <CheckCircle2 aria-hidden />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRejectMs(ms);
                                setRejectNote("");
                                setActionError("");
                              }}
                            >
                              <XCircle aria-hidden />
                              Request changes
                            </Button>
                          </>
                        )}
                        {isStartup && !ms.completed && !inReview && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCompleteMilestone(ms._id)}
                          >
                            <CheckCircle2 aria-hidden />
                            Complete
                          </Button>
                        )}
                        {canSubmit && !ms.completed && !inReview && (
                          <Button
                            variant="brand"
                            size="sm"
                            onClick={() => {
                              setSubmitMs(ms);
                              setEvidenceUrl("");
                              setActionError("");
                            }}
                          >
                            <Send aria-hidden />
                            Submit evidence
                          </Button>
                        )}
                        {canSubmit && inReview && (
                          <span className="text-2xs text-muted-foreground">
                            Awaiting startup review
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Paid engagement milestones — same tab, visibly different object */}
          {engagementList.length > 0 && (
            <section aria-labelledby="paid-milestones" className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="flex items-center gap-2">
                  <h2 id="paid-milestones" className="text-sm font-medium text-foreground">
                    Paid engagement milestones
                  </h2>
                  <Badge variant="brand">Paid engagement</Badge>
                </div>
                <p className="text-2xs text-subtle-foreground">
                  Approval and payment are handled inside each engagement.
                </p>
              </div>

              {engagementList.map((engagement) => (
                <div
                  key={engagement.id}
                  className="overflow-hidden rounded-lg border border-brand/25 bg-card"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {engagement.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge status={engagement.status} />
                        <span className="tnum font-mono text-2xs text-muted-foreground">
                          {engagement.currency} {engagement.totalAmount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-2xs text-subtle-foreground">
                          {engagement.milestones.length} paid milestones
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/engagements/${engagement.id}`}>
                        Manage
                        <ExternalLink aria-hidden />
                      </Link>
                    </Button>
                  </div>

                  <ul className="divide-y divide-border">
                    {engagement.milestones.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate text-xs text-foreground">{m.title}</span>
                          <span className="tnum rounded-full border border-brand/25 bg-brand-subtle px-1.5 py-0.5 font-mono text-2xs text-brand">
                            {engagement.currency} {m.amount.toLocaleString("en-IN")}
                          </span>
                          {m.evidenceUrl && (
                            <a
                              href={m.evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-2xs text-brand underline-offset-2 hover:underline"
                            >
                              Evidence
                              <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <StatusBadge status={m.status} />
                          {isStartup &&
                            engagement.status === "Active" &&
                            m.status !== "Confirmed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleCompleteEngagementMilestone(engagement.id, m.id)
                                }
                              >
                                <CheckCircle2 aria-hidden />
                                Mark complete
                              </Button>
                            )}
                          {!isStartup && engagement.status === "Active" && m.status === "Pending" && (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/engagements/${engagement.id}`}>Deliver</Link>
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
        </TabsContent>

        {/* ── Pull requests ─────────────────────────────────────────────── */}
        <TabsContent value="prs">
          {selectedPr !== null && repoOwner && repoName ? (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedPr(null)}>
                <ArrowLeft aria-hidden />
                Back to pull requests
              </Button>
              <PrReview
                repoOwner={repoOwner}
                repoName={repoName}
                pullNumber={selectedPr}
                onChanged={refreshTracking}
              />
            </div>
          ) : prList.length === 0 ? (
            <EmptyState
              icon={GitBranch}
              title="No pull requests"
              description="Pull requests appear here as soon as contributors open them against the challenge repository."
              action={repoFull ? { label: "Open repository", href: repoUrl } : undefined}
            />
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {!repoOwner && (
                <p className="bg-surface px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                  This challenge has no linked GitHub repository. Pull request details open once a
                  repo is attached.
                </p>
              )}
              {prList.map((prItem) => {
                const status = prStatus(prItem);
                const clickable = Boolean(repoOwner && repoName);
                return (
                  <button
                    type="button"
                    key={prItem.id}
                    onClick={() => repoOwner && repoName && setSelectedPr(prItem.number)}
                    disabled={!clickable}
                    className="flex w-full cursor-pointer flex-col gap-2 px-4 py-3.5 text-left transition-colors duration-[var(--dur-1)] hover:bg-surface-2/60 disabled:cursor-default disabled:opacity-70 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <span className="flex items-center gap-2">
                        {prItem.merged_at ? (
                          <GitMerge className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                        ) : (
                          <GitPullRequest
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              prItem.state === "open" ? "text-success" : "text-subtle-foreground"
                            )}
                            aria-hidden
                          />
                        )}
                        <span className="truncate text-sm font-medium tracking-tight text-foreground">
                          {prItem.title}
                        </span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <StatusBadge status={status} />
                        <span className="font-mono text-2xs text-muted-foreground">
                          #{prItem.number} · {prItem.user?.login}
                        </span>
                        {typeof prItem.additions === "number" && (
                          <span className="tnum font-mono text-2xs">
                            <span className="text-diff-add-fg">+{prItem.additions}</span>{" "}
                            <span className="text-diff-del-fg">−{prItem.deletions ?? 0}</span>
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-2xs text-subtle-foreground">
                      {formatDate(prItem.created_at)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Analytics ─────────────────────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-6">
          <StatBand
            items={[
              {
                label: "Progress",
                value: `${progress}%`,
                hint: `${counts.completed} of ${counts.total} milestones`,
              },
              {
                label: "Milestones",
                value: `${counts.completed}/${counts.total}`,
                hint: counts.inReview > 0 ? `${counts.inReview} in review` : "None in review",
              },
              {
                label: "Pull requests",
                value: prList.length,
                hint: `${counts.open} open`,
              },
              {
                label: "Merged",
                value: counts.merged,
                hint: counts.closed > 0 ? `${counts.closed} closed unmerged` : "No closed PRs",
              },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium text-foreground">Milestone status</h2>
                <span className="tnum font-mono text-2xs text-subtle-foreground">
                  {counts.total} total
                </span>
              </div>
              {counts.total === 0 ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  No milestones yet, so there is nothing to measure. Add the first milestone from
                  the milestones tab.
                </p>
              ) : (
                <div className="space-y-2.5">
                  <ProgressRow
                    label="Completed"
                    value={counts.completed}
                    max={counts.total}
                    suffix={`${counts.completed}`}
                    tone="success"
                  />
                  <ProgressRow
                    label="In review"
                    value={counts.inReview}
                    max={counts.total}
                    suffix={`${counts.inReview}`}
                    tone="brand"
                  />
                  <ProgressRow
                    label="Changes requested"
                    value={counts.changes}
                    max={counts.total}
                    suffix={`${counts.changes}`}
                    tone="warning"
                  />
                  <ProgressRow
                    label="Pending"
                    value={counts.pending}
                    max={counts.total}
                    suffix={`${counts.pending}`}
                    tone="neutral"
                  />
                </div>
              )}
            </section>

            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium text-foreground">Pull request state</h2>
                <span className="tnum font-mono text-2xs text-subtle-foreground">
                  {prList.length} total
                </span>
              </div>
              {prList.length === 0 ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  No pull requests have been opened against this challenge repository.
                </p>
              ) : (
                <div className="space-y-2.5">
                  <ProgressRow
                    label="Merged"
                    value={counts.merged}
                    max={prList.length}
                    suffix={`${counts.merged}`}
                    tone="success"
                  />
                  <ProgressRow
                    label="Open"
                    value={counts.open}
                    max={prList.length}
                    suffix={`${counts.open}`}
                    tone="brand"
                  />
                  <ProgressRow
                    label="Closed without merge"
                    value={counts.closed}
                    max={prList.length}
                    suffix={`${counts.closed}`}
                    tone="neutral"
                  />
                </div>
              )}
              {counts.paidMilestones > 0 && (
                <p className="mt-4 border-t border-border pt-3 text-2xs leading-relaxed text-subtle-foreground">
                  <span className="tnum font-mono text-muted-foreground">
                    {counts.paidMilestones}
                  </span>{" "}
                  paid engagement milestones are tracked alongside challenge milestones.
                </p>
              )}
            </section>
          </div>
        </TabsContent>

        {/* Certificates (startup only) */}
        {isStartup && (
          <TabsContent value="certificates">
            <CertificateSection projectId={projectId} progress={progress} />
          </TabsContent>
        )}

        {/* Knowledge base (startup only) */}
        {isStartup && (
          <TabsContent value="knowledge">
            <KnowledgePanel projectId={projectId} />
          </TabsContent>
        )}
      </Tabs>

      {/* Create Milestone Dialog */}
      <Dialog open={showMilestoneForm} onOpenChange={setShowMilestoneForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field id="msTitle" label="Title" required>
              <Input
                id="msTitle"
                value={milestoneForm.title}
                onChange={(e) => setMilestoneForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Complete API integration"
              />
            </Field>
            <Field id="msDesc" label="Description" hint="Optional">
              <Textarea
                id="msDesc"
                value={milestoneForm.description}
                onChange={(e) =>
                  setMilestoneForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="What has to be true when this milestone is done?"
              />
            </Field>
            <Field id="msDeadline" label="Deadline" hint="Optional">
              <Input
                id="msDeadline"
                type="date"
                value={milestoneForm.deadline}
                onChange={(e) => setMilestoneForm((p) => ({ ...p, deadline: e.target.value }))}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMilestoneForm(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleCreateMilestone}
              disabled={creating || !milestoneForm.title}
            >
              {creating ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
              Create milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit milestone evidence */}
      <Dialog open={Boolean(submitMs)} onOpenChange={(open) => !open && setSubmitMs(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit milestone evidence</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {submitMs?.title} — paste the pull request, commit, or issue URL that proves the
              work.
            </p>
            {prList.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {prList.slice(0, 4).map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => setEvidenceUrl(pr.html_url)}
                    className="max-w-full truncate rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-2xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                  >
                    #{pr.number} {pr.title.slice(0, 32)}
                  </button>
                ))}
              </div>
            )}
            <Field id="evidenceUrl" label="Evidence URL" required>
              <Input
                id="evidenceUrl"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/pull/12"
              />
            </Field>
            <p className="text-2xs leading-relaxed text-muted-foreground">
              If the startup merges that pull request later, the milestone completes
              automatically.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitMs(null)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={handleSubmitEvidence}
              disabled={submittingEvidence || !evidenceUrl.trim()}
            >
              {submittingEvidence ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Send aria-hidden />
              )}
              Submit for review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request changes on a milestone */}
      <Dialog open={Boolean(rejectMs)} onOpenChange={(open) => !open && setRejectMs(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {rejectMs?.title} — tell the contributor what needs to change. They can resubmit
              with new evidence.
            </p>
            <Field id="rejectNote" label="What needs to change" required>
              <Textarea
                id="rejectNote"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g. Add tests for the ingest edge cases and link the updated PR."
                className="min-h-20"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectMs(null)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleRequestChanges}
              disabled={rejecting || rejectNote.trim().length < 3}
            >
              {rejecting ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <XCircle aria-hidden />
              )}
              Send feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
