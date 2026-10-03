"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  FileText,
  CheckCircle2,
  XCircle,
  Trash2,
  Calendar,
  Loader2,
  AlertCircle,
  ExternalLink,
  Rocket,
} from "lucide-react";
import { GithubIcon as Github } from "@/components/ui/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Stat } from "@/components/ui/stat";
import { StatusDot } from "@/components/ui/status-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUser } from "@/hooks/useUser";
import { dashboard, projects, proposals as proposalsApi } from "@/lib/api";
import { formatDate, truncateText, getStatusColor } from "@/lib/utils";
import type { Problem, Proposal } from "@/lib/types";

export default function StartupDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Problem[]>([]);
  const [allProposals, setAllProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Post Challenge Form State
  const [showPostForm, setShowPostForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    skillsRequired: "",
    finalDeadline: "",
    createGithubRepo: false,
    githubRepoName: "",
  });
  const [posting, setPosting] = useState(false);

  // Review Dialog State
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    proposal: Proposal | null;
    action: "Approved" | "Rejected" | "";
  }>({ open: false, proposal: null, action: "" });
  const [feedback, setFeedback] = useState("");
  const [reviewing, setReviewing] = useState(false);

  // Delete Confirmation
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; problemId: string }>({
    open: false,
    problemId: "",
  });
  const [deleting, setDeleting] = useState(false);

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
    if (user.role !== "Startup") {
      router.push("/dashboard/student");
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchData = async () => {
    try {
      const data = await dashboard.startup();
      setChallenges(data.challenges || []);
      setAllProposals(data.proposals || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "Startup") fetchData();
  }, [isAuthenticated, user]);

  const stats = useMemo(
    () => ({
      activeChalllenges: challenges.filter((c) => !c.completed).length,
      totalProposals: allProposals.length,
      pending: allProposals.filter((p) => p.status === "Pending").length,
    }),
    [challenges, allProposals]
  );

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handlePostChallenge = async () => {
    setPosting(true);
    try {
      await projects.post({
        ...formData,
        skillsRequired: formData.skillsRequired
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setShowPostForm(false);
      setFormData({
        title: "",
        description: "",
        skillsRequired: "",
        finalDeadline: "",
        createGithubRepo: false,
        githubRepoName: "",
      });
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post challenge");
    } finally {
      setPosting(false);
    }
  };

  const handleReview = async () => {
    if (!reviewDialog.proposal || !reviewDialog.action) return;
    setReviewing(true);
    try {
      await proposalsApi.review(
        reviewDialog.proposal._id,
        reviewDialog.action,
        feedback
      );
      setReviewDialog({ open: false, proposal: null, action: "" });
      setFeedback("");
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to review proposal");
    } finally {
      setReviewing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await projects.delete(deleteDialog.problemId);
      setDeleteDialog({ open: false, problemId: "" });
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete challenge");
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return <DashboardSkeleton />;
  }

  return (
    <AppShell>
          {/* Header */}
          <div className="mb-6">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Workspace
            </p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="type-display text-2xl font-medium text-foreground sm:text-[28px]">
                  Welcome, {user?.name || "Founder"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage your innovation challenges and review student proposals.
                </p>
              </div>
              <Button variant="default" onClick={() => setShowPostForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Post Challenge
              </Button>
            </div>
          </div>

          {/* Stats band */}
          <div className="mb-6 grid grid-cols-3 gap-6 border-y border-border py-5">
            <Stat label="Active" value={stats.activeChalllenges} />
            <Stat label="Proposals" value={stats.totalProposals} />
            <Stat label="Pending" value={stats.pending} />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-6 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="challenges">
            <TabsList className="mb-4">
              <TabsTrigger value="challenges">My Challenges</TabsTrigger>
              <TabsTrigger value="proposals">
                Student Proposals
                {stats.pending > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 font-mono text-[11px] leading-none text-amber-500">
                    {stats.pending}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Challenges Tab */}
            <TabsContent value="challenges">
              {challenges.length === 0 ? (
                <EmptyState
                  icon={Rocket}
                  title="No challenges yet"
                  description="Post your first innovation challenge to start receiving proposals."
                />
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  {challenges.map((challenge, i) => (
                    <div
                      key={challenge._id}
                      className={`flex items-start gap-3 px-4 py-3.5 transition-colors duration-100 hover:bg-white/[0.03] ${
                        i === challenges.length - 1 ? "" : "border-b border-border"
                      }`}
                    >
                      <StatusDot
                        status={challenge.completed ? "success" : "active"}
                        className="mt-1.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h3 className="truncate text-[15px] font-medium tracking-tight text-foreground">
                            {challenge.title}
                          </h3>
                          {challenge.completed && (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-emerald-500/30 bg-emerald-500/10 font-mono text-[11px] text-emerald-500"
                            >
                              Completed
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {truncateText(challenge.description, 110)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-mono text-xs text-muted-foreground">
                            {(challenge.skillsRequired || []).slice(0, 3).join(" · ")}
                            {(challenge.skillsRequired?.length || 0) > 3 &&
                              ` +${challenge.skillsRequired.length - 3}`}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(challenge.finalDeadline)}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {challenge.githubRepoUrl && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 px-0" asChild>
                            <a
                              href={challenge.githubRepoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open GitHub repository"
                            >
                              <Github className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 px-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${challenge.title}`}
                          onClick={() =>
                            setDeleteDialog({ open: true, problemId: challenge._id })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Proposals Tab */}
            <TabsContent value="proposals">
              {allProposals.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No proposals received"
                  description="Student proposals will appear here once they apply to your challenges."
                />
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  {allProposals.map((proposal, i) => {
                    const problem =
                      typeof proposal.problemId === "object"
                        ? proposal.problemId
                        : null;
                    const student =
                      typeof proposal.studentId === "object"
                        ? proposal.studentId
                        : null;

                    return (
                      <div
                        key={proposal._id}
                        className={`transition-colors duration-100 hover:bg-white/[0.02] ${
                          i === allProposals.length - 1 ? "" : "border-b border-border"
                        }`}
                      >
                        <div className="flex flex-col justify-between gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="truncate text-[15px] font-medium tracking-tight text-foreground">
                                {problem?.title || "Challenge"}
                              </h4>
                              <Badge
                                className={getStatusColor(proposal.status)}
                                variant="outline"
                              >
                                {proposal.status}
                              </Badge>
                            </div>
                            <p className="mt-0.5 truncate text-sm text-muted-foreground">
                              By{" "}
                              {student ? (
                                <Link
                                  href={`/profile/student/${student._id}`}
                                  className="text-brand-bright hover:underline"
                                >
                                  {student.name || student.githubUsername}
                                </Link>
                              ) : (
                                "Student"
                              )}
                              {" · "}
                              {truncateText(proposal.description, 80)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {proposal.pptUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={proposal.pptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="mr-1 h-3 w-3" />
                                  Deck
                                </a>
                              </Button>
                            )}
                            {proposal.status === "Pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() =>
                                    setReviewDialog({
                                      open: true,
                                      proposal,
                                      action: "Approved",
                                    })
                                  }
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    setReviewDialog({
                                      open: true,
                                      proposal,
                                      action: "Rejected",
                                    })
                                  }
                                >
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {proposal.status === "Approved" && problem?._id && (
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/project/${problem._id}`}>
                                  <Rocket className="mr-1.5 h-3 w-3" />
                                  Project
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

      {/* ─── Post Challenge Dialog ────────────────────────────────────── */}
      <Dialog open={showPostForm} onOpenChange={setShowPostForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Post Innovation Challenge</DialogTitle>
            <DialogDescription>
              Create a new challenge for students to apply to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="title">Challenge Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="e.g., Build a Real-Time Dashboard"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Describe the challenge in detail..."
                className="mt-1.5 min-h-[100px]"
              />
            </div>
            <div>
              <Label htmlFor="skills">Required Skills</Label>
              <Input
                id="skills"
                value={formData.skillsRequired}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, skillsRequired: e.target.value }))
                }
                placeholder="React, Node.js, MongoDB (comma-separated)"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.finalDeadline}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, finalDeadline: e.target.value }))
                }
                className="mt-1.5"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="github"
                checked={formData.createGithubRepo}
                onCheckedChange={(v) =>
                  setFormData((p) => ({ ...p, createGithubRepo: v }))
                }
              />
              <Label htmlFor="github">Create GitHub Repository</Label>
            </div>
            {formData.createGithubRepo && (
              <div>
                <Label htmlFor="repoName">Repository Name</Label>
                <Input
                  id="repoName"
                  value={formData.githubRepoName}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, githubRepoName: e.target.value }))
                  }
                  placeholder="my-challenge-repo"
                  className="mt-1.5"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostForm(false)}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handlePostChallenge}
              disabled={posting || !formData.title || !formData.description}
            >
              {posting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Post Challenge
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Review Dialog ────────────────────────────────────────────── */}
      <Dialog
        open={reviewDialog.open}
        onOpenChange={(o) =>
          setReviewDialog((p) => ({ ...p, open: o }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === "Approved"
                ? "Approve Proposal"
                : "Reject Proposal"}
            </DialogTitle>
            <DialogDescription>
              Provide feedback for the student before{" "}
              {reviewDialog.action === "Approved" ? "approving" : "rejecting"}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="feedback">Feedback (optional)</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Write your feedback here..."
              className="mt-1.5 min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setReviewDialog({ open: false, proposal: null, action: "" })
              }
            >
              Cancel
            </Button>
            <Button
              variant={reviewDialog.action === "Approved" ? "default" : "destructive"}
              onClick={handleReview}
              disabled={reviewing}
              className={
                reviewDialog.action === "Approved"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : ""
              }
            >
              {reviewing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {reviewDialog.action === "Approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ───────────────────────────────── */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(o) => setDeleteDialog((p) => ({ ...p, open: o }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Challenge</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this challenge? This action cannot
              be undone and will remove all associated proposals.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, problemId: "" })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function DashboardSkeleton() {
  return (
    <AppShell>
      <Skeleton className="mb-2 h-4 w-28" />
      <Skeleton className="mb-8 h-8 w-72" />
      <div className="mb-6 grid grid-cols-3 gap-6 border-y border-border py-5">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
      <Skeleton className="mb-4 h-10 w-64" />
      <div className="overflow-hidden rounded-lg border border-border">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[76px] rounded-none border-b border-border last:border-0" />
        ))}
      </div>
    </AppShell>
  );
}
