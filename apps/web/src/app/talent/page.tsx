"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, MapPin, GitPullRequest, ShieldCheck, Star, Users } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface Talent {
  id: string;
  name: string;
  headline: string | null;
  skills: string[];
  location: string | null;
  githubUsername: string | null;
  projectsCompleted: number;
  reportCount: number;
  avgConfidence: number | null;
  avgRubric: number | null;
  mergedPRs: number;
  reports: Array<{ token: string | null; project: string | null; issuedAt: string }>;
}

export default function TalentPage() {
  const [talent, setTalent] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/talent")
      .then((res) => res.json())
      .then((data) => setTalent(data.talent ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const skills = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of talent) for (const s of t.skills) counts.set(s, (counts.get(s) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s]) => s);
  }, [talent]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return talent.filter((t) => {
      if (skill && !t.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.headline ?? "").toLowerCase().includes(q) ||
        (t.githubUsername ?? "").toLowerCase().includes(q) ||
        t.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [talent, query, skill]);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              For hiring teams
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
              Talent with receipts
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Every profile below is built from verified GitHub contributions and startup-signed
              Proof-of-Work Reports. Open a report and audit the evidence yourself.
            </p>
          </motion.div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, skill, or GitHub handle"
                className="h-10 pl-9"
              />
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSkill(skill === s ? null : s)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                      skill === s
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/25"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-44 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-10 rounded-lg border border-dashed border-border py-16 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {talent.length === 0
                  ? "No students have published a profile yet."
                  : "No profiles match that search."}
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    href={`/talent/${t.id}`}
                    className="group flex h-full flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/25"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-medium">{t.name}</h3>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {t.headline || (t.githubUsername ? `@${t.githubUsername}` : "Student developer")}
                        </p>
                      </div>
                      {t.avgConfidence != null && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {t.avgConfidence}/100
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.skills.slice(0, 4).map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-primary" />
                        {t.reportCount} report{t.reportCount === 1 ? "" : "s"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GitPullRequest className="h-3 w-3" />
                        {t.mergedPRs} merged
                      </span>
                      {t.avgRubric != null && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-500" />
                          {t.avgRubric.toFixed(1)}/5
                        </span>
                      )}
                      {t.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {t.location}
                        </span>
                      )}
                    </div>
                  </Link>
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
