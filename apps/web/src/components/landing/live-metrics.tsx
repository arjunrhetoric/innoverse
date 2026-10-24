"use client";

import { useEffect, useState } from "react";

interface Stats {
  challenges: number;
  students: number;
  startups: number;
  reports: number;
  mergedPRs: number;
}

const FALLBACK: Stats = { challenges: 0, students: 0, startups: 0, reports: 0, mergedPRs: 0 };

/**
 * Live platform counts. These are real database numbers — not marketing
 * placeholders — so they can only ever be as impressive as the product is.
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
    { value: stats?.startups, label: "Startups posting" },
    { value: stats?.reports, label: "Verified reports" },
  ];

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`py-8 ${i !== 0 ? "border-l border-border pl-6 sm:pl-8" : ""} ${
            i === 2 ? "max-lg:border-l-0 max-lg:pl-0" : ""
          }`}
        >
          <p className="font-mono text-3xl font-medium tracking-tight text-foreground tabular-nums">
            {item.value === undefined ? "—" : item.value}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
