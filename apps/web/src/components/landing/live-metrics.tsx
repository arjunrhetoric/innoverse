"use client";

import { useEffect, useState } from "react";
import { StatusDot } from "@/components/ui/status-dot";

interface Stats {
  challenges: number;
  students: number;
  startups: number;
  reports: number;
  mergedPRs: number;
}

const FALLBACK: Stats = { challenges: 0, students: 0, startups: 0, reports: 0, mergedPRs: 0 };

/**
 * Live platform counts from /api/stats. These are real database numbers — no
 * placeholder marketing figures. The component renders an honest zero when the
 * endpoint is empty or unavailable rather than inventing a number.
 */
export function LiveMetrics() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setStats({ ...FALLBACK, ...data }))
      .catch(() => setStats(FALLBACK));
  }, []);

  const items = [
    { value: stats?.challenges, label: "Open challenges" },
    { value: stats?.students, label: "Students building" },
    { value: stats?.mergedPRs, label: "Pull requests merged" },
    { value: stats?.reports, label: "Verified reports" },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 font-mono text-2xs uppercase tracking-[0.12em] text-muted-foreground">
        <StatusDot status="success" pulse />
        Live from the database
      </div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="bg-card px-4 py-3.5">
            <dd className="tnum text-2xl font-semibold tracking-tight text-foreground">
              {item.value === undefined || item.value === null ? (
                <span className="inline-block h-6 w-8 animate-pulse rounded bg-muted align-middle" />
              ) : (
                item.value.toLocaleString()
              )}
            </dd>
            <dt className="mt-0.5 text-xs text-muted-foreground">{item.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
