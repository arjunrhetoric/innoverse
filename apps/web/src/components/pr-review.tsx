"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GitMerge,
  GitPullRequest,
  MessageSquare,
  Loader2,
  AlertCircle,
  FileDiff,
  GitCommitHorizontal,
  Eye,
  CheckCircle2,
  XCircle,
  Check,
  Plus,
  CircleDot,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmAction } from "@/components/ui/confirm-dialog";
import { pr as prApi, type PrIdentifier } from "@/lib/api";
import { parseDiff, type FileDiff as ParsedFile } from "@/lib/diff";
import { prChannel } from "@/lib/channels";
import { useSSE } from "@/hooks/useSSE";
import { useUser } from "@/hooks/useUser";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PrReviewProps {
  repoOwner: string;
  repoName: string;
  pullNumber: number;
  onChanged?: () => void;
}

function threadKey(path: string, line: number | null | undefined, side?: string | null) {
  return `${path}:${line ?? "?"}:${(side ?? "RIGHT").toUpperCase()}`;
}

function reviewLabel(state?: string) {
  switch ((state ?? "").toUpperCase()) {
    case "APPROVED":
      return "approved these changes";
    case "CHANGES_REQUESTED":
      return "requested changes";
    case "COMMENTED":
      return "reviewed";
    case "DISMISSED":
      return "review was dismissed";
    default:
      return "submitted a review";
  }
}

function reviewBadge(state?: string) {
  switch ((state ?? "").toUpperCase()) {
    case "APPROVED":
      return "Approved";
    case "CHANGES_REQUESTED":
      return "Changes requested";
    case "COMMENTED":
      return "Commented";
    case "DISMISSED":
      return "Dismissed";
    default:
      return state ? state.replace(/_/g, " ").toLowerCase() : "Reviewed";
  }
}

type TimelineItem = {
  id: string;
  at: string;
  kind: "opened" | "commit" | "review" | "comment" | "merged" | "closed";
  actor?: string;
  title: string;
  body?: string;
  sha?: string;
  state?: string;
  message?: string;
};

export function PrReview({ repoOwner, repoName, pullNumber, onChanged }: PrReviewProps) {
  const { user, role } = useUser();
  const isStartup = role === "Startup";
  const id: PrIdentifier = { repoOwner, repoName, pullNumber };

  const [details, setDetails] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [inline, setInline] = useState<any[]>([]);
  const [diff, setDiff] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [acting, setActing] = useState<"merge" | "close" | "reopen" | null>(null);
  const [confirm, setConfirm] = useState<"merge" | "close" | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  // Review submit state
  const [reviewBody, setReviewBody] = useState("");
  const [reviewing, setReviewing] = useState<"APPROVE" | "REQUEST_CHANGES" | "COMMENT" | null>(null);
  const [requestNames, setRequestNames] = useState("");
  const [requesting, setRequesting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [d, f, c, cm, r, ic] = await Promise.all([
        prApi.getDetails(id),
        prApi.getFiles(id).catch(() => []),
        prApi.getComments(id).catch(() => []),
        prApi.getCommits(id).catch(() => []),
        prApi.getReviews(id).catch(() => []),
        prApi.getInlineComments(id).catch(() => []),
      ]);
      setDetails(d);
      setFiles(Array.isArray(f) ? f : []);
      setComments(Array.isArray(c) ? c : []);
      setCommits(Array.isArray(cm) ? cm : []);
      setReviews(Array.isArray(r) ? r : []);
      setInline(Array.isArray(ic) ? ic : []);
      try {
        setDiff(await prApi.getDiff(id));
      } catch {
        setDiff("");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load pull request");
    } finally {
      setLoading(false);
    }
  };

  const refreshInline = async () => {
    const ic = await prApi.getInlineComments(id).catch(() => []);
    setInline(Array.isArray(ic) ? ic : []);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoOwner, repoName, pullNumber]);

  // Live updates from the other side — skip our own echoes (we refetch after acting).
  useSSE(prChannel(repoOwner, repoName, pullNumber), (event) => {
    if (event?.actorId && user?.id && event.actorId === user.id) return;
    fetchAll();
  });

  const parsedFiles = useMemo(() => parseDiff(diff), [diff]);
  const headSha: string | undefined = details?.head?.sha;

  const inlineThreads = useMemo(() => {
    const byId = new Map<number, any>();
    for (const c of inline) byId.set(c.id, { ...c, replies: [] });
    const roots: any[] = [];
    for (const c of byId.values()) {
      if (c.in_reply_to_id && byId.has(c.in_reply_to_id)) {
        byId.get(c.in_reply_to_id).replies.push(c);
      } else {
        roots.push(c);
      }
    }
    const grouped = new Map<string, any[]>();
    for (const root of roots) {
      const key = threadKey(root.path, root.line ?? root.original_line, root.side);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(root);
    }
    return grouped;
  }, [inline]);

  const handleComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await prApi.postComment(id, comment);
      setComment("");
      const c = await prApi.getComments(id).catch(() => []);
      setComments(Array.isArray(c) ? c : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const handleAction = async (action: "merge" | "close" | "reopen") => {
    setActing(action);
    setError("");
    try {
      await prApi[action](id);
      await fetchAll();
      onChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action} PR`);
    } finally {
      setActing(null);
    }
  };

  const handleReview = async (event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT") => {
    setReviewing(event);
    setError("");
    try {
      await prApi.submitReview(id, event, reviewBody);
      setReviewBody("");
      const r = await prApi.getReviews(id).catch(() => []);
      setReviews(Array.isArray(r) ? r : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setReviewing(null);
    }
  };

  const handleRequestReviewers = async () => {
    const reviewers = requestNames.split(",").map((s) => s.trim().replace(/^@/, "")).filter(Boolean);
    if (!reviewers.length) return;
    setRequesting(true);
    setError("");
    try {
      await prApi.requestReviewers(id, reviewers);
      setRequestNames("");
      const d = await prApi.getDetails(id);
      setDetails(d);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to request reviewers");
    } finally {
      setRequesting(false);
    }
  };

  /* ── File index: one row per parsed diff file, enriched with API metadata ── */

  const fileEntries = useMemo(() => {
    const meta = new Map<string, any>();
    for (const f of files as any[]) {
      if (f?.filename) meta.set(f.filename, f);
    }
    const commentCounts = new Map<string, number>();
    for (const c of inline as any[]) {
      if (!c?.path) continue;
      commentCounts.set(c.path, (commentCounts.get(c.path) ?? 0) + 1);
    }
    return parsedFiles.map((file, index) => {
      let additions = 0;
      let deletions = 0;
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type === "add") additions += 1;
          else if (line.type === "del") deletions += 1;
        }
      }
      const m = meta.get(file.path);
      return {
        id: `pr-file-${index}`,
        index,
        path: file.path,
        file,
        status: (m?.status as string | undefined) ?? undefined,
        additions: typeof m?.additions === "number" ? m.additions : additions,
        deletions: typeof m?.deletions === "number" ? m.deletions : deletions,
        hunks: file.hunks.length,
        comments: commentCounts.get(file.path) ?? 0,
      };
    });
  }, [parsedFiles, files, inline]);

  const reviewState = useMemo(() => {
    const sorted = (reviews as any[])
      .filter((r) => r?.state)
      .slice()
      .sort((a, b) => String(a.submitted_at ?? "").localeCompare(String(b.submitted_at ?? "")));
    const last = sorted[sorted.length - 1];
    return last ? reviewBadge(last.state) : null;
  }, [reviews]);

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    if (details?.created_at) {
      items.push({
        id: "opened",
        at: details.created_at,
        kind: "opened",
        actor: details?.user?.login,
        title: "opened this pull request",
      });
    }
    for (const c of commits as any[]) {
      items.push({
        id: `commit-${c.sha}`,
        at: c.commit?.author?.date ?? c.commit?.committer?.date ?? "",
        kind: "commit",
        actor: c.commit?.author?.name,
        title: "committed",
        message: c.commit?.message?.split("\n")[0] ?? "commit",
        sha: c.sha,
      });
    }
    for (const r of reviews as any[]) {
      items.push({
        id: `review-${r.id}`,
        at: r.submitted_at ?? "",
        kind: "review",
        actor: r.user?.login,
        title: reviewLabel(r.state),
        body: r.body,
        state: r.state,
      });
    }
    for (const c of comments as any[]) {
      items.push({
        id: `comment-${c.id}`,
        at: c.created_at ?? "",
        kind: "comment",
        actor: c.user?.login,
        title: "commented",
        body: c.body,
      });
    }
    if (details?.merged_at) {
      items.push({
        id: "merged",
        at: details.merged_at,
        kind: "merged",
        actor: details?.merged_by?.login,
        title: "merged this pull request",
      });
    } else if ((details?.state ?? "open") === "closed") {
      items.push({
        id: "closed",
        at: details?.closed_at ?? details?.updated_at ?? "",
        kind: "closed",
        actor: details?.user?.login,
        title: "closed this pull request",
      });
    }
    return items.filter((i) => i.at).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  }, [details, commits, reviews, comments]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-2 h-3 w-52" />
          <Skeleton className="mt-3 h-5 w-64" />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          <div className="space-y-2 lg:rounded-lg lg:border lg:border-border lg:p-3">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="hidden h-7 w-full lg:block" />
            <Skeleton className="hidden h-7 w-full lg:block" />
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Skeleton className="h-9 rounded-none border-b border-border" />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-6 rounded-none" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const state = details?.state ?? "open";
  const merged = !!details?.merged_at;
  const requested = details?.requested_reviewers ?? [];
  const additions = details?.additions;
  const deletions = details?.deletions;
  const changedFiles = details?.changed_files ?? fileEntries.length;
  const open = state === "open" && !merged;

  return (
    <div className="min-w-0 space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {merged ? (
                <GitMerge className="h-4 w-4 shrink-0 text-success" aria-hidden />
              ) : (
                <GitPullRequest
                  className={cn(
                    "h-4 w-4 shrink-0",
                    open ? "text-success" : "text-subtle-foreground"
                  )}
                  aria-hidden
                />
              )}
              <h3 className="min-w-0 break-words text-md font-semibold leading-snug text-foreground">
                <span className="font-mono text-muted-foreground">#{pullNumber}</span>{" "}
                {details?.title || "Pull request"}
              </h3>
            </div>

            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>
                <span className="text-foreground">{details?.user?.login || "unknown"}</span> wants
                to merge
              </span>
              {details?.head?.ref && details?.base?.ref && (
                <span className="flex flex-wrap items-center gap-1 font-mono text-2xs">
                  <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-foreground">
                    {details.head.ref}
                  </span>
                  <ChevronRight className="h-3 w-3" aria-hidden />
                  <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-foreground">
                    {details.base.ref}
                  </span>
                </span>
              )}
              {details?.created_at && (
                <span className="text-2xs text-subtle-foreground">
                  opened {formatRelativeTime(details.created_at)}
                </span>
              )}
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <StatusBadge status={merged ? "Merged" : state === "open" ? "Open" : "Closed"} />
              {reviewState && <StatusBadge status={reviewState} withDot={false} />}
              {typeof additions === "number" && (
                <span className="tnum font-mono text-2xs">
                  <span className="text-diff-add-fg">+{additions}</span>{" "}
                  <span className="text-diff-del-fg">−{deletions ?? 0}</span>
                </span>
              )}
              <span className="font-mono text-2xs text-muted-foreground">
                {changedFiles} {changedFiles === 1 ? "file" : "files"}
              </span>
              {typeof details?.commits === "number" && (
                <span className="font-mono text-2xs text-muted-foreground">
                  {details.commits} {details.commits === 1 ? "commit" : "commits"}
                </span>
              )}
              {requested.length > 0 && (
                <span className="text-2xs text-muted-foreground">
                  Review requested from{" "}
                  <span className="font-mono text-foreground">
                    {requested.map((r: any) => r.login).join(", ")}
                  </span>
                </span>
              )}
            </div>
          </div>

          {isStartup && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {open && (
                <>
                  <Button
                    size="sm"
                    variant="brand"
                    disabled={!!acting}
                    onClick={() => setConfirm("merge")}
                  >
                    <GitMerge aria-hidden />
                    Merge
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive-outline"
                    disabled={!!acting}
                    onClick={() => setConfirm("close")}
                  >
                    <XCircle aria-hidden />
                    Close
                  </Button>
                </>
              )}
              {!merged && state === "closed" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!acting}
                  onClick={() => handleAction("reopen")}
                >
                  {acting === "reopen" ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <CircleDot aria-hidden />
                  )}
                  Reopen
                </Button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mx-4 mb-4 flex items-start gap-2 rounded-md border border-danger-border bg-danger-subtle p-3 sm:mx-5"
          >
            <AlertCircle className="mt-px h-4 w-4 shrink-0 text-danger" aria-hidden />
            <p className="min-w-0 break-words text-xs leading-relaxed text-danger">{error}</p>
          </div>
        )}

        {details?.body && (
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
              {details.body}
            </p>
          </div>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs defaultValue="conversation">
        <TabsList>
          <TabsTrigger value="conversation">
            <MessageSquare aria-hidden />
            Conversation
            {comments.length > 0 && (
              <span className="tnum font-mono text-2xs text-subtle-foreground">
                {comments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="files">
            <FileDiff aria-hidden />
            Files changed
            {fileEntries.length > 0 && (
              <span className="tnum font-mono text-2xs text-subtle-foreground">
                {fileEntries.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="commits">
            <GitCommitHorizontal aria-hidden />
            Commits
            {commits.length > 0 && (
              <span className="tnum font-mono text-2xs text-subtle-foreground">
                {commits.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <Eye aria-hidden />
            Reviews
            {reviews.length > 0 && (
              <span className="tnum font-mono text-2xs text-subtle-foreground">
                {reviews.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Timeline ─────────────────────────────────────────────────── */}
        <TabsContent value="conversation" className="min-w-0">
          {timeline.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No activity yet"
              description="Commits, reviews and comments appear here in order as the pull request moves."
            />
          ) : (
            <ol className="relative ml-1 border-l border-border pl-5">
              {timeline.map((item) => (
                <li key={item.id} className="relative pb-4 last:pb-0">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -left-[1.65rem] flex h-5 w-5 items-center justify-center rounded-full border bg-card",
                      item.kind === "merged"
                        ? "border-success-border text-success"
                        : item.kind === "closed"
                          ? "border-border text-subtle-foreground"
                          : item.kind === "review" && item.state === "CHANGES_REQUESTED"
                            ? "border-warning-border text-warning"
                            : item.kind === "review" && item.state === "APPROVED"
                              ? "border-success-border text-success"
                              : "border-border text-muted-foreground"
                    )}
                  >
                    {item.kind === "merged" ? (
                      <GitMerge className="h-2.5 w-2.5" />
                    ) : item.kind === "closed" ? (
                      <XCircle className="h-2.5 w-2.5" />
                    ) : item.kind === "commit" ? (
                      <GitCommitHorizontal className="h-2.5 w-2.5" />
                    ) : item.kind === "review" ? (
                      <Eye className="h-2.5 w-2.5" />
                    ) : item.kind === "opened" ? (
                      <GitPullRequest className="h-2.5 w-2.5" />
                    ) : (
                      <MessageSquare className="h-2.5 w-2.5" />
                    )}
                  </span>

                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {item.actor || "someone"}
                      </span>
                      <span>{item.title}</span>
                      {item.sha && (
                        <span className="rounded border border-border bg-surface px-1 py-0.5 font-mono text-2xs text-muted-foreground">
                          {item.sha.slice(0, 7)}
                        </span>
                      )}
                      <span className="text-2xs text-subtle-foreground">
                        {formatRelativeTime(item.at)}
                      </span>
                    </p>
                    {item.kind === "commit" && item.message && (
                      <p className="mt-1 break-words font-mono text-2xs text-muted-foreground">
                        {item.message}
                      </p>
                    )}
                    {item.body && (
                      <div className="mt-1.5 rounded-md border border-border bg-card px-3 py-2">
                        <p className="break-words whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {item.body}
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-4 rounded-lg border border-border bg-card p-3">
            <Field id="pr-comment" label="Add a comment" hint="Markdown is not rendered">
              <Textarea
                id="pr-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Summarise what you checked, or ask for a specific change…"
                className="min-h-20"
              />
            </Field>
            <div className="mt-2 flex justify-end">
              <Button
                variant="brand"
                size="sm"
                onClick={handleComment}
                disabled={posting || !comment.trim()}
              >
                {posting ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
                Comment
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── Files changed (two-pane) ─────────────────────────────────── */}
        <TabsContent value="files" className="min-w-0">
          {fileEntries.length === 0 ? (
            <EmptyState
              icon={FileDiff}
              title="No file changes"
              description="The diff is unavailable for this pull request, or it changes no files yet."
            />
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
              {/* file list — horizontal scroller below lg, sticky column above */}
              <nav
                aria-label="Changed files"
                className="min-w-0 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-5.5rem)] lg:self-start lg:overflow-y-auto lg:rounded-lg lg:border lg:border-border lg:bg-card"
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-2 px-0.5 lg:px-3 lg:pt-3">
                  <p className="text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Files changed
                  </p>
                  <span className="tnum font-mono text-2xs text-subtle-foreground">
                    {fileEntries.length}
                  </span>
                </div>
                <ul className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 lg:pb-2">
                  {fileEntries.map((entry) => {
                    const isActive = activeFile === entry.path;
                    return (
                      <li key={entry.id} className="shrink-0 lg:shrink lg:w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFile(entry.path);
                            document
                              .getElementById(entry.id)
                              ?.scrollIntoView({ block: "start", behavior: "auto" });
                          }}
                          aria-current={isActive ? "true" : undefined}
                          className={cn(
                            "flex w-full max-w-[18rem] items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors lg:max-w-none lg:rounded-none lg:border-0 lg:border-l-2 lg:px-3 lg:py-2",
                            isActive
                              ? "border-border-strong bg-surface-2 lg:border-l-foreground"
                              : "border-border bg-surface hover:bg-surface-2 lg:border-l-transparent lg:bg-transparent"
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate font-mono text-2xs text-foreground">
                            {entry.path}
                          </span>
                          <span className="shrink-0 whitespace-nowrap font-mono text-2xs">
                            <span className="text-diff-add-fg">+{entry.additions}</span>{" "}
                            <span className="text-diff-del-fg">−{entry.deletions}</span>
                          </span>
                          {entry.comments > 0 && (
                            <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                              {entry.comments}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* diff pane */}
              <div className="min-w-0 space-y-4">
                {fileEntries.map((entry) => (
                  <DiffFileView
                    key={entry.path}
                    id={entry.id}
                    file={entry.file}
                    status={entry.status}
                    additions={entry.additions}
                    deletions={entry.deletions}
                    hunkCount={entry.hunks}
                    commentCount={entry.comments}
                    threads={inlineThreads}
                    headSha={headSha}
                    prId={id}
                    onPosted={refreshInline}
                    onError={setError}
                    onFocus={() => setActiveFile(entry.path)}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Commits ──────────────────────────────────────────────────── */}
        <TabsContent value="commits" className="min-w-0">
          {commits.length === 0 ? (
            <EmptyState
              icon={GitCommitHorizontal}
              title="No commits"
              description="Commits appear here once the branch has changes pushed to it."
            />
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {commits.map((c: any) => (
                <div key={c.sha} className="flex min-w-0 items-start gap-3 px-4 py-3">
                  <GitCommitHorizontal
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle-foreground"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium leading-snug text-foreground">
                      {c.commit?.message?.split("\n")[0]}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-2xs text-muted-foreground">
                      <span>{c.commit?.author?.name}</span>
                      {c.commit?.author?.date && (
                        <span className="text-subtle-foreground">
                          {formatDate(c.commit.author.date)}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
                    {c.sha?.slice(0, 7)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Reviews ──────────────────────────────────────────────────── */}
        <TabsContent value="reviews" className="min-w-0 space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h4 className="text-sm font-medium text-foreground">Submit a review</h4>
            <p className="mt-0.5 text-2xs text-muted-foreground">
              {isStartup
                ? "Approving or requesting changes records a decision on this pull request."
                : "The challenge owner approves or requests changes. You can still leave a review comment."}
            </p>
            <div className="mt-3">
              <Field id="review-body" label="Review summary" hint="Required to request changes">
                <Textarea
                  id="review-body"
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  placeholder="What did you verify, and what still blocks this?"
                  className="min-h-20"
                />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {isStartup && (
                <>
                  <Button
                    size="sm"
                    variant="brand"
                    disabled={!!reviewing}
                    onClick={() => handleReview("APPROVE")}
                  >
                    {reviewing === "APPROVE" ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <CheckCircle2 aria-hidden />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive-outline"
                    disabled={!!reviewing || !reviewBody.trim()}
                    onClick={() => handleReview("REQUEST_CHANGES")}
                  >
                    {reviewing === "REQUEST_CHANGES" ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <XCircle aria-hidden />
                    )}
                    Request changes
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={!!reviewing || !reviewBody.trim()}
                onClick={() => handleReview("COMMENT")}
              >
                {reviewing === "COMMENT" ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <MessageSquare aria-hidden />
                )}
                Comment review
              </Button>
            </div>
          </div>

          {isStartup && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="text-sm font-medium text-foreground">Request reviewers</h4>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Field id="reviewers" label="GitHub usernames" hint="Comma-separated">
                    <Input
                      id="reviewers"
                      value={requestNames}
                      onChange={(e) => setRequestNames(e.target.value)}
                      placeholder="octocat, hubot"
                    />
                  </Field>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRequestReviewers}
                  disabled={requesting || !requestNames.trim()}
                >
                  {requesting ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <Plus aria-hidden />
                  )}
                  Request
                </Button>
              </div>
            </div>
          )}

          {reviews.length === 0 ? (
            <EmptyState
              icon={Eye}
              title="No reviews yet"
              description="Reviews appear here once a reviewer approves, requests changes or leaves a summary."
            />
          ) : (
            <div className="space-y-2">
              {reviews.map((r: any) => (
                <div key={r.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-2xs font-medium uppercase",
                        r.state === "APPROVED"
                          ? "border-success-border bg-success-subtle text-success"
                          : r.state === "CHANGES_REQUESTED"
                            ? "border-warning-border bg-warning-subtle text-warning"
                            : "border-border bg-surface text-muted-foreground"
                      )}
                    >
                      {String(r.user?.login ?? "?").slice(0, 1)}
                    </span>
                    <span className="text-xs font-medium text-foreground">{r.user?.login}</span>
                    <StatusBadge status={reviewBadge(r.state)} withDot={false} />
                    <span className="font-mono text-2xs text-subtle-foreground">
                      {r.submitted_at ? formatDate(r.submitted_at) : ""}
                    </span>
                  </div>
                  {r.body && (
                    <p className="mt-2 break-words whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {r.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Destructive confirmations ──────────────────────────────────── */}
      <ConfirmAction
        open={confirm === "merge"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Merge pull request #${pullNumber}?`}
        description={
          <>
            Commits from{" "}
            <span className="font-mono text-foreground">{details?.head?.ref ?? "the branch"}</span>{" "}
            are applied to{" "}
            <span className="font-mono text-foreground">{details?.base?.ref ?? "the base branch"}</span>{" "}
            and the pull request is closed. This cannot be undone.
          </>
        }
        confirmLabel="Merge pull request"
        pending={acting === "merge"}
        onConfirm={async () => {
          await handleAction("merge");
          setConfirm(null);
        }}
      />

      <ConfirmAction
        open={confirm === "close"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Close pull request #${pullNumber}?`}
        description="No commits are merged. Review stops here, and the pull request can be reopened later."
        confirmLabel="Close pull request"
        pending={acting === "close"}
        onConfirm={async () => {
          await handleAction("close");
          setConfirm(null);
        }}
      />
    </div>
  );
}

function DiffFileView({
  id,
  file,
  status,
  additions,
  deletions,
  hunkCount,
  commentCount,
  threads,
  headSha,
  prId,
  onPosted,
  onError,
  onFocus,
}: {
  id: string;
  file: ParsedFile;
  status?: string;
  additions: number;
  deletions: number;
  hunkCount: number;
  commentCount: number;
  threads: Map<string, any[]>;
  headSha?: string;
  prId: PrIdentifier;
  onPosted: () => void;
  onError: (msg: string) => void;
  onFocus: () => void;
}) {
  const [composer, setComposer] = useState<{ line: number; side: "LEFT" | "RIGHT" } | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const openComposer = (line: number | null, side: "LEFT" | "RIGHT") => {
    if (line == null) return;
    setComposer({ line, side });
    setText("");
    onFocus();
  };

  const postLineComment = async () => {
    if (!composer || !text.trim()) return;
    setSending(true);
    try {
      await prApi.postInlineComment(prId, {
        path: file.path,
        line: composer.line,
        side: composer.side,
        body: text,
        commitId: headSha,
      });
      setComposer(null);
      setText("");
      onPosted();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Failed to post inline comment");
    } finally {
      setSending(false);
    }
  };

  const postReply = async (commentId: number) => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await prApi.postInlineComment(prId, { body: replyText, inReplyTo: commentId });
      setReplyTo(null);
      setReplyText("");
      onPosted();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setReplying(false);
    }
  };

  return (
    <section
      id={id}
      aria-label={file.path}
      className="min-w-0 scroll-mt-20 overflow-hidden rounded-lg border border-border bg-card"
    >
      {/* sticky file header */}
      <div className="sticky top-14 z-10 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border bg-surface px-3 py-2">
        <span className="min-w-0 truncate font-mono text-xs font-medium text-foreground">
          {file.path}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {status && (
            <Badge variant="secondary" className="font-mono lowercase">
              {status}
            </Badge>
          )}
          <span className="font-mono text-2xs text-subtle-foreground">
            {hunkCount} {hunkCount === 1 ? "hunk" : "hunks"}
          </span>
          <span className="tnum font-mono text-2xs">
            <span className="text-diff-add-fg">+{additions}</span>{" "}
            <span className="text-diff-del-fg">−{deletions}</span>
          </span>
          {commentCount > 0 && (
            <span className="inline-flex items-center gap-1 font-mono text-2xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" aria-hidden />
              {commentCount}
            </span>
          )}
        </span>
      </div>

      <div className="min-w-0">
        {file.hunks.map((hunk, hi) => (
          <div key={hi} className="min-w-0">
            <div className="border-y border-border bg-surface-2 px-3 py-1 font-mono text-2xs text-muted-foreground">
              <span className="block whitespace-pre-wrap break-all">{hunk.header}</span>
            </div>

            {hunk.lines.slice(1).map((line, li) => {
              const key =
                line.type === "add" || line.type === "del" || line.type === "context"
                  ? threadKey(
                      file.path,
                      line.type === "del" ? line.oldNo : line.newNo,
                      line.type === "del" ? "LEFT" : "RIGHT"
                    )
                  : null;
              const lineThreads = key ? (threads.get(key) ?? []) : [];
              const composerOpen =
                composer && key === threadKey(file.path, composer.line, composer.side);

              if (line.type === "hunk" || line.type === "meta") {
                return (
                  <div
                    key={li}
                    className="whitespace-pre-wrap break-all bg-surface-2/60 px-3 py-1 font-mono text-2xs text-subtle-foreground"
                  >
                    {line.text}
                  </div>
                );
              }

              return (
                <div key={li} className="min-w-0 border-b border-border/40 last:border-b-0">
                  <div
                    className={cn(
                      "flex min-w-0 items-stretch font-mono text-2xs leading-5",
                      line.type === "add" && "bg-diff-add",
                      line.type === "del" && "bg-diff-del"
                    )}
                  >
                    <button
                      type="button"
                      disabled={line.oldNo == null}
                      onClick={() => openComposer(line.oldNo, "LEFT")}
                      aria-label={line.oldNo != null ? `Comment on old line ${line.oldNo}` : undefined}
                      className={cn(
                        "w-12 shrink-0 select-none border-r border-border/50 pr-1.5 text-right transition-colors sm:w-14",
                        line.type === "add" && "bg-diff-add-strong",
                        line.type === "del" && "bg-diff-del-strong",
                        line.oldNo != null
                          ? "text-subtle-foreground hover:text-foreground"
                          : "cursor-default text-transparent"
                      )}
                    >
                      {line.oldNo ?? ""}
                    </button>
                    <button
                      type="button"
                      disabled={line.newNo == null}
                      onClick={() => openComposer(line.newNo, "RIGHT")}
                      aria-label={line.newNo != null ? `Comment on line ${line.newNo}` : undefined}
                      className={cn(
                        "w-12 shrink-0 select-none border-r border-border/50 pr-1.5 text-right transition-colors sm:w-14",
                        line.type === "add" && "bg-diff-add-strong",
                        line.type === "del" && "bg-diff-del-strong",
                        line.newNo != null
                          ? "text-subtle-foreground hover:text-foreground"
                          : "cursor-default text-transparent"
                      )}
                    >
                      {line.newNo ?? ""}
                    </button>
                    <span
                      aria-hidden
                      className={cn(
                        "w-5 shrink-0 select-none text-center",
                        line.type === "add" && "text-diff-add-fg",
                        line.type === "del" && "text-diff-del-fg",
                        line.type === "context" && "text-subtle-foreground"
                      )}
                    >
                      {line.type === "add" ? "+" : line.type === "del" ? "−" : ""}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 whitespace-pre-wrap break-words py-0.5 pr-3",
                        line.type === "add" && "text-diff-add-fg",
                        line.type === "del" && "text-diff-del-fg",
                        line.type === "context" && "text-foreground"
                      )}
                    >
                      {line.text.slice(1)}
                    </span>
                  </div>

                  {lineThreads.map((t: any) => (
                    <div
                      key={t.id}
                      className="mx-2 my-2 rounded-md border border-border bg-card p-2.5 sm:ml-[7.5rem]"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-2xs font-medium text-foreground">
                          {t.user?.login}
                        </span>
                        <span className="font-mono text-2xs text-subtle-foreground">
                          {t.created_at ? formatRelativeTime(t.created_at) : ""}
                        </span>
                      </div>
                      <p className="mt-1 break-words whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                        {t.body}
                      </p>

                      {t.replies?.map((r: any) => (
                        <div key={r.id} className="mt-2 border-l border-border pl-2.5">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-2xs font-medium text-foreground">
                              {r.user?.login}
                            </span>
                            <span className="font-mono text-2xs text-subtle-foreground">
                              {r.created_at ? formatRelativeTime(r.created_at) : ""}
                            </span>
                          </div>
                          <p className="mt-0.5 break-words whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                            {r.body}
                          </p>
                        </div>
                      ))}

                      {replyTo === t.id ? (
                        <div className="mt-2">
                          <Field id={`reply-${t.id}`} label="Reply">
                            <Textarea
                              id={`reply-${t.id}`}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Reply to this thread…"
                              className="min-h-16 text-xs"
                            />
                          </Field>
                          <div className="mt-1.5 flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setReplyTo(null);
                                setReplyText("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="brand"
                              disabled={replying || !replyText.trim()}
                              onClick={() => postReply(t.id)}
                            >
                              {replying ? (
                                <Loader2 className="animate-spin" aria-hidden />
                              ) : null}
                              Reply
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyTo(t.id);
                            setReplyText("");
                          }}
                          className="mt-1.5 text-2xs font-medium text-brand underline-offset-2 hover:underline"
                        >
                          Reply
                        </button>
                      )}
                    </div>
                  ))}

                  {composerOpen && composer && (
                    <div className="mx-2 my-2 rounded-md border border-border-strong bg-card p-2.5 sm:ml-[7.5rem]">
                      <p className="mb-1.5 font-mono text-2xs text-muted-foreground">
                        {file.path}:{composer.line}{" "}
                        <span className="text-subtle-foreground">({composer.side})</span>
                      </p>
                      <Field id={`composer-${id}-${composer.line}-${composer.side}`} label="Comment on this line">
                        <Textarea
                          id={`composer-${id}-${composer.line}-${composer.side}`}
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="Leave an inline comment…"
                          className="min-h-16 text-xs"
                        />
                      </Field>
                      <div className="mt-1.5 flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setComposer(null)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="brand"
                          disabled={sending || !text.trim()}
                          onClick={postLineComment}
                        >
                          {sending ? (
                            <Loader2 className="animate-spin" aria-hidden />
                          ) : (
                            <Check aria-hidden />
                          )}
                          Comment
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
