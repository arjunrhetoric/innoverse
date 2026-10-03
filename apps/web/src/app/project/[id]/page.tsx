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
import { projectChannel } from "@/lib/realtime";
import { useSSE } from "@/hooks/useSSE";
import { useUser } from "@/hooks/useUser";
import { PrReview } from "@/components/pr-review";
import { CertificateSection } from "@/components/certificate-section";
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

  const refreshTracking = async () => {
    try {
      const data = await projectTracking.getData(projectId);
      setPrList(data.pullRequests || []);
      setMilestoneList(data.milestones || []);
      setProgress(data.progress || 0);
      setProblemTitle(data.problemData?.title || "Project");
      setRepoOwner(data.problemData?.githubOwner || "");
      setRepoName(data.problemData?.githubRepoName || "");
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
                  {milestoneList.map((ms, i) => (
                    <div
                      key={ms._id}
                      className={`flex items-center justify-between gap-4 px-4 py-3.5 transition-colors duration-100 hover:bg-white/[0.02] ${
                        i === milestoneList.length - 1 ? "" : "border-b border-border"
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            ms.completed
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
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
                          <h4
                            className={`truncate text-[15px] font-medium tracking-tight ${
                              ms.completed ? "text-muted-foreground line-through" : "text-foreground"
                            }`}
                          >
                            {ms.title}
                          </h4>
                          {ms.description && (
                            <p className="mt-0.5 truncate text-sm text-muted-foreground">
                              {ms.description}
                            </p>
                          )}
                          {ms.deadline && (
                            <span className="mt-1 flex items-center gap-1 font-mono text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(ms.deadline)}
                            </span>
                          )}
                        </div>
                      </div>
                      {isStartup && !ms.completed && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => handleCompleteMilestone(ms._id)}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Complete
                        </Button>
                      )}
                    </div>
                  ))}
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
    </AppShell>
  );
}
