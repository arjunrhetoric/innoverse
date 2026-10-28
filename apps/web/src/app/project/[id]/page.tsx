"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  GitBranch,
  CheckCircle2,
  Clock,
  Milestone as MilestoneIcon,
  Plus,
  Calendar,
  Loader2,
  ExternalLink,
  XCircle,
  Send,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Stat } from "@/components/ui/stat";
import { StatusDot } from "@/components/ui/status-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { PullRequest, Milestone } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function ProjectTrackingPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user, role } = useUser();
  const isStartup = role === "Startup";

  const [prList, setPrList] = useState<PullRequest[]>([]);
  const [milestoneList, setMilestoneList] = useState<Milestone[]>([]);
  const [progress, setProgress] = useState(0);
  const [problemTitle, setProblemTitle] = useState("");
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

  const refreshTracking = async () => {
    try {
      const data = await projectTracking.getData(projectId);
      setPrList(data.pullRequests || []);
      setMilestoneList(data.milestones || []);
      setProgress(data.progress || 0);
      setProblemTitle(data.problemData?.title || "Project");
      setRepoOwner(data.problemData?.githubOwner || "");
      setRepoName(data.problemData?.githubRepoName || "");
      setCanSubmit(Boolean(data.canSubmitMilestones));
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

  if (loading) {
    return (
      <AppShell>
        <Skeleton className="mb-5 h-9 w-40" />
        <Skeleton className="mb-2 h-4 w-28" />
        <Skeleton className="mb-8 h-8 w-96 max-w-full" />
        <Skeleton className="mb-4 h-10 w-72" />
        <div className="overflow-hidden rounded-lg border border-border">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[68px] rounded-none border-b border-border last:border-0" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
          <div className="mb-5">
            <Button variant="ghost" size="sm" asChild>
              <Link href={isStartup ? "/dashboard/startup" : "/dashboard/student"}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {isStartup ? "Challenges" : "Discover"}
              </Link>
            </Button>
          </div>

          {/* Project Header */}
          <div className="mb-6">
            <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <StatusDot status={progress === 100 ? "success" : "active"} />
              {progress === 100 ? "Completed" : "In progress"} · {projectId.slice(0, 8)}
            </p>
            <h1 className="type-display mt-2 text-2xl font-medium text-foreground sm:text-[28px]">
              {problemTitle}
            </h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {milestoneList.length} milestones · {prList.length} pull requests
              {repoOwner && repoName && ` · ${repoOwner}/${repoName}`}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span className="font-mono text-sm text-foreground tabular-nums">{progress}%</span>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="milestones">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
                <TabsTrigger value="prs">
                  Pull requests
                  {prList.length > 0 && (
                    <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                      {prList.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                {isStartup && (
                  <TabsTrigger value="certificates">Certificates</TabsTrigger>
                )}
                {isStartup && (
                  <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
                )}
              </TabsList>
              {isStartup && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowMilestoneForm(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add milestone
                </Button>
              )}
            </div>

            {/* Milestones */}
            <TabsContent value="milestones">
              {actionError && (
                <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {actionError}
                </div>
              )}
              {milestoneList.length === 0 ? (
                <EmptyState
                  icon={MilestoneIcon}
                  title="No milestones yet"
                  description="Add milestones to track project progress."
                  action={
                    isStartup
                      ? { label: "Add milestone", onClick: () => setShowMilestoneForm(true) }
                      : undefined
                  }
                />
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  {milestoneList.map((ms, i) => {
                    const inReview = Boolean(ms.submittedAt) && !ms.completed;
                    return (
                      <div
                        key={ms._id}
                        className={`flex flex-col gap-3 px-4 py-3.5 transition-colors duration-100 hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between ${
                          i === milestoneList.length - 1 ? "" : "border-b border-border"
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                              ms.completed
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                                : inReview
                                  ? "border-blue-500/30 bg-blue-500/10 text-blue-500"
                                  : "border-border bg-white/[0.03] text-muted-foreground"
                            }`}
                          >
                            {ms.completed ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Clock className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4
                                className={`truncate text-[15px] font-medium tracking-tight ${
                                  ms.completed
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground"
                                }`}
                              >
                                {ms.title}
                              </h4>
                              {ms.completed ? (
                                <Badge variant="success" className="text-[10px]">Completed</Badge>
                              ) : inReview ? (
                                <Badge variant="info" className="text-[10px]">In review</Badge>
                              ) : ms.reviewNote ? (
                                <Badge variant="warning" className="text-[10px]">Changes requested</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">Pending</Badge>
                              )}
                            </div>
                            {ms.description && (
                              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                                {ms.description}
                              </p>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-3">
                              {ms.deadline && (
                                <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(ms.deadline)}
                                </span>
                              )}
                              {ms.evidenceUrl && (
                                <a
                                  href={ms.evidenceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  Evidence
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            {ms.reviewNote && !ms.completed && (
                              <p className="mt-1 text-[11px] text-amber-500">
                                Startup: {ms.reviewNote}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {isStartup && !ms.completed && inReview && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleCompleteMilestone(ms._id)}
                              >
                                <CheckCircle2 className="mr-1 h-3 w-3" />
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
                                <XCircle className="mr-1 h-3 w-3" />
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
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Complete
                            </Button>
                          )}
                          {canSubmit && !ms.completed && !inReview && (
                            <Button
                              variant="gradient"
                              size="sm"
                              onClick={() => {
                                setSubmitMs(ms);
                                setEvidenceUrl("");
                                setActionError("");
                              }}
                            >
                              <Send className="mr-1 h-3 w-3" />
                              Submit evidence
                            </Button>
                          )}
                          {canSubmit && inReview && (
                            <span className="text-[11px] text-muted-foreground">
                              Awaiting startup review
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Pull Requests */}
            <TabsContent value="prs">
              {selectedPr !== null && repoOwner && repoName ? (
                <div className="space-y-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPr(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to PRs
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
                  description="PRs will appear here once contributors push changes."
                />
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  {!repoOwner && (
                    <p className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
                      This challenge has no linked GitHub repo — opening a PR here will show details once a repo is attached.
                    </p>
                  )}
                  {prList.map((prItem, i) => (
                    <button
                      type="button"
                      key={prItem.id}
                      onClick={() => repoOwner && repoName && setSelectedPr(prItem.number)}
                      disabled={!repoOwner || !repoName}
                      className={`w-full cursor-pointer px-4 py-3.5 text-left transition-colors duration-100 hover:bg-white/[0.03] disabled:cursor-default disabled:opacity-70 ${
                        i === prList.length - 1 ? "" : "border-b border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <span className="block truncate text-[15px] font-medium tracking-tight text-foreground">
                            {prItem.title}
                          </span>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <Badge
                              variant={
                                prItem.state === "open"
                                  ? "success"
                                  : prItem.merged_at
                                  ? "info"
                                  : "destructive"
                              }
                              className="font-mono text-[11px]"
                            >
                              {prItem.merged_at
                                ? "Merged"
                                : prItem.state === "open"
                                ? "Open"
                                : "Closed"}
                            </Badge>
                            <span className="font-mono text-xs text-muted-foreground">
                              #{prItem.number} · {prItem.user?.login}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {formatDate(prItem.created_at)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Analytics */}
            <TabsContent value="analytics">
              <div className="grid grid-cols-1 gap-6 border-y border-border py-5 sm:grid-cols-3">
                <Stat label="Progress" value={`${progress}%`} />
                <Stat
                  label="Milestones"
                  value={`${milestoneList.filter((m) => m.completed).length}/${milestoneList.length}`}
                />
                <Stat label="Merged" value={prList.filter((p) => p.merged_at).length} />
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
            <DialogTitle>Add Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="msTitle">Title</Label>
              <Input
                id="msTitle"
                value={milestoneForm.title}
                onChange={(e) =>
                  setMilestoneForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="e.g., Complete API Integration"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="msDesc">Description</Label>
              <Textarea
                id="msDesc"
                value={milestoneForm.description}
                onChange={(e) =>
                  setMilestoneForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Details about this milestone..."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="msDeadline">Deadline</Label>
              <Input
                id="msDeadline"
                type="date"
                value={milestoneForm.deadline}
                onChange={(e) =>
                  setMilestoneForm((p) => ({ ...p, deadline: e.target.value }))
                }
                className="mt-1.5"
              />
            </div>
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
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create
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
            <p className="text-sm text-muted-foreground">
              {submitMs?.title} — paste the pull request, commit, or issue URL that proves the work.
            </p>
            {prList.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {prList.slice(0, 4).map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => setEvidenceUrl(pr.html_url)}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
                  >
                    #{pr.number} {pr.title.slice(0, 32)}
                  </button>
                ))}
              </div>
            )}
            <div>
              <Label htmlFor="evidenceUrl">Evidence URL</Label>
              <Input
                id="evidenceUrl"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/pull/12"
                className="mt-1.5"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              If the startup merges that pull request later, the milestone completes automatically.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitMs(null)}>Cancel</Button>
            <Button
              variant="default"
              onClick={handleSubmitEvidence}
              disabled={submittingEvidence || !evidenceUrl.trim()}
            >
              {submittingEvidence ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
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
            <p className="text-sm text-muted-foreground">
              {rejectMs?.title} — tell the student what needs to change. They can resubmit with new
              evidence.
            </p>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Add tests for the ingest edge cases and link the updated PR."
              className="min-h-20"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectMs(null)}>Cancel</Button>
            <Button
              variant="default"
              onClick={handleRequestChanges}
              disabled={rejecting || rejectNote.trim().length < 3}
            >
              {rejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Send feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
