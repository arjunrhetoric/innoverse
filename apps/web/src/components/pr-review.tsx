"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GitMerge,
  MessageSquare,
  Loader2,
  AlertCircle,
  FileDiff,
  GitCommitHorizontal,
  Eye,
  Star,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pr as prApi, type PrIdentifier } from "@/lib/api";
import { parseDiff, type FileDiff as ParsedFile } from "@/lib/diff";
import { prChannel } from "@/lib/realtime";
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

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground mt-2">Loading pull request…</p>
      </div>
    );
  }

  const state = details?.state ?? "open";
  const merged = !!details?.merged_at;
  const requested = details?.requested_reviewers ?? [];

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">
            #{pullNumber} {details?.title || "Pull request"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            by {details?.user?.login || "unknown"} · {details?.created_at ? formatRelativeTime(details.created_at) : ""}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={merged ? "info" : state === "open" ? "success" : "destructive"} className="text-[10px]">
              {merged ? "Merged" : state === "open" ? "Open" : "Closed"}
            </Badge>
            {!!details?.additions && (
              <span className="text-xs text-muted-foreground">
                <span className="text-emerald-500">+{details.additions}</span>{" "}
                <span className="text-red-500">−{details.deletions}</span> ·{" "}
                {details.changed_files} files
              </span>
            )}
            {requested.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Review requested from {requested.map((r: any) => r.login).join(", ")}
              </span>
            )}
          </div>
        </div>
        {isStartup && (
          <div className="flex items-center gap-2 shrink-0">
            {!merged && state === "open" && (
              <>
                <Button size="sm" variant="gradient" disabled={!!acting} onClick={() => handleAction("merge")}>
                  {acting === "merge" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5 mr-1" />}
                  Merge
                </Button>
                <Button size="sm" variant="outline" disabled={!!acting} onClick={() => handleAction("close")}>
                  {acting === "close" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Close"}
                </Button>
              </>
            )}
            {!merged && state === "closed" && (
              <Button size="sm" variant="outline" disabled={!!acting} onClick={() => handleAction("reopen")}>
                {acting === "reopen" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Reopen"}
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 mb-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {details?.body && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4 line-clamp-6">{details.body}</p>
      )}

      <Tabs defaultValue="conversation">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="conversation">
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            Conversation ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="files">
            <FileDiff className="mr-1.5 h-3.5 w-3.5" />
            Files ({files.length})
          </TabsTrigger>
          <TabsTrigger value="commits">
            <GitCommitHorizontal className="mr-1.5 h-3.5 w-3.5" />
            Commits ({commits.length})
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Reviews ({reviews.length})
          </TabsTrigger>
          <TabsTrigger value="diff">Diff ({inline.length} inline)</TabsTrigger>
        </TabsList>

        <TabsContent value="conversation">
          <div className="space-y-3 mb-4">
            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Start the review.</p>
            )}
            {comments.map((c: any) => (
              <div key={c.id} className="rounded-lg border border-border/60 bg-background p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">{c.user?.login}</span>
                  <span className="text-[11px] text-muted-foreground">{c.created_at ? formatRelativeTime(c.created_at) : ""}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a review comment…"
              className="min-h-10"
            />
            <Button variant="gradient" size="sm" onClick={handleComment} disabled={posting || !comment.trim()} className="shrink-0">
              {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Comment"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="files">
          <div className="space-y-2">
            {files.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No files returned.</p>
            )}
            {files.map((f: any) => (
              <div key={f.sha || f.filename} className="rounded-lg border border-border/60 bg-background p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-mono font-medium truncate">{f.filename}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{f.status}</Badge>
                    <span className="text-[11px] text-muted-foreground">
                      <span className="text-emerald-500">+{f.additions}</span>{" "}
                      <span className="text-red-500">−{f.deletions}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="commits">
          <div className="space-y-2">
            {commits.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No commits returned.</p>
            )}
            {commits.map((c: any) => (
              <div key={c.sha} className="rounded-lg border border-border/60 bg-background p-3">
                <p className="text-sm font-medium truncate">{c.commit?.message?.split("\n")[0]}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {c.commit?.author?.name} · {c.sha?.slice(0, 7)}
                </p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          {/* Submit a review */}
          <div className="rounded-lg border border-border/60 bg-background p-4 mb-4">
            <h4 className="text-sm font-medium mb-2">Submit a review</h4>
            <Textarea
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              placeholder={isStartup ? "Review summary (required to request changes)…" : "Leave review feedback…"}
              className="min-h-10 mb-3"
            />
            <div className="flex gap-2 flex-wrap">
              {isStartup && (
                <>
                  <Button
                    size="sm"
                    variant="gradient"
                    disabled={!!reviewing}
                    onClick={() => handleReview("APPROVE")}
                  >
                    {reviewing === "APPROVE" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!reviewing || !reviewBody.trim()}
                    onClick={() => handleReview("REQUEST_CHANGES")}
                  >
                    {reviewing === "REQUEST_CHANGES" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Request changes"}
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={!!reviewing || !reviewBody.trim()}
                onClick={() => handleReview("COMMENT")}
              >
                {reviewing === "COMMENT" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Comment review"}
              </Button>
            </div>
            {!isStartup && (
              <p className="text-[11px] text-muted-foreground mt-2">Approve / request-changes are limited to the challenge owner.</p>
            )}
          </div>

          {/* Request reviewers */}
          {isStartup && (
            <div className="rounded-lg border border-border/60 bg-background p-4 mb-4">
              <h4 className="text-sm font-medium mb-2">Request reviewers</h4>
              <div className="flex gap-2">
                <Input
                  value={requestNames}
                  onChange={(e) => setRequestNames(e.target.value)}
                  placeholder="github-usernames, comma-separated"
                  className="h-9"
                />
                <Button size="sm" variant="outline" onClick={handleRequestReviewers} disabled={requesting || !requestNames.trim()} className="shrink-0">
                  {requesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Request"}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {reviews.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No reviews yet.</p>
            )}
            {reviews.map((r: any) => (
              <div key={r.id} className="rounded-lg border border-border/60 bg-background p-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span className="text-xs font-medium">{r.user?.login}</span>
                  <Badge variant="secondary" className="text-[10px]">{r.state}</Badge>
                  <span className="text-[11px] text-muted-foreground">{r.submitted_at ? formatDate(r.submitted_at) : ""}</span>
                </div>
                {r.body && <p className="text-sm whitespace-pre-wrap">{r.body}</p>}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="diff">
          {parsedFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Diff unavailable.</p>
          ) : (
            <div className="space-y-4">
              {parsedFiles.map((f) => (
                <DiffFileView
                  key={f.path}
                  file={f}
                  threads={inlineThreads}
                  headSha={headSha}
                  prId={id}
                  onPosted={refreshInline}
                  onError={setError}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DiffFileView({
  file,
  threads,
  headSha,
  prId,
  onPosted,
  onError,
}: {
  file: ParsedFile;
  threads: Map<string, any[]>;
  headSha?: string;
  prId: PrIdentifier;
  onPosted: () => void;
  onError: (msg: string) => void;
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
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <span className="text-xs font-mono font-medium">{file.path}</span>
      </div>
      <div className="overflow-x-auto">
        {file.hunks.map((hunk, hi) => (
          <div key={hi}>
            <div className="px-3 py-1 text-[11px] font-mono bg-primary/10 text-primary whitespace-pre">{hunk.header}</div>
            {hunk.lines.slice(1).map((line, li) => {
              const key = line.type === "add" || line.type === "del" || line.type === "context"
                ? threadKey(
                    file.path,
                    line.type === "del" ? line.oldNo : line.newNo,
                    line.type === "del" ? "LEFT" : "RIGHT"
                  )
                : null;
              const lineThreads = key ? threads.get(key) ?? [] : [];
              const composerOpen =
                composer &&
                key === threadKey(file.path, composer.line, composer.side);

              return (
                <div key={li}>
                  <div
                    className={cn(
                      "grid grid-cols-[3.5rem_3.5rem_1fr] text-[11px] font-mono leading-5",
                      line.type === "add" && "bg-emerald-500/10",
                      line.type === "del" && "bg-red-500/10"
                    )}
                  >
                    <button
                      type="button"
                      disabled={line.oldNo == null}
                      onClick={() => openComposer(line.oldNo, "LEFT")}
                      title={line.oldNo != null ? "Comment on this line" : undefined}
                      className={cn(
                        "text-right pr-2 select-none border-r border-border/40",
                        line.oldNo != null ? "text-muted-foreground hover:text-primary hover:bg-primary/10" : "text-transparent"
                      )}
                    >
                      {line.oldNo ?? ""}
                    </button>
                    <button
                      type="button"
                      disabled={line.newNo == null}
                      onClick={() => openComposer(line.newNo, "RIGHT")}
                      title={line.newNo != null ? "Comment on this line" : undefined}
                      className={cn(
                        "text-right pr-2 select-none border-r border-border/40",
                        line.newNo != null ? "text-muted-foreground hover:text-primary hover:bg-primary/10" : "text-transparent"
                      )}
                    >
                      {line.newNo ?? ""}
                    </button>
                    <span className={cn(
                      "pl-2 pr-2 whitespace-pre",
                      line.type === "add" && "text-emerald-600 dark:text-emerald-400",
                      line.type === "del" && "text-red-600 dark:text-red-400"
                    )}>
                      {line.text}
                    </span>
                  </div>

                  {lineThreads.map((t: any) => (
                    <div key={t.id} className="ml-4 mr-2 my-1 rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium">{t.user?.login}</span>
                        <span className="text-[10px] text-muted-foreground">{t.created_at ? formatRelativeTime(t.created_at) : ""}</span>
                      </div>
                      <p className="text-xs whitespace-pre-wrap mt-0.5">{t.body}</p>
                      {t.replies?.map((r: any) => (
                        <div key={r.id} className="ml-3 mt-1.5 pl-2 border-l border-border/60">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium">{r.user?.login}</span>
                            <span className="text-[10px] text-muted-foreground">{r.created_at ? formatRelativeTime(r.created_at) : ""}</span>
                          </div>
                          <p className="text-xs whitespace-pre-wrap mt-0.5">{r.body}</p>
                        </div>
                      ))}
                      {replyTo === t.id ? (
                        <div className="flex gap-1.5 mt-1.5">
                          <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply…" className="min-h-8 text-xs" />
                          <Button size="sm" variant="outline" disabled={replying || !replyText.trim()} onClick={() => postReply(t.id)} className="shrink-0 h-8">
                            {replying ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reply"}
                          </Button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { setReplyTo(t.id); setReplyText(""); }} className="text-[11px] text-primary hover:underline mt-1">
                          Reply
                        </button>
                      )}
                    </div>
                  ))}

                  {composerOpen && composer && (
                    <div className="ml-4 mr-2 my-1 rounded-md border border-primary/30 bg-primary/5 p-2">
                      <p className="text-[11px] text-muted-foreground mb-1.5">
                        Commenting on {file.path}:{composer.line} ({composer.side})
                      </p>
                      <div className="flex gap-1.5">
                        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Leave an inline comment…" className="min-h-8 text-xs" />
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button size="sm" variant="gradient" disabled={sending || !text.trim()} onClick={postLineComment} className="h-8">
                            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setComposer(null)} className="h-8">✕</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
