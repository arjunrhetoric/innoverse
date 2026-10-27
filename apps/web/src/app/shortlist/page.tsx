"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, ExternalLink, MapPin, Trash2, Users } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
