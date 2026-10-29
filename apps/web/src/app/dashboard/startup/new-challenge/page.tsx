"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, GitBranch, Loader2, Rocket } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Section } from "@/components/ui/card";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";

interface FormState {
  title: string;
  description: string;
  skillsRequired: string;
  finalDeadline: string;
  contributionType: "project" | "issue";
  githubOwner: string;
  githubRepoName: string;
  issueNumber: string;
  issueLabels: string;
}

const EMPTY: FormState = {
  title: "",
  description: "",
  skillsRequired: "",
  finalDeadline: "",
  contributionType: "project",
  githubOwner: "",
  githubRepoName: "",
  issueNumber: "",
  issueLabels: "",
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const OPTIONS = [
  {
    value: "project" as const,
    icon: Rocket,
    title: "New project repo",
    detail:
      "Innoverse creates a private GitHub repository owned by your startup. The approved student gets read-only access after signing and contributes through forks.",
  },
  {
    value: "issue" as const,
    icon: GitBranch,
    title: "Open-source issue",
    detail:
      "Point students at an issue on a repository you already own. They fork the repo and open a pull request against it.",
  },
];

export default function NewChallengePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [minDeadline] = useState(() =>
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "Startup") router.push("/dashboard");
  }, [authLoading, isAuthenticated, user, router]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fail = (key: keyof FormState, message: string) => {
    setFieldErrors({ [key]: message });
    setError(message);
    const ids: Partial<Record<keyof FormState, string>> = {
      title: "title",
      description: "description",
      skillsRequired: "skills",
      finalDeadline: "deadline",
      githubOwner: "owner",
      githubRepoName: form.contributionType === "issue" ? "repo" : "repoName",
      issueNumber: "issueNumber",
      issueLabels: "labels",
    };
    requestAnimationFrame(() => {
      const el = document.getElementById(ids[key] ?? key);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement | null)?.focus?.();
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();

    if (title.length < 5) return fail("title", "Give the challenge a title of at least 5 characters.");
    if (description.length < 10) {
      return fail(
        "description",
        "Describe the challenge in at least 10 characters (scope, stack, expectations)."
      );
    }
    if (!form.finalDeadline) return fail("finalDeadline", "Choose a final deadline.");
    if (new Date(form.finalDeadline) <= new Date()) {
      return fail("finalDeadline", "The final deadline must be in the future.");
    }
    if (form.contributionType === "issue") {
      if (!form.githubOwner.trim() || !form.githubRepoName.trim()) {
        return fail(
          form.githubOwner.trim() ? "githubRepoName" : "githubOwner",
          "Enter the GitHub owner and repository name for the issue."
        );
      }
    } else if (!form.githubRepoName.trim()) {
      return fail("githubRepoName", "Name the private repository for this challenge.");
    }

    setPosting(true);
    setError("");
    try {
      const res = await fetch("/api/projects/post-problem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          createGithubRepo: form.contributionType === "project",
          skillsRequired: form.skillsRequired.split(",").map((s) => s.trim()).filter(Boolean),
          issueLabels: form.issueLabels.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const details =
          Array.isArray(data.issues) && data.issues.length ? ` (${data.issues.join("; ")})` : "";
        throw new Error(`${data.message || "Could not post the challenge"}${details}`);
      }
      router.push("/dashboard/startup");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not post the challenge");
    } finally {
      setPosting(false);
    }
  };

  const isIssue = form.contributionType === "issue";

  return (
    <AppShell>

      <PageHeader
        back={{ href: "/dashboard/startup", label: "Challenges" }}
        title="Post a challenge"
        description="Describe the work, set a deadline, and choose whether students join a new repository or an issue on an existing one."
      />

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle p-4"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <form onSubmit={submit} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ─── Left: challenge details ─────────────────────────────────── */}
        <Section
          className="min-w-0"
          title="Challenge details"
          description="Students see this on the challenge page before they apply."
        >
          <div className="space-y-5 p-5">
            <Field
              id="title"
              label="Challenge title"
              required
              hint={`${form.title.length}/160`}
              error={fieldErrors.title}
            >
              <Input
                id="title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Build a real-time telemetry dashboard"
                required
                minLength={5}
                maxLength={160}
                aria-invalid={Boolean(fieldErrors.title)}
              />
            </Field>

            <Field
              id="description"
              label="Description"
              required
              hint={`${form.description.trim().length} characters — at least 10`}
              error={fieldErrors.description}
            >
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Scope, technical stack, expected deliverables and what “done” looks like."
                className="min-h-[200px]"
                required
                minLength={10}
                maxLength={5000}
                aria-invalid={Boolean(fieldErrors.description)}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="skills"
                label="Skills required"
                hint="Comma separated"
                error={fieldErrors.skillsRequired}
              >
                <Input
                  id="skills"
                  value={form.skillsRequired}
                  onChange={(e) => set("skillsRequired", e.target.value)}
                  placeholder="React, Node.js, MongoDB"
                />
              </Field>

              <Field
                id="deadline"
                label="Final deadline"
                required
                hint="Must be in the future"
                error={fieldErrors.finalDeadline}
              >
                <Input
                  id="deadline"
                  type="date"
                  min={minDeadline}
                  value={form.finalDeadline}
                  onChange={(e) => set("finalDeadline", e.target.value)}
                  required
                  aria-invalid={Boolean(fieldErrors.finalDeadline)}
                />
              </Field>
            </div>

            <div className="rounded-md border border-border bg-surface px-3 py-2.5">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Proposals open as soon as the challenge is published. You approve a
                student, then Innoverse generates the collaboration agreement and
                grants repository access after signature.
              </p>
            </div>
          </div>
        </Section>

        {/* ─── Right: contribution + publish ───────────────────────────── */}
        <div className="min-w-0 space-y-6 xl:sticky xl:top-[72px]">
          <Section
            title="Contribution type"
            description="How the student will contribute."
          >
            <div className="space-y-2 p-5" role="radiogroup" aria-label="Contribution type">
              {OPTIONS.map((option) => {
                const selected = form.contributionType === option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set("contributionType", option.value)}
                    className={cn(
                      "w-full cursor-pointer rounded-md border p-3 text-left transition-colors",
                      selected
                        ? "border-brand/40 bg-brand-subtle"
                        : "border-border bg-card hover:border-border-strong hover:bg-accent"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selected ? "text-brand" : "text-subtle-foreground"
                        )}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {option.title}
                      </span>
                      {selected && (
                        <span className="ml-auto font-mono text-2xs uppercase tracking-[0.08em] text-brand">
                          Selected
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {option.detail}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            title={isIssue ? "Issue location" : "Repository"}
            description={
              isIssue
                ? "Where the issue lives."
                : "A private repo is created and linked to this challenge."
            }
          >
            <div className="space-y-4 p-5">
              {isIssue ? (
                <>
                  <Field
                    id="owner"
                    label="Repository owner"
                    required
                    error={fieldErrors.githubOwner}
                  >
                    <Input
                      id="owner"
                      value={form.githubOwner}
                      onChange={(e) => set("githubOwner", e.target.value)}
                      placeholder="acme"
                      aria-invalid={Boolean(fieldErrors.githubOwner)}
                    />
                  </Field>
                  <Field
                    id="repo"
                    label="Repository name"
                    required
                    error={fieldErrors.githubRepoName}
                  >
                    <Input
                      id="repo"
                      value={form.githubRepoName}
                      onChange={(e) => set("githubRepoName", e.target.value)}
                      placeholder="widgets"
                      aria-invalid={Boolean(fieldErrors.githubRepoName)}
                    />
                  </Field>
                  <Field
                    id="issueNumber"
                    label="Existing issue #"
                    hint="Optional"
                    error={fieldErrors.issueNumber}
                  >
                    <Input
                      id="issueNumber"
                      value={form.issueNumber}
                      onChange={(e) => set("issueNumber", e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="Leave blank to create one"
                      inputMode="numeric"
                      className="font-mono tnum"
                    />
                  </Field>
                  <Field
                    id="labels"
                    label="Labels"
                    hint="Comma separated"
                    error={fieldErrors.issueLabels}
                  >
                    <Input
                      id="labels"
                      value={form.issueLabels}
                      onChange={(e) => set("issueLabels", e.target.value)}
                      placeholder="good first issue, backend"
                    />
                  </Field>
                  <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                    Leaving the number blank creates the issue with this title and
                    description. The approved student is assigned the issue after
                    signing the collaboration agreement.
                  </p>
                </>
              ) : (
                <>
                  <Field
                    id="repoName"
                    label="Repository name"
                    required
                    hint="Created under your GitHub account"
                    error={fieldErrors.githubRepoName}
                  >
                    <Input
                      id="repoName"
                      value={form.githubRepoName}
                      onChange={(e) =>
                        set(
                          "githubRepoName",
                          e.target.value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-")
                        )
                      }
                      placeholder="my-challenge-repo"
                      aria-invalid={Boolean(fieldErrors.githubRepoName)}
                    />
                  </Field>

                  <div className="flex items-start gap-2 rounded-md border border-border bg-surface p-3">
                    <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      The repo is private. After signing, the student gets read-only
                      access and contributes through forks and pull requests; you review
                      and merge.
                    </p>
                  </div>
                </>
              )}
            </div>
          </Section>
        </div>

        {/* ─── Sticky footer ───────────────────────────────────────────── */}
        <div className="sticky bottom-0 z-20 flex flex-col gap-3 rounded-lg border border-border bg-card px-5 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between xl:col-span-2">
          <p className="text-xs text-muted-foreground">
            You can delete a challenge later; proposals stay in your records.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/startup">
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </Link>
            </Button>
            <Button type="submit" variant="default" disabled={posting}>
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {posting ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </div>
      </form>
    </AppShell>
  );
}
