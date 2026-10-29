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
  Inbox,
  KeyRound,
} from "lucide-react";
import { GithubIcon as Github } from "@/components/ui/icons";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatBand } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton, SkeletonRows, SkeletonStats } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogBody,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUser } from "@/hooks/useUser";
import { dashboard, projects, proposals as proposalsApi } from "@/lib/api";
import { formatDate, truncateText } from "@/lib/utils";
import type { Problem, Proposal } from "@/lib/types";

type ReviewAction = "Approved" | "Rejected" | "";

function accessIsActive(proposal: Proposal): boolean {
  return (
    Boolean(proposal.accessGrantedAt) &&
    Boolean(proposal.accessStatus) &&
    proposal.accessStatus !== "invited" &&
    proposal.accessStatus !== "failed"
  );
}

/** Agreement lifecycle for an approved proposal, derived from its own fields. */
function agreementState(proposal: Proposal): { label: string; hint: string } | null {
  if (proposal.status !== "Approved") return null;
  if (!proposal.termsAcceptedAt) {
    return {
      label: "Pending signature",
      hint: "Repository access is not granted until the student signs.",
    };
  }
  if (accessIsActive(proposal)) {
    return { label: "Access active", hint: "Agreement signed and read access is active." };
  }
  if (proposal.accessStatus === "failed") {
    return {
      label: "Access failed",
      hint:
        proposal.accessError ||
        "GitHub did not grant access. Use Fix access to retry from Innoverse.",
    };
  }
  if (proposal.accessStatus === "invited") {
    return {
      label: "Invite pending",
      hint: "Signed — the student must accept the GitHub invitation before the repository opens.",
    };
  }
  return {
    label: "Access unverified",
    hint: "Signed — verify the GitHub permission before sharing the repository.",
  };
}

/** Extract owner/repo from the challenge fields or a GitHub URL. */
function repoFor(proposal: Proposal): { owner: string; repo: string } | null {
  const problem = typeof proposal.problemId === "object" ? proposal.problemId : null;
  if (problem?.githubOwner && problem?.githubRepoName) {
    return { owner: problem.githubOwner, repo: problem.githubRepoName };
  }
  const url = problem?.githubRepoUrl || proposal.repoUrl || "";
  const match = /github\.com\/([^/]+)\/([^/?#]+)/i.exec(url);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/i, "") };
}

export default function StartupDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Problem[]>([]);
  const [allProposals, setAllProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("challenges");

  // Review Dialog State
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    proposal: Proposal | null;
    action: ReviewAction;
  }>({ open: false, proposal: null, action: "" });
  const [feedback, setFeedback] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [notice, setNotice] = useState("");
  const [fixingAccessId, setFixingAccessId] = useState<string | null>(null);

  // Delete Confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    problemId: string;
    title: string;
  }>({ open: false, problemId: "", title: "" });
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
      router.push("/dashboard");
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
      signed: allProposals.filter((p) => p.status === "Approved" && p.termsAcceptedAt).length,
      withAccess: allProposals.filter(
        (p) => p.status === "Approved" && p.termsAcceptedAt && accessIsActive(p)
      ).length,
    }),
    [challenges, allProposals]
  );

  const proposalsFor = (challengeId: string) =>
    allProposals.filter(
      (p) => typeof p.problemId === "object" && p.problemId?._id === challengeId
    );

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleReview = async () => {
    if (!reviewDialog.proposal || !reviewDialog.action) return;
    setReviewing(true);
    setReviewError("");
    try {
      await proposalsApi.review(
        reviewDialog.proposal._id,
        reviewDialog.action,
        feedback
      );
      setReviewDialog({ open: false, proposal: null, action: "" });
      setFeedback("");
      setNotice(
        reviewDialog.action === "Approved"
          ? "Proposal approved. The collaboration agreement is ready for the student to sign."
          : "Proposal rejected and feedback shared with the student."
      );
      await fetchData();
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : "Failed to review proposal");
    } finally {
      setReviewing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await projects.delete(deleteDialog.problemId);
      setDeleteDialog({ open: false, problemId: "", title: "" });
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete challenge");
    } finally {
      setDeleting(false);
    }
  };

  const openReview = (proposal: Proposal, action: ReviewAction) => {
    setFeedback("");
    setReviewError("");
    setReviewDialog({ open: true, proposal, action });
  };

  const fixAccess = async (proposal: Proposal) => {
    const student = typeof proposal.studentId === "object" ? proposal.studentId : null;
    const repo = repoFor(proposal);
    if (!student?.githubUsername || !repo) {
      setError(
        "This proposal is missing the student's GitHub username or the repository owner/name."
      );
      return;
    }
    setFixingAccessId(proposal._id);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/github/repo-access", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: repo.owner,
          repo: repo.repo,
          username: student.githubUsername,
          proposalId: proposal._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not repair repository access");
      setNotice(data.message || "Repository access updated.");
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not repair repository access");
      await fetchData();
    } finally {
      setFixingAccessId(null);
    }
  };

  if (authLoading || loading) {
    return <DashboardSkeleton />;
  }

  const reviewProposal = reviewDialog.proposal;
  const reviewProblem =
    reviewProposal && typeof reviewProposal.problemId === "object"
      ? reviewProposal.problemId
      : null;
  const reviewStudent =
    reviewProposal && typeof reviewProposal.studentId === "object"
      ? reviewProposal.studentId
      : null;

  return (
    <AppShell>

      <PageHeader
        eyebrow={
          <span className="font-mono text-2xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Workspace
          </span>
        }
        title="Challenges and proposals"
        description="Post challenges, track agreement state after approval, and clear the proposal queue."
        actions={
          <Button variant="default" asChild>
            <Link href="/dashboard/startup/new-challenge">
              <Plus className="h-4 w-4" />
              Post challenge
            </Link>
          </Button>
        }
      />

      <StatBand
        className="mb-6"
        items={[
          {
            label: "Active challenges",
            value: stats.activeChalllenges,
            hint: `${challenges.length} total`,
          },
          { label: "Proposals", value: stats.totalProposals, hint: "All time" },
          {
            label: "Awaiting review",
            value: stats.pending,
            hint: stats.pending ? "Needs a decision" : "Queue clear",
          },
          {
            label: "Agreements signed",
            value: stats.signed,
            hint: `${stats.withAccess} with active access`,
          },
        ]}
      />

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle p-4"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mb-6 flex items-start gap-2 rounded-lg border border-success-border bg-success-subtle p-4"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <p className="text-sm text-success">{notice}</p>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="challenges">
            Challenges
            <span className="tnum font-mono text-xs text-subtle-foreground">
              {challenges.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="proposals">
            Proposal queue
            {stats.pending > 0 && (
              <Badge variant="warning" className="tnum font-mono">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Challenges ─────────────────────────────────────────────── */}
        <TabsContent value="challenges">
          {challenges.length === 0 ? (
            <EmptyState
              icon={Rocket}
              title="No challenges yet"
              description="Post your first innovation challenge to start receiving student proposals."
              action={{
                label: "Post a challenge",
                href: "/dashboard/startup/new-challenge",
              }}
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {challenges.map((challenge) => {
                const related = proposalsFor(challenge._id);
                const approved = related.filter((p) => p.status === "Approved");
                const signed = approved.filter(
                  (p) => p.termsAcceptedAt && p.accessGrantedAt
                );
                const pending = related.filter((p) => p.status === "Pending").length;
                const agreement = approved.length
                  ? signed.length === approved.length
                    ? "Signed"
                    : "Pending signature"
                  : "No approvals";

                return (
                  <li
                    key={challenge._id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-md font-medium tracking-tight text-foreground">
                          {challenge.title}
                        </h3>
                        <StatusBadge
                          status={challenge.completed ? "Completed" : "Active"}
                        />
                        {pending > 0 && (
                          <Badge variant="warning" className="tnum font-mono">
                            {pending} new
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {truncateText(challenge.description, 130)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-subtle-foreground" />
                          <span className="tnum font-mono">{related.length}</span>
                          {related.length === 1 ? " proposal" : " proposals"}
                          <span className="text-subtle-foreground">·</span>
                          <span className="tnum font-mono">{approved.length}</span>{" "}
                          approved
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-subtle-foreground" />
                          <span className="font-mono">
                            {formatDate(challenge.finalDeadline)}
                          </span>
                        </span>
                        {challenge.skillsRequired?.length > 0 && (
                          <span className="truncate font-mono text-subtle-foreground">
                            {challenge.skillsRequired.slice(0, 3).join(" · ")}
                            {challenge.skillsRequired.length > 3 &&
                              ` +${challenge.skillsRequired.length - 3}`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      <StatusBadge status={agreement} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTab("proposals")}
                      >
                        Review proposals
                      </Button>
                      {challenge.githubRepoUrl && (
                        <Tooltip content="Open GitHub repository">
                          <Button size="icon-sm" variant="ghost" asChild>
                            <a
                              href={challenge.githubRepoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open GitHub repository"
                            >
                              <Github className="h-4 w-4" />
                            </a>
                          </Button>
                        </Tooltip>
                      )}
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-danger"
                        aria-label={`Delete ${challenge.title}`}
                        onClick={() =>
                          setDeleteDialog({
                            open: true,
                            problemId: challenge._id,
                            title: challenge.title,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        {/* ─── Proposal queue ─────────────────────────────────────────── */}
        <TabsContent value="proposals">
          {allProposals.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No proposals received"
              description="Proposals appear here as soon as a student applies to one of your challenges."
              action={{
                label: "Post a challenge",
                href: "/dashboard/startup/new-challenge",
              }}
              secondary={{
                label: "View challenges",
                onClick: () => setTab("challenges"),
              }}
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {allProposals.map((proposal) => {
                const problem =
                  typeof proposal.problemId === "object" ? proposal.problemId : null;
                const student =
                  typeof proposal.studentId === "object" ? proposal.studentId : null;
                const agreement = agreementState(proposal);

                return (
                  <li
                    key={proposal._id}
                    className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {student ? (
                            <Link
                              href={`/profile/student/${student._id}`}
                              className="hover:text-brand hover:underline"
                            >
                              {student.name || student.githubUsername}
                            </Link>
                          ) : (
                            "Student"
                          )}
                        </span>
                        <StatusBadge status={proposal.status} />
                        {agreement && (
                          <Tooltip content={agreement.hint}>
                            <span className="inline-flex">
                              <StatusBadge status={agreement.label} />
                            </span>
                          </Tooltip>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        <Link
                          href={
                            problem?._id
                              ? `/project/${problem._id}`
                              : "/dashboard/startup"
                          }
                          className="font-medium text-foreground hover:underline"
                        >
                          {problem?.title || "Challenge"}
                        </Link>
                        <span className="mx-1.5 text-subtle-foreground">·</span>
                        <span className="font-mono">
                          submitted {formatDate(proposal.submittedAt)}
                        </span>
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {truncateText(proposal.description, 110)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      {proposal.pptUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`/api/proposals/${proposal._id}/file`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Deck
                          </a>
                        </Button>
                      )}
                      {proposal.status === "Approved" && proposal.agreementFile && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/api/proposals/${proposal._id}/agreement/file`}>
                            Agreement
                          </a>
                        </Button>
                      )}
                      {proposal.status === "Pending" ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openReview(proposal, "Approved")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive-outline"
                            onClick={() => openReview(proposal, "Rejected")}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        proposal.status === "Approved" &&
                        problem?._id && (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/project/${problem._id}`}>
                              <Rocket className="h-3.5 w-3.5" />
                              Project
                            </Link>
                          </Button>
                        )
                      )}
                      {proposal.status === "Approved" &&
                        proposal.termsAcceptedAt &&
                        !accessIsActive(proposal) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fixAccess(proposal)}
                            disabled={fixingAccessId === proposal._id}
                          >
                            {fixingAccessId === proposal._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <KeyRound className="h-3.5 w-3.5" />
                            )}
                            Fix access
                          </Button>
                        )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openReview(proposal, "")}
                      >
                        Review
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Review dialog: details, then decision + feedback ─────────── */}
      <Dialog
        open={reviewDialog.open}
        onOpenChange={(o) => {
          if (!o) setFeedback("");
          setReviewDialog((p) => ({ ...p, open: o }));
        }}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === "Approved"
                ? "Approve proposal"
                : reviewDialog.action === "Rejected"
                  ? "Reject proposal"
                  : "Proposal"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action
                ? `Provide feedback for the student before ${
                    reviewDialog.action === "Approved" ? "approving" : "rejecting"
                  }.`
                : "Read the proposal, then approve or reject it. The student sees your feedback."}
            </DialogDescription>
          </DialogHeader>

          {reviewProposal && (
            <DialogBody className="space-y-5">
              {reviewError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-danger-border bg-danger-subtle px-3 py-2.5"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <p className="text-sm text-danger">{reviewError}</p>
                </div>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div className="col-span-2 min-w-0">
                  <dt className="text-subtle-foreground">Candidate</dt>
                  <dd className="mt-0.5 truncate text-sm text-foreground">
                    {reviewStudent
                      ? reviewStudent.name || reviewStudent.githubUsername
                      : "Student"}
                  </dd>
                </div>
                <div className="col-span-2 min-w-0">
                  <dt className="text-subtle-foreground">Challenge</dt>
                  <dd className="mt-0.5 truncate text-sm text-foreground">
                    {reviewProblem?.title || "Challenge"}
                  </dd>
                </div>
                <div>
                  <dt className="text-subtle-foreground">Submitted</dt>
                  <dd className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {formatDate(reviewProposal.submittedAt)}
                  </dd>
                </div>
                <div className="flex items-end justify-end">
                  <StatusBadge status={reviewProposal.status} />
                </div>
              </dl>

              <p className="whitespace-pre-line rounded-md border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-muted-foreground">
                {reviewProposal.description || "No description provided."}
              </p>

              {reviewProposal.pptUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`/api/proposals/${reviewProposal._id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open pitch deck
                  </a>
                </Button>
              )}

              {reviewDialog.action === "Approved" && (
                <div className="rounded-md border border-border bg-surface px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  Approving generates the collaboration and IP agreement. After the student signs,
                  Innoverse grants read-only repository access and notifies you here if GitHub
                  needs attention.
                </div>
              )}

              {reviewDialog.action && (
                <Field
                  id="feedback"
                  label="Feedback (optional)"
                  hint="Shared with the student"
                >
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="What should the student know about this decision?"
                    className="min-h-[80px]"
                  />
                </Field>
              )}
            </DialogBody>
          )}

          <DialogFooter>
            {reviewDialog.action ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFeedback("");
                    setReviewDialog((p) => ({ ...p, action: "" }));
                  }}
                >
                  Back
                </Button>
                <Button
                  variant={
                    reviewDialog.action === "Approved" ? "default" : "destructive"
                  }
                  onClick={handleReview}
                  disabled={reviewing}
                >
                  {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {reviewDialog.action === "Approved" ? "Approve" : "Reject"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    setReviewDialog({ open: false, proposal: null, action: "" })
                  }
                >
                  Close
                </Button>
                {reviewProposal?.status === "Pending" && (
                  <>
                    <Button
                      variant="destructive-outline"
                      onClick={() =>
                        setReviewDialog((p) => ({ ...p, action: "Rejected" }))
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      variant="default"
                      onClick={() =>
                        setReviewDialog((p) => ({ ...p, action: "Approved" }))
                      }
                    >
                      Approve
                    </Button>
                  </>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete confirmation ─────────────────────────────────────── */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(o) =>
          setDeleteDialog((p) =>
            o ? { ...p, open: o } : { open: false, problemId: "", title: "" }
          )
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-danger">Delete challenge</DialogTitle>
            <DialogDescription>
              {deleteDialog.title ? `“${deleteDialog.title}” ` : ""}will be removed
              along with every proposal attached to it. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteDialog({ open: false, problemId: "", title: "" })
              }
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
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
      <div className="mb-6 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <SkeletonStats count={4} />
      <Skeleton className="mb-4 mt-6 h-9 w-64" />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <SkeletonRows rows={5} />
      </div>
    </AppShell>
  );
}
