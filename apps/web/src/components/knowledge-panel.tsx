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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Entry {
  id: string;
  type: "qa" | "review";
  question: string | null;
  pullNumber: number | null;
  answer: string;
  sources: string[];
  payload: any;
  createdAt: string;
}

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
  block: { icon: ShieldX, label: "Do not merge", variant: "destructive" as const },
};

export function KnowledgePanel({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [prNumber, setPrNumber] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [error, setError] = useState("");

  const load = () =>
    fetch(`/api/knowledge/${projectId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const ask = async () => {
    setAsking(true);
    setError("");
    try {
      const res = await fetch(`/api/knowledge/${projectId}/ask`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not answer that");
      setQuestion("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not answer that");
    } finally {
      setAsking(false);
    }
  };

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
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Repository knowledge base</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Ask about the codebase or get a merge-safety assessment of a pull request. Answers are
          grounded in repository files and saved here for the team.
        </p>

        <div className="mt-4 flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Where is authentication enforced? What does the ingest pipeline do?"
            className="h-10"
          />
          <Button
            variant="gradient"
            size="sm"
            disabled={asking || question.trim().length < 5}
            onClick={ask}
            className="shrink-0"
          >
            {asking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border/60 pt-4">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-muted-foreground">
              Pull request number for a safety review
            </label>
            <Input
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 12"
              inputMode="numeric"
              className="h-10 max-w-40"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={reviewing || !prNumber}
            onClick={reviewPr}
          >
            {reviewing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1 h-3.5 w-3.5" />}
            Assess PR
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {review && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">PR #{prNumber} assessment</h3>
            <Badge variant={verdictMeta[review.verdict].variant} className="text-[10px]">
              {verdictMeta[review.verdict].label}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.summary}</p>

          {review.risks.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-medium">Risks</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {review.risks.map((risk, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span
                      className={
                        risk.severity === "high"
                          ? "text-red-500"
                          : risk.severity === "medium"
                            ? "text-amber-500"
                            : "text-blue-500"
                      }
                    >
                      ●
                    </span>
                    <span>
                      {risk.file ? `${risk.file}: ` : ""}
                      {risk.issue}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.checklist.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-medium">Before merging</p>
              <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                {review.checklist.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium">Knowledge history</h3>
        {loading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No questions yet. Ask something above.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  {entry.type === "qa" ? (
                    <Badge variant="secondary" className="text-[10px]">Question</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      PR #{entry.pullNumber} review
                    </Badge>
                  )}
                  <span>{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                {entry.question && (
                  <p className="mt-1.5 text-sm font-medium">{entry.question}</p>
                )}
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                  {entry.answer}
                </p>
                {entry.sources.length > 0 && (
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground/70">
                    sources: {entry.sources.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
