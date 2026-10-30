"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Send,
  Search,
  FileCode2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  type: "qa" | "review";
  question: string | null;
  pullNumber: number | null;
  answer: string;
  sources: string[];
  payload: unknown;
  createdAt: string;
  model: string | null;
}

interface StoredReview {
  verdict: "safe" | "caution" | "block";
  summary: string;
  risks: Array<{ severity: string; file?: string; issue: string }>;
  checklist: string[];
  title?: string;
  pullNumber?: number;
}

function asStoredReview(value: unknown): StoredReview | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!["safe", "caution", "block"].includes(String(candidate.verdict))) return null;
  if (typeof candidate.summary !== "string") return null;
  const risks = Array.isArray(candidate.risks)
    ? candidate.risks
        .filter((risk): risk is Record<string, unknown> => Boolean(risk) && typeof risk === "object")
        .map((risk) => ({
          severity: ["low", "medium", "high"].includes(String(risk.severity))
            ? String(risk.severity)
            : "medium",
          file: typeof risk.file === "string" ? risk.file : undefined,
          issue: typeof risk.issue === "string" ? risk.issue : String(risk.issue ?? ""),
        }))
        .filter((risk) => risk.issue.length > 0)
    : [];

  return {
    verdict: candidate.verdict as StoredReview["verdict"],
    summary: candidate.summary,
    risks,
    checklist: Array.isArray(candidate.checklist)
      ? candidate.checklist.filter((item): item is string => typeof item === "string")
      : [],
    title: typeof candidate.title === "string" ? candidate.title : undefined,
    pullNumber:
      typeof candidate.pullNumber === "number" ? candidate.pullNumber : undefined,
  };
}

const SUGGESTIONS = [
  "Where is authentication enforced?",
  "Trace the main request flow end to end.",
  "What should a new contributor read first?",
  "Which files carry the highest regression risk?",
];

interface ReviewResult {
  verdict: "safe" | "caution" | "block";
  summary: string;
  risks: Array<{ severity: string; file?: string; issue: string }>;
  checklist: string[];
  files: string[];
}

const verdictMeta = {
  safe: { icon: ShieldCheck, label: "Safe to merge", variant: "success" as const },
  caution: { icon: ShieldAlert, label: "Needs review", variant: "warning" as const },
  block: { icon: ShieldX, label: "Do not merge", variant: "danger" as const },
};

const severityTone = (severity: string) =>
  severity === "high"
    ? { dot: "bg-danger", text: "text-danger" }
    : severity === "medium"
      ? { dot: "bg-warning", text: "text-warning" }
      : { dot: "bg-info", text: "text-info" };

export function KnowledgePanel({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [prNumber, setPrNumber] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [error, setError] = useState("");
  const [repo, setRepo] = useState("");
  const [grounding, setGrounding] = useState<{
    files: number;
    note: string | null;
  } | null>(null);

  const load = () =>
    fetch(`/api/knowledge/${projectId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.entries ?? []);
        setRepo(data.repo ?? "");
      })
      .catch(() => null)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const ask = async (text?: string) => {
    const value = (text ?? question).trim();
    if (value.length < 5 || asking) return;
    setQuestion(value);
    setAsking(true);
    setError("");
    try {
      const res = await fetch(`/api/knowledge/${projectId}/ask`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not answer that");
      setGrounding({
        files: Array.isArray(data.files) ? data.files.length : 0,
        note: typeof data.note === "string" ? data.note : null,
      });
      setQuestion("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not answer that");
    } finally {
      setAsking(false);
    }
  };

  const sourceHref = (path: string) =>
    repo
      ? `https://github.com/${repo}/blob/HEAD/${path
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`
      : null;

  const reviewPr = async () => {
    setReviewing(true);
    setError("");
    setReview(null);
    try {
      const res = await fetch(`/api/knowledge/${projectId}/review`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pullNumber: Number(prNumber) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not review that PR");
      setReview(data);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not review that PR");
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Section
        title="Repository knowledge"
        description="Ask about the codebase, or get a merge-safety assessment of a pull request. Answers are grounded in repository files and saved to the project."
        actions={
          repo ? (
            <Badge variant="outline" className="max-w-full truncate font-mono">
              {repo}
            </Badge>
          ) : undefined
        }
      >
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          {/* Ask */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!asking && question.trim().length >= 5) ask();
            }}
            className="space-y-2"
          >
            <Field
              id="knowledge-question"
              label="Ask a question"
              hint="At least 5 characters"
            >
              <div className="flex gap-2">
                <Input
                  id="knowledge-question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Where is authentication enforced?"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 shrink-0"
                  disabled={asking || question.trim().length < 5}
                >
                  {asking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Ask
                </Button>
              </div>
            </Field>
            <p className="text-2xs leading-relaxed text-subtle-foreground">
              Answers cite the files they were drawn from. Nothing is sent to the repository.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  disabled={asking}
                  className="cursor-pointer rounded-full border border-border bg-surface px-2.5 py-1 text-2xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </form>

          {/* PR safety review */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!reviewing && prNumber) reviewPr();
            }}
            className="space-y-2 lg:border-l lg:border-border lg:pl-5"
          >
            <Field
              id="knowledge-pr"
              label="Assess a pull request"
              hint="Merge safety"
            >
              <div className="flex gap-2">
                <Input
                  id="knowledge-pr"
                  value={prNumber}
                  onChange={(e) => setPrNumber(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="PR number, e.g. 12"
                  inputMode="numeric"
                  autoComplete="off"
                  className="min-w-0 flex-1"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  disabled={reviewing || !prNumber}
                >
                  {reviewing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  Assess
                </Button>
              </div>
            </Field>
            <p className="text-2xs leading-relaxed text-subtle-foreground">
              Produces a verdict, the risks found, and a checklist to clear before merging.
            </p>
          </form>
        </div>
        {grounding && (
          <p className="flex items-start gap-1.5 border-t border-border px-5 py-3 text-2xs leading-relaxed text-subtle-foreground">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            <span>
              Grounded in <span className="font-mono text-foreground">{grounding.files}</span>{" "}
              repository {grounding.files === 1 ? "file" : "files"}
              {grounding.note ? ` · ${grounding.note}` : ""}
            </span>
          </p>
        )}
      </Section>

      <FormError>{error}</FormError>

      {review && (
        <Section
          title={`PR #${prNumber} assessment`}
          actions={
            <>
              <Badge variant={verdictMeta[review.verdict].variant} className="gap-1">
                {(() => {
                  const Icon = verdictMeta[review.verdict].icon;
                  return <Icon className="h-3 w-3" />;
                })()}
                {verdictMeta[review.verdict].label}
              </Badge>
              <CopyButton value={review.summary} label="Copy summary" />
            </>
          }
        >
          <div className="space-y-4 p-5">
            <p className="text-sm leading-relaxed text-foreground/90">{review.summary}</p>
            {review.files.length > 0 && (
              <p className="flex flex-wrap items-center gap-1.5 font-mono text-2xs text-subtle-foreground">
                <FileCode2 className="h-3 w-3" aria-hidden />
                Reviewed {review.files.length}{" "}
                {review.files.length === 1 ? "file" : "files"}
              </p>
            )}

            {review.risks.length > 0 && (
              <div>
                <h3 className="text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground">
                  Risks
                </h3>
                <ul className="mt-2 space-y-2">
                  {review.risks.map((risk, i) => {
                    const tone = severityTone(risk.severity);
                    return (
                      <li key={i} className="flex gap-2 text-xs leading-relaxed">
                        <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", tone.dot)} />
                        <span className="min-w-0 text-muted-foreground">
                          <span className={cn("font-mono text-2xs uppercase", tone.text)}>
                            {risk.severity}
                          </span>
                          {risk.file && (
                            <span className="ml-2 font-mono text-foreground">{risk.file}</span>
                          )}
                          <span className="mt-0.5 block text-foreground/90">{risk.issue}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {review.checklist.length > 0 && (
              <div className="border-t border-border pt-3">
                <h3 className="text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground">
                  Before merging
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {review.checklist.map((item, i) => (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                      <span aria-hidden className="font-mono text-subtle-foreground">
                        {i + 1}.
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-md font-semibold tracking-tight text-foreground">Knowledge history</h2>
          {!loading && (
            <span className="tnum font-mono text-2xs text-subtle-foreground">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </header>

        {loading ? (
          <div className="divide-y divide-border" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2 px-5 py-4">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            inset={false}
            icon={Brain}
            title="No knowledge entries yet"
            description="Ask the first question above. Answers and PR assessments are kept here for the whole team."
            className="py-10"
          />
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => {
              const stored = entry.type === "review" ? asStoredReview(entry.payload) : null;
              const prHref =
                repo && entry.pullNumber
                  ? `https://github.com/${repo}/pull/${entry.pullNumber}/files`
                  : null;
              return (
                <li key={entry.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.type === "qa" ? (
                      <Badge variant="brand">Question</Badge>
                    ) : (
                      <>
                        {stored && (
                          <Badge
                            variant={verdictMeta[stored.verdict].variant}
                            className="gap-1"
                          >
                            {(() => {
                              const Icon = verdictMeta[stored.verdict].icon;
                              return <Icon className="h-3 w-3" />;
                            })()}
                            {verdictMeta[stored.verdict].label}
                          </Badge>
                        )}
                        <Badge variant="info" className="font-mono">
                          PR #{entry.pullNumber ?? stored?.pullNumber ?? "?"}
                        </Badge>
                      </>
                    )}
                    <span className="font-mono text-2xs text-subtle-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {entry.question && (
                    <p className="mt-2 text-sm font-medium text-foreground">{entry.question}</p>
                  )}
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {entry.answer}
                  </p>

                  {stored && (stored.risks.length > 0 || stored.checklist.length > 0) && (
                    <details className="mt-2 rounded-md border border-border bg-surface px-3 py-2">
                      <summary className="cursor-pointer text-2xs font-medium text-muted-foreground hover:text-foreground">
                        {stored.risks.length} {stored.risks.length === 1 ? "risk" : "risks"} ·{" "}
                        {stored.checklist.length}{" "}
                        {stored.checklist.length === 1 ? "check" : "checks"}
                      </summary>
                      <div className="mt-2 space-y-2">
                        {stored.risks.length > 0 && (
                          <ul className="space-y-1.5">
                            {stored.risks.map((risk, i) => {
                              const tone = severityTone(risk.severity);
                              return (
                                <li key={i} className="flex gap-2 text-xs leading-relaxed">
                                  <span
                                    className={cn(
                                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                                      tone.dot
                                    )}
                                  />
                                  <span className="min-w-0 text-muted-foreground">
                                    <span
                                      className={cn(
                                        "font-mono text-2xs uppercase",
                                        tone.text
                                      )}
                                    >
                                      {risk.severity}
                                    </span>
                                    {risk.file && (
                                      <span className="ml-2 font-mono text-foreground">
                                        {risk.file}
                                      </span>
                                    )}
                                    <span className="mt-0.5 block text-foreground/90">
                                      {risk.issue}
                                    </span>
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {stored.checklist.length > 0 && (
                          <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
                            {stored.checklist.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </details>
                  )}

                  {entry.sources.length > 0 && (
                    <p className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-2xs text-subtle-foreground">
                      <FileCode2 className="h-3 w-3" aria-hidden />
                      {entry.sources.slice(0, 6).map((source, i) => {
                        const href = entry.type === "review" ? prHref : sourceHref(source);
                        return (
                          <span key={source}>
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 hover:text-foreground hover:underline"
                              >
                                {source}
                                <ExternalLink className="h-2.5 w-2.5" aria-hidden />
                              </a>
                            ) : (
                              source
                            )}
                            {i < Math.min(entry.sources.length, 6) - 1 ? " · " : ""}
                          </span>
                        );
                      })}
                      {entry.sources.length > 6 && ` +${entry.sources.length - 6}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
