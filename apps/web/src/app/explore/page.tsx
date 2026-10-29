"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Compass,
  GitPullRequest,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

interface Challenge {
  id: string;
  title: string;
  description: string;
  skills: string[];
  deadline: string;
  startup: string;
  hasRepo: boolean;
}

interface ReportCard {
  token: string;
  issuedAt: string;
  confidence: { score: number; level: string } | null;
  rubricOverall: number | null;
  studentName: string;
  problemTitle: string;
}

export default function ExplorePage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [reports, setReports] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState<string | null>(null);
  const [repoOnly, setRepoOnly] = useState(false);

  useEffect(() => {
    fetch("/api/explore")
      .then((res) => res.json())
      .then((data) => {
        setChallenges(data.challenges ?? []);
        setReports(data.reports ?? []);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  /* The public feed only carries skills and repo linkage — filter on those. */
  const skills = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const c of challenges) {
      for (const s of c.skills) {
        const key = s.trim().toLowerCase();
        if (!key) continue;
        const entry = counts.get(key) ?? { label: s.trim(), count: 0 };
        entry.count += 1;
        counts.set(key, entry);
      }
    }
    return [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((entry) => entry.label);
  }, [challenges]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return challenges.filter((c) => {
      if (skill && !c.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) return false;
      if (repoOnly && !c.hasRepo) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.startup.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [challenges, query, skill, repoOnly]);

  const hasFilters = Boolean(query.trim() || skill || repoOnly);

  const clearFilters = () => {
    setQuery("");
    setSkill(null);
    setRepoOnly(false);
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto w-full max-w-[1160px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <PageHeader
          eyebrow={
            <span className="font-mono text-2xs uppercase tracking-[0.18em] text-subtle-foreground">
              Public · no account needed
            </span>
          }
          title="Explore real startup work"
          description="Open briefs from startups, plus published Proof-of-Work Reports you can audit line by line."
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/verify">
                <ShieldCheck />
                Verify a code
              </Link>
            </Button>
          }
        />

        {/* Search + filter chips */}
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <Field
            id="explore-search"
            label="Search challenges"
            hint="Title, company or skill"
            className="w-full lg:max-w-sm"
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle-foreground"
                aria-hidden
              />
              <Input
                id="explore-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search open briefs…"
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
            <button
              type="button"
              aria-pressed={repoOnly}
              onClick={() => setRepoOnly((v) => !v)}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-2xs transition-colors ${
                repoOnly
                  ? "border-brand/30 bg-brand-subtle text-brand"
                  : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
              }`}
            >
              <GitPullRequest className="h-3 w-3" aria-hidden />
              Has repo
            </button>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Challenge rows */}
        <section aria-labelledby="open-challenges" className="mb-12">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 id="open-challenges" className="text-sm font-medium text-foreground">
              Open challenges
            </h2>
            {!loading && (
              <p className="tnum font-mono text-2xs text-muted-foreground">
                {filtered.length} of {challenges.length}
              </p>
            )}
          </div>

          {loading ? (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <SkeletonRows rows={5} />
            </div>
          ) : challenges.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No open challenges yet"
              description="Startups post briefs here as soon as they are ready for students. Check back, or publish the first one."
              action={{ label: "Post a challenge", href: "/login" }}
              secondary={{ label: "Browse talent", href: "/talent" }}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No challenges match those filters"
              description="Widen the search or clear the skill filter to see every open brief."
              action={{ label: "Clear filters", onClick: clearFilters }}
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <ul className="divide-y divide-border">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/explore/${c.id}`}
                      className="group flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-6"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
                          {c.hasRepo && (
                            <Badge variant="outline" className="shrink-0 font-mono">
                              <GitPullRequest className="h-3 w-3" aria-hidden />
                              repo
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span className="font-mono">{c.startup}</span>
                          {c.skills.length > 0 && (
                            <>
                              <span aria-hidden className="text-subtle-foreground">
                                ·
                              </span>
                              <span className="truncate font-mono text-2xs text-subtle-foreground">
                                {c.skills.slice(0, 4).join(" · ")}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                        <span className="tnum font-mono text-xs text-muted-foreground">
                          {formatDate(c.deadline)}
                        </span>
                        <StatusBadge status="open" />
                        <ChevronRight
                          className="h-4 w-4 text-subtle-foreground transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Published reports */}
        <Section
          title="Published reports"
          description="Each report is generated from repository activity and signed by the startup that issued it."
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/verify">
                Verify by code
                <ArrowRight />
              </Link>
            </Button>
          }
        >
          {loading ? (
            <SkeletonRows rows={3} />
          ) : reports.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No reports published yet"
              description="Reports appear here the moment a startup issues one for completed work. You can also verify a code you were given."
              action={{ label: "Verify a credential", href: "/verify" }}
              inset={false}
            />
          ) : (
            <ul className="divide-y divide-border">
              {reports.map((r) => (
                <li key={r.token}>
                  <Link
                    href={`/r/${r.token}`}
                    className="group flex flex-col gap-2 px-5 py-3.5 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{r.problemTitle}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.studentName} ·{" "}
                        <span className="tnum font-mono">{formatDate(r.issuedAt)}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {r.confidence && (
                        <Badge variant="secondary" className="tnum">
                          {r.confidence.score}/100
                        </Badge>
                      )}
                      {r.rubricOverall != null && (
                        <Badge variant="outline" className="tnum">
                          {r.rubricOverall.toFixed(1)}/5
                        </Badge>
                      )}
                      <ChevronRight
                        className="h-4 w-4 text-subtle-foreground transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="mt-10 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <ShieldCheck className="h-4 w-4 shrink-0 text-brand" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Every report links back to the commits, pull requests and reviews it was built from.
          </p>
          <Button variant="ghost" size="sm" className="ml-auto" asChild>
            <Link href="/talent">See verified talent</Link>
          </Button>
        </div>
      </div>
      <Footer />
    </main>
  );
}
