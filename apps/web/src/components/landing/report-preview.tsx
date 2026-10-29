import Link from "next/link";
import { ShieldCheck, GitPullRequest, GitCommitHorizontal, CalendarCheck, MessagesSquare } from "lucide-react";
import { ProgressRow } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * A static composition of the real Proof-of-Work Report, shown on the landing
 * page as proof of the output format. Every number here is sample data and is
 * labelled as such — the live report at /r/[token] is generated from GitHub.
 */
const evidence = [
  { icon: GitPullRequest, label: "Merged PRs", value: "7" },
  { icon: GitCommitHorizontal, label: "Commits", value: "63" },
  { icon: CalendarCheck, label: "Active days", value: "18" },
  { icon: MessagesSquare, label: "Review threads", value: "24" },
];

const rubric = [
  { label: "Code quality", value: 4.5 },
  { label: "Delivery reliability", value: 4 },
  { label: "Communication", value: 4.5 },
  { label: "Testing", value: 3.5 },
];

const reasons = [
  "All 7 merged PRs are attributed to the student's linked GitHub account",
  "Commit authorship matches the account email for 96% of commits",
  "Two of three milestones were reviewed by the startup before merge",
];

export function ReportPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-brand" />
          <span className="font-mono text-2xs uppercase tracking-[0.12em] text-muted-foreground">
            Proof-of-Work Report
          </span>
        </div>
        <Badge variant="default">Sample</Badge>
      </div>

      <div className="px-5 py-6 sm:px-7">
        <p className="text-2xs uppercase tracking-[0.1em] text-subtle-foreground">Issued to</p>
        <p className="mt-1 font-serif text-2xl tracking-tight text-foreground">Meera Iyer</p>
        <p className="mt-1 text-sm text-muted-foreground">
          AI support triage bot · Northwind AI
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="flex items-end gap-2">
              <span className="tnum font-mono text-4xl font-medium leading-none text-foreground">86</span>
              <span className="pb-1 text-xs text-muted-foreground">/ 100 contribution confidence</span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {reasons.map((r) => (
                <li key={r} className="flex gap-2 text-2xs leading-relaxed text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-success" aria-hidden />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2.5">
            <p className="text-2xs uppercase tracking-[0.1em] text-subtle-foreground">
              Reviewer rubric
            </p>
            {rubric.map((r) => (
              <ProgressRow
                key={r.label}
                label={r.label}
                value={r.value}
                max={5}
                suffix={`${r.value.toFixed(1)} / 5`}
                tone="brand"
              />
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
          {evidence.map((e) => (
            <div key={e.label} className="bg-card px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-subtle-foreground">
                <e.icon className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-[0.08em]">{e.label}</span>
              </div>
              <p className="tnum mt-1 font-mono text-md text-foreground">{e.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <p className="font-mono text-2xs text-subtle-foreground">
            INV-2026-8X2K · fingerprint 3f9c…a71d
          </p>
          <Link href="/verify" className="text-2xs font-medium text-brand hover:underline">
            Verify at /verify →
          </Link>
        </div>
      </div>
    </div>
  );
}
