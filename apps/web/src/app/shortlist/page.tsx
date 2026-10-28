"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, ExternalLink, MapPin, Trash2, Users, Info, Pencil, Check } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
    try {
      const res = await fetch(`/api/shortlist/${studentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not remove");
      setEntries((prev) => prev.filter((e) => e.student.id !== studentId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not remove");
    }
  };

  const saveNote = async (studentId: string) => {
    setError("");
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
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="flex items-center gap-2 text-2xl font-medium tracking-tight sm:text-3xl">
              <Bookmark className="h-6 w-6 text-primary" />
              Shortlist
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Talent you are tracking for roles. Every candidate links to an auditable report.
            </p>
          </motion.div>

          {error && <p className="mt-6 text-sm text-destructive">{error}</p>}

          <div className="mt-5 flex gap-2 rounded-xl border border-border bg-card p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Your hiring pipeline</p>
              <p className="mt-0.5">
                Shortlisted students are candidates you have verified and may want to revisit for a
                role. Confidence and rubric scores come from their published reports; add a note to
                remember the role, the conversation, or the next step.
              </p>
            </div>
          </div>

          {authLoading || loading ? (
            <div className="mt-8 space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="mt-10 rounded-lg border border-dashed border-border py-16 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nobody shortlisted yet.</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/talent">Browse talent</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-8 space-y-3">
              {entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/talent/${entry.student.id}`}
                          className="text-sm font-medium hover:text-primary"
                        >
                          {entry.student.name}
                        </Link>
                        {entry.avgConfidence != null && (
                          <Badge variant="secondary" className="text-[10px]">
                            {entry.avgConfidence}/100
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {entry.student.headline || "Student developer"}
                        {entry.student.githubUsername ? ` · @${entry.student.githubUsername}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {entry.student.skills.slice(0, 5).map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                        {entry.student.location && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {entry.student.location}
                          </span>
                        )}
                      </div>

                      {editingNote === entry.student.id ? (
                        <div className="mt-3 flex gap-2">
                          <Input
                            value={noteValue}
                            onChange={(e) => setNoteValue(e.target.value)}
                            placeholder="Role, conversation, next step…"
                            className="h-8 text-xs"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 shrink-0"
                            onClick={() => saveNote(entry.student.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : entry.note ? (
                        <div className="mt-3 flex items-start gap-2 text-[11px] text-muted-foreground">
                          <span className="italic">“{entry.note}”</span>
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => {
                              setEditingNote(entry.student.id);
                              setNoteValue(entry.note);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="mt-3 text-[11px] text-primary hover:underline"
                          onClick={() => {
                            setEditingNote(entry.student.id);
                            setNoteValue("");
                          }}
                        >
                          + Add a note
                        </button>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {entry.latestReportToken && (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/r/${entry.latestReportToken}`}>
                            Report
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove(entry.student.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
