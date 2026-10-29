"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bookmark,
  Check,
  ExternalLink,
  MapPin,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Meta } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmAction } from "@/components/ui/confirm-dialog";
import { useUser } from "@/hooks/useUser";

interface Entry {
  id: string;
  note: string;
  createdAt: string;
  student: {
    id: string;
    name: string;
    headline: string | null;
    skills: string[];
    location: string | null;
    githubUsername: string | null;
  };
  reportCount: number;
  avgConfidence: number | null;
  latestReportToken: string | null;
}

export default function ShortlistPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Entry | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!authLoading && user?.role !== "Startup") {
      router.push("/dashboard");
    }
  }, [authLoading, isAuthenticated, user, router]);

  const load = () =>
    fetch("/api/shortlist", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load shortlist");
        setEntries(data.shortlist ?? []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (isAuthenticated && user?.role === "Startup") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const remove = async (studentId: string) => {
    setError("");
    setRemoving(true);
    try {
      const res = await fetch(`/api/shortlist/${studentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not remove");
      setEntries((prev) => prev.filter((e) => e.student.id !== studentId));
      setRemoveTarget(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not remove");
    } finally {
      setRemoving(false);
    }
  };

  const saveNote = async (studentId: string) => {
    setError("");
    setSavingNote(true);
    try {
      const res = await fetch("/api/shortlist", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, note: noteValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save the note");
      setEntries((prev) =>
        prev.map((entry) =>
          entry.student.id === studentId ? { ...entry, note: noteValue } : entry
        )
      );
      setEditingNote(null);
      setNoteValue("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save the note");
    } finally {
      setSavingNote(false);
    }
  };

  const startEditing = (entry: Entry) => {
    setEditingNote(entry.student.id);
    setNoteValue(entry.note ?? "");
  };

  const busy = authLoading || loading;

  return (
    <AppShell>
      <div className="px-4 pb-16 pt-24 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <PageHeader
            eyebrow={
              <span className="inline-flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                <Bookmark className="h-3.5 w-3.5" />
                Hiring pipeline
              </span>
            }
            title="Shortlist"
            description="Your hiring pipeline: candidates you verified and may want to revisit for a role."
            meta={
              !busy && entries.length > 0 ? (
                <Meta label="Saved" value={entries.length} />
              ) : undefined
            }
          />

          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle p-4"
            >
              <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {busy ? (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-2 border-b border-border px-4 py-4 last:border-0">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="Nothing shortlisted yet"
              description="Shortlist a certified candidate to keep their report, scores and your notes in one place while you hire."
              action={{ label: "Browse candidates", href: "/candidates" }}
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {entries.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/talent/${entry.student.id}`}
                        className="truncate text-md font-medium text-foreground hover:text-brand hover:underline"
                      >
                        {entry.student.name}
                      </Link>
                      <Badge variant="default" className="gap-1">
                        <span className="text-subtle-foreground">confidence</span>
                        <span className="tnum font-mono text-foreground">
                          {entry.avgConfidence != null ? `${entry.avgConfidence}/100` : "—"}
                        </span>
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="tnum font-mono text-foreground">
                          {entry.reportCount}
                        </span>
                        {entry.reportCount === 1 ? "report" : "reports"}
                      </span>
                    </div>

                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {entry.student.headline || "Student developer"}
                      {entry.student.githubUsername ? (
                        <>
                          {" · "}
                          <span className="font-mono">@{entry.student.githubUsername}</span>
                        </>
                      ) : null}
                      {entry.student.location ? (
                        <>
                          {" · "}
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {entry.student.location}
                          </span>
                        </>
                      ) : null}
                    </p>

                    {entry.student.skills.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {entry.student.skills.slice(0, 5).map((s) => (
                          <Badge key={s} variant="outline">
                            {s}
                          </Badge>
                        ))}
                        {entry.student.skills.length > 5 && (
                          <span className="self-center font-mono text-2xs text-subtle-foreground">
                            +{entry.student.skills.length - 5}
                          </span>
                        )}
                      </div>
                    )}

                    {editingNote === entry.student.id ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Input
                          value={noteValue}
                          onChange={(e) => setNoteValue(e.target.value)}
                          placeholder="Role, conversation, next step…"
                          aria-label={`Note for ${entry.student.name}`}
                          className="h-8 min-w-0 flex-1 text-xs"
                          autoFocus
                        />
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={savingNote}
                            onClick={() => saveNote(entry.student.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Save
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Cancel note editing"
                            onClick={() => {
                              setEditingNote(null);
                              setNoteValue("");
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : entry.note ? (
                      <div className="mt-3 flex items-start gap-2">
                        <p className="min-w-0 flex-1 border-l-2 border-border pl-2.5 text-xs italic leading-relaxed text-muted-foreground">
                          {entry.note}
                        </p>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`Edit note for ${entry.student.name}`}
                          onClick={() => startEditing(entry)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 -ml-2 h-7 text-xs"
                        onClick={() => startEditing(entry)}
                      >
                        <Pencil className="h-3 w-3" />
                        Add a note
                      </Button>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                    {entry.latestReportToken && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/r/${entry.latestReportToken}`}>
                          Report
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-danger"
                      aria-label={`Remove ${entry.student.name} from shortlist`}
                      onClick={() => setRemoveTarget(entry)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmAction
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="Remove from shortlist"
        description={`${removeTarget?.student.name ?? "This candidate"} will be removed from your hiring pipeline along with your note. Their report stays public.`}
        confirmLabel="Remove"
        pending={removing}
        onConfirm={() => {
          if (removeTarget) remove(removeTarget.student.id);
        }}
      />

    </AppShell>
  );
}
