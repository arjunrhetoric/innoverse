"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  GitPullRequest,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";

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
    const counts = new Map<string, { label: string; count: number }>();
    for (const t of talent) {
      for (const s of t.skills) {
        const key = s.trim().toLowerCase();
        if (!key) continue;
        const entry = counts.get(key) ?? { label: s.trim(), count: 0 };
        entry.count += 1;
        counts.set(key, entry);
      }
    }
    return [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((entry) => entry.label);
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

  const hasFilters = Boolean(query.trim() || skill);
  const clearFilters = () => {
    setQuery("");
    setSkill(null);
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto w-full max-w-[1160px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <PageHeader
          eyebrow={
            <span className="font-mono text-2xs uppercase tracking-[0.18em] text-subtle-foreground">
              For hiring teams
            </span>
          }
          title="Talent with receipts"
          description="Every profile is built from verified GitHub contributions and startup-signed Proof-of-Work Reports. Open a report and audit the evidence yourself."
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/verify">
                <ShieldCheck />
                Verify a code
              </Link>
            </Button>
          }
        />

        {/* Search */}
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <Field
            id="talent-search"
            label="Search talent"
            hint="Name, skill or GitHub handle"
            className="w-full lg:max-w-sm"
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle-foreground"
                aria-hidden
              />
              <Input
                id="talent-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search talent…"
                className="pl-9"
              />
            </div>
          </Field>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-2xs uppercase tracking-[0.08em] text-subtle-foreground">
              Skill
            </span>
            {skills.map((s) => {
              const active = skill === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSkill(active ? null : s)}
                  className={`cursor-pointer rounded-full border px-2.5 py-1 font-mono text-2xs transition-colors ${
                    active
                      ? "border-brand/30 bg-brand-subtle text-brand"
                      : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              );
            })}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-foreground">Public profiles</h2>
          {!loading && (
            <p className="tnum font-mono text-2xs text-muted-foreground">
              {filtered.length} of {talent.length}
            </p>
          )}
        </div>

        {loading ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <SkeletonRows rows={6} />
          </div>
        ) : talent.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No public profiles yet"
            description="Students appear here once they publish a profile and a startup has issued their first report."
            action={{ label: "Explore challenges", href: "/explore" }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No profiles match that search"
            description="Try a different name or GitHub handle, or clear the skill filter."
            action={{ label: "Clear filters", onClick: clearFilters }}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <ul className="divide-y divide-border">
              {filtered.map((t) => {
                const latest = t.reports.find((r) => r.token);
                return (
                  <li
                    key={t.id}
                    className="relative flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-6"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/talent/${t.id}`}
                          className="text-sm font-medium text-foreground underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline"
                        >
                          {t.name}
                        </Link>
                        {t.githubUsername && (
                          <span className="font-mono text-2xs text-subtle-foreground">
                            @{t.githubUsername}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {t.headline || "Student developer"}
                        {t.location && (
                          <>
                            <span aria-hidden className="mx-1.5 text-subtle-foreground">·</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" aria-hidden />
                              {t.location}
                            </span>
                          </>
                        )}
                      </p>
                      {t.skills.length > 0 && (
                        <p className="mt-1.5 truncate font-mono text-2xs text-subtle-foreground">
                          {t.skills.slice(0, 6).join(" · ")}
                        </p>
                      )}
                    </div>

                    <div className="grid shrink-0 grid-cols-4 gap-4 sm:gap-6">
                      <div>
                        <p className="text-2xs uppercase tracking-[0.08em] text-subtle-foreground">
                          Confidence
                        </p>
                        <p className="tnum text-sm font-medium text-foreground">
                          {t.avgConfidence != null ? `${t.avgConfidence}/100` : <span className="text-2xs font-normal text-subtle-foreground">Not scored</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-2xs uppercase tracking-[0.08em] text-subtle-foreground">
                          Rubric
                        </p>
                        <p className="tnum text-sm font-medium text-foreground">
                          {t.avgRubric != null ? `${t.avgRubric.toFixed(1)}/5` : <span className="text-2xs font-normal text-subtle-foreground">Not scored</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-2xs uppercase tracking-[0.08em] text-subtle-foreground">
                          Reports
                        </p>
                        <p className="tnum text-sm font-medium text-foreground">
                          {t.reportCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-2xs uppercase tracking-[0.08em] text-subtle-foreground">
                          Merged PRs
                        </p>
                        <p className="flex items-center gap-1 text-sm font-medium text-foreground">
                          <GitPullRequest className="h-3 w-3 text-subtle-foreground" aria-hidden />
                          <span className="tnum">{t.mergedPRs}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                      {latest?.token && (
                        <Link
                          href={`/r/${latest.token}`}
                          className="relative z-10 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-2xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                        >
                          <FileText className="h-3 w-3" aria-hidden />
                          Latest report
                        </Link>
                      )}
                      <ChevronRight className="h-4 w-4 text-subtle-foreground" aria-hidden />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <ShieldCheck className="h-4 w-4 shrink-0 text-brand" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Confidence and rubric scores come from the startup review, not from self-reported skills.
          </p>
          <Button variant="ghost" size="sm" className="ml-auto" asChild>
            <Link href="/explore">
              See open challenges
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
      <Footer />
    </main>
  );
}
