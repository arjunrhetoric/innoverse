"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Calendar,
  GitBranch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const TABS = ["Discover", "Review", "Track"] as const;
type Tab = (typeof TABS)[number];

const CHALLENGES = [
  {
    title: "Realtime analytics dashboard",
    desc: "Stream product events into a live dashboard with charts and alerts.",
    skills: "react · node · postgres",
    due: "Mar 14",
    active: true,
  },
  {
    title: "AI support triage bot",
    desc: "Classify inbound tickets and draft replies with confidence scores.",
    skills: "python · openai · redis",
    due: "Mar 21",
    active: true,
  },
  {
    title: "Mobile onboarding flow",
    desc: "Rebuild first-run experience with progressive disclosure.",
    skills: "react-native · typescript",
    due: "Mar 28",
    active: true,
  },
  {
    title: "Billing usage exporter",
    desc: "Nightly CSV exports of metered usage for invoicing.",
    skills: "node · stripe · s3",
    due: "Apr 02",
    active: false,
  },
];

const PROPOSALS = [
  { title: "Realtime analytics dashboard", by: "Priya S.", status: "Pending" },
  { title: "AI support triage bot", by: "Arjun P.", status: "Pending" },
  { title: "Mobile onboarding flow", by: "Vikram S.", status: "Approved" },
];

const MILESTONES = [
  { title: "Event pipeline wired", done: true },
  { title: "Chart library integrated", done: true },
  { title: "Alerting rules engine", done: false },
  { title: "Load test + handoff", done: false },
];

function DiscoverPane() {
  return (
    <div>
      {CHALLENGES.map((c, i) => (
        <div
          key={c.title}
          className={`flex items-start gap-3 px-4 py-3 sm:px-5 ${
            i === CHALLENGES.length - 1 ? "" : "border-b border-border"
          }`}
        >
          <StatusDot status={c.active ? "active" : "default"} className="mt-1.5" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium tracking-tight text-foreground">
                {c.title}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 font-mono text-[11px]",
                  c.active
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : "text-muted-foreground"
                )}
              >
                {c.active ? "Active" : "Draft"}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{c.desc}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {c.skills} · due {c.due}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewPane() {
  return (
    <div>
      {PROPOSALS.map((p, i) => (
        <div
          key={p.title}
          className={`flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
            i === PROPOSALS.length - 1 ? "" : "border-b border-border"
          }`}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium tracking-tight text-foreground">
              {p.title}
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              By <span className="text-brand-bright">{p.by}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {p.status === "Pending" ? (
              <>
                <span className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </span>
                <span className="inline-flex h-7 items-center gap-1 rounded-md bg-destructive px-3 text-[13px] font-medium text-destructive-foreground">
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </span>
              </>
            ) : (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[11px] text-emerald-500"
              >
                Approved
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TrackPane() {
  return (
    <div className="px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <Progress value={50} className="h-1.5 flex-1" />
        <span className="font-mono text-[13px] text-foreground tabular-nums">50%</span>
      </div>
      <div className="mt-3">
        {MILESTONES.map((m, i) => (
          <div
            key={m.title}
            className={`flex items-center gap-2.5 py-2 ${
              i === MILESTONES.length - 1 ? "" : "border-b border-border/60"
            }`}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border",
                m.done
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border-border text-muted-foreground"
              )}
            >
              <CheckCircle2 className="h-3 w-3" />
            </span>
            <p
              className={cn(
                "text-sm",
                m.done ? "text-muted-foreground line-through" : "text-foreground"
              )}
            >
              {m.title}
            </p>
            <span className="ml-auto font-mono text-xs text-muted-foreground">m{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
        <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="truncate text-[13px] text-foreground">Add realtime dashboard</p>
        <Badge
          variant="outline"
          className="ml-auto shrink-0 border-emerald-500/30 bg-emerald-500/10 font-mono text-[11px] text-emerald-500"
        >
          Merged
        </Badge>
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" /> synced 12s ago · ci passing
      </p>
    </div>
  );
}

export function AppPreview() {
  const [tab, setTab] = useState<Tab>("Discover");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setTab((t) => TABS[(TABS.indexOf(t) + 1) % TABS.length]);
    }, 7000);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card text-left shadow-[0_24px_80px_-24px_rgba(0,0,0,0.6)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Window bar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </div>
        <p className="hidden font-mono text-xs text-muted-foreground sm:block">
          innoverse / challenges
        </p>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-emerald-500">
          <StatusDot status="success" pulse />
          live
        </span>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 border-b border-border px-3 py-2 sm:px-4"
        role="tablist"
        aria-label="Product preview"
      >
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setPaused(true);
            }}
            className={cn(
              "flex h-8 cursor-pointer items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === t
                ? "bg-white/[0.07] text-foreground"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            )}
          >
            {t}
            <span className="hidden font-mono text-[11px] text-muted-foreground/60 sm:inline">
              {i + 1}
            </span>
          </button>
        ))}
        <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground/60 md:block">
          auto-plays · hover to pause
        </span>
      </div>

      {/* Panes */}
      <div key={tab} className="animate-pane min-h-[320px] sm:min-h-[300px]">
        {tab === "Discover" && <DiscoverPane />}
        {tab === "Review" && <ReviewPane />}
        {tab === "Track" && <TrackPane />}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2 sm:px-5">
        <p className="font-mono text-[11px] text-muted-foreground">
          4 open · 2 in review · 1 shipping
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {tab === "Discover" ? "01 / 03" : tab === "Review" ? "02 / 03" : "03 / 03"}
        </p>
      </div>
    </div>
  );
}
