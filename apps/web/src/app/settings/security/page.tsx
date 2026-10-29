"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, ShieldOff, Eye, Lock } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsNav, startupSettingsItems } from "@/components/layout/settings-nav";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Section } from "@/components/ui/card";
import { StatBand } from "@/components/ui/stat";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmAction } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/useUser";

interface Result {
  message: string;
  repositories: number;
  checked: number;
  downgraded: number;
  skipped: number;
  failed: Array<{ repo: string; student: string; status: number | null; message: string }>;
}

export default function SecuritySettingsPage() {
  const { user, isLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [username, setUsername] = useState("");
  const [fixing, setFixing] = useState(false);
  const [fixError, setFixError] = useState("");
  const [fixResult, setFixResult] = useState<{
    message: string;
    before: string | null;
    after: string | null;
    invitationUpdated: boolean;
    orgNote?: string;
  } | null>(null);

  if (!isLoading && (!isAuthenticated || user?.role !== "Startup")) {
    router.push(isAuthenticated ? "/dashboard" : "/login");
  }

  const run = async () => {
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/github/downgrade-collaborators", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Downgrade failed");
      setResult(data);
      setConfirmOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Downgrade failed");
      setConfirmOpen(false);
    } finally {
      setRunning(false);
    }
  };

  const fixCollaborator = async () => {
    setFixing(true);
    setFixError("");
    setFixResult(null);
    try {
      const res = await fetch("/api/github/repo-access", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update access");
      setFixResult(data);
    } catch (err: unknown) {
      setFixError(err instanceof Error ? err.message : "Could not update access");
    } finally {
      setFixing(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl pb-16">
          <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-7 w-64" />
            <Skeleton className="mt-2 h-4 w-full max-w-lg" />
            <div className="mt-8 space-y-6">
              <div className="rounded-lg border border-border bg-card p-5">
                <Skeleton className="h-4 w-40" />
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-11/12" />
                  <Skeleton className="h-3 w-9/12" />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-3 h-3 w-2/3" />
                <Skeleton className="mt-4 h-8 w-52" />
              </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl pb-16">
        <SettingsNav items={startupSettingsItems} />
          <PageHeader
            back={{ href: "/dashboard/startup", label: "Dashboard" }}
            eyebrow={
              <span className="font-mono text-2xs uppercase tracking-[0.14em] text-subtle-foreground">
                Settings · Security
              </span>
            }
            title="Repository access"
            description="Students contribute through forks and pull requests. GitHub invites default to Write, and older approvals may still grant write access; this resets every approved contributor on your linked repositories to read-only."
            meta={
              <>
                <Badge
                  variant={user?.githubUsername ? "success" : "warning"}
                  className="font-mono"
                >
                  {user?.githubUsername
                    ? `GitHub @${user.githubUsername}`
                    : "GitHub not connected"}
                </Badge>
                <Badge variant="outline" className="font-mono">
                  POST /api/github/downgrade-collaborators
                </Badge>
              </>
            }
          />

          <div className="space-y-6">
            <Section
              title="What this changes"
              description="Read this before running it. The action uses your GitHub authorization and is safe to run more than once."
              contentClassName="divide-y divide-border"
            >
              <div className="flex gap-3 p-5">
                <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Removed</p>
                  <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-muted-foreground">
                    <li className="flex gap-2">
                      <span aria-hidden className="text-subtle-foreground">
                        •
                      </span>
                      Write, maintain and admin permission on your linked repositories for every
                      approved student.
                    </li>
                    <li className="flex gap-2">
                      <span aria-hidden className="text-subtle-foreground">
                        •
                      </span>
                      Their ability to push branches, merge pull requests and change repository
                      settings.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 p-5">
                <Eye className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Collaborators keep read access
                  </p>
                  <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-muted-foreground">
                    <li className="flex gap-2">
                      <span aria-hidden className="text-subtle-foreground">
                        •
                      </span>
                      Each collaborator is set to <span className="font-mono">pull</span>, not
                      removed: they can still clone the repo, read the code and open pull requests
                      from their forks.
                    </li>
                    <li className="flex gap-2">
                      <span aria-hidden className="text-subtle-foreground">
                        •
                      </span>
                      Pending, unapproved invitations and accounts already at read-only are skipped.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 p-5">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Unchanged</p>
                  <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-muted-foreground">
                    <li className="flex gap-2">
                      <span aria-hidden className="text-subtle-foreground">
                        •
                      </span>
                      Your own ownership of the repositories, and the fork-and-PR review workflow.
                    </li>
                    <li className="flex gap-2">
                      <span aria-hidden className="text-subtle-foreground">
                        •
                      </span>
                      GitHub branch protection rules. Innoverse cannot change those; enable them on
                      GitHub and require reviews on <span className="font-mono">main</span>.
                    </li>
                  </ul>
                </div>
              </div>
            </Section>

            <Section
              title="Run the downgrade"
              description="One request covers every linked repository. Progress is reported per repository when it finishes."
              contentClassName="p-5"
            >
              {error && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-md border border-danger-border bg-danger-subtle px-3 py-2.5"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="destructive-outline"
                  onClick={() => setConfirmOpen(true)}
                  disabled={running}
                >
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {running ? "Downgrading…" : "Downgrade to read-only"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Asks for confirmation, then reports what changed.
                </p>
              </div>
            </Section>

            <Section
              title="Invite or fix one collaborator"
              description="Use this for a repository outside a challenge or to repair one student. If the account has no access, Innoverse sends a read-only invitation; otherwise it sets the role to Read and verifies the result with GitHub."
              contentClassName="p-5"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="access-owner">Owner</Label>
                  <Input
                    id="access-owner"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="acme"
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="access-repo">Repository</Label>
                  <Input
                    id="access-repo"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    placeholder="dep-pruning"
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="access-user">GitHub username</Label>
                  <Input
                    id="access-user"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="student-login"
                    className="mt-1.5 h-10"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={fixCollaborator}
                  disabled={fixing || !owner.trim() || !repo.trim() || !username.trim()}
                >
                  {fixing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {fixing ? "Checking…" : "Inspect & set read-only"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Handles accepted collaborators and pending invitations.
                </p>
              </div>

              {fixError && (
                <div className="mt-4 flex items-start gap-2 rounded-md border border-danger-border bg-danger-subtle px-3 py-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <p className="text-sm text-danger">{fixError}</p>
                </div>
              )}

              {fixResult && (
                <div className="mt-4 rounded-md border border-border bg-surface-2/40 p-3">
                  <p className="text-sm text-foreground">{fixResult.message}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Before</span>
                    <Badge variant="outline" className="font-mono">
                      {fixResult.before ?? "not a collaborator"}
                    </Badge>
                    <span>→</span>
                    <span>After</span>
                    <Badge
                      variant={
                        ["pull", "public", "owner"].includes(fixResult.after ?? "")
                          ? "success"
                          : "warning"
                      }
                      className="font-mono"
                    >
                      {fixResult.invitationUpdated
                        ? "read (invite pending)"
                        : fixResult.after ?? "unknown"}
                    </Badge>
                  </div>
                  {fixResult.orgNote && fixResult.after !== "pull" && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {fixResult.orgNote}
                    </p>
                  )}
                </div>
              )}
            </Section>

            {result && (
              <section className="overflow-hidden rounded-lg border border-success-border bg-card">
                <header className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    <div>
                      <h2 className="text-md font-semibold tracking-tight text-foreground">
                        Downgrade complete
                      </h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                  <StatusBadge status="complete" />
                </header>

                <div className="p-5">
                  <StatBand
                    items={[
                      { label: "Repositories", value: result.repositories },
                      { label: "Checked", value: result.checked },
                      { label: "Downgraded", value: result.downgraded },
                      { label: "Skipped", value: result.skipped },
                    ]}
                  />

                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {result.downgraded === 0
                      ? "No collaborator was above read-only, so nothing changed."
                      : `${result.downgraded} collaborator${result.downgraded === 1 ? "" : "s"} moved from write to read-only across ${result.repositories} repositor${result.repositories === 1 ? "y" : "ies"}.`}{" "}
                    {result.skipped > 0 &&
                      `${result.skipped} already at read-only or not approved, left untouched.`}
                  </p>

                  {result.failed.length > 0 && (
                    <div className="mt-4 rounded-md border border-danger-border">
                      <div className="flex items-center justify-between gap-2 border-b border-danger-border bg-danger-subtle px-3 py-2">
                        <p className="text-xs font-medium text-danger">
                          {result.failed.length} could not be changed
                        </p>
                        <Badge variant="danger">Action needed</Badge>
                      </div>
                      <ul className="divide-y divide-border">
                        {result.failed.map((f, i) => (
                          <li key={i} className="px-3 py-2.5">
                            <p className="font-mono text-xs text-foreground">
                              {f.repo} · @{f.student}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {f.message}
                              {f.status ? ` (HTTP ${f.status})` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                    <Button variant="outline" size="sm" onClick={() => setResult(null)}>
                      Dismiss
                    </Button>
                    <p className="text-2xs text-subtle-foreground">
                      Re-running is safe; already read-only collaborators are skipped.
                    </p>
                  </div>
                </div>
              </section>
            )}

            <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-subtle-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              For defense in depth, also enable branch protection on GitHub: require pull requests
              and reviews for <span className="font-mono text-muted-foreground">main</span>.
            </p>
          </div>
      </div>

      <ConfirmAction
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove write access from every approved contributor?"
        description={
          <>
            Every approved student on your linked repositories is set to{" "}
            <span className="font-mono">pull</span> (read-only). They can still clone, read and open
            pull requests from forks, but can no longer push to your branches. Safe to run again.
          </>
        }
        confirmLabel="Downgrade to read-only"
        pending={running}
        onConfirm={run}
      />

    </AppShell>
  );
}
