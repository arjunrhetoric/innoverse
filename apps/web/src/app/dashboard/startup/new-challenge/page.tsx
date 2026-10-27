"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, AlertCircle, Rocket, GitBranch, Compass } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { QuickLinks } from "@/components/dashboard/quick-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/hooks/useUser";

interface FormState {
  title: string;
  description: string;
  skillsRequired: string;
  finalDeadline: string;
  contributionType: "project" | "issue";
  githubOwner: string;
  createGithubRepo: boolean;
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
  createGithubRepo: false,
  githubRepoName: "",
  issueNumber: "",
  issueLabels: "",
};

export default function NewChallengePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "Startup") router.push("/dashboard");
  }, [authLoading, isAuthenticated, user, router]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();

    if (title.length < 5) return setError("Give the challenge a title of at least 5 characters.");
    if (description.length < 10) {
      return setError("Describe the challenge in at least 10 characters (scope, stack, expectations).");
    }
    if (!form.finalDeadline) return setError("Choose a final deadline.");
    if (new Date(form.finalDeadline) <= new Date()) {
      return setError("The final deadline must be in the future.");
    }
    if (form.contributionType === "issue") {
      if (!form.githubOwner.trim() || !form.githubRepoName.trim()) {
        return setError("Enter the GitHub owner and repository name for the issue.");
      }
    } else if (form.createGithubRepo && !form.githubRepoName.trim()) {
      return setError("Enter a repository name, or turn off repository creation.");
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

  return (
    <AppShell>
      <QuickLinks />
      <div className="mb-6">
        <Link
          href="/dashboard/startup"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="type-display text-2xl font-medium text-foreground sm:text-[28px]">
          Post a challenge
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Two ways to work with students: create a project repository, or open an issue on an
          existing repository for open-source contribution.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="space-y-5 rounded-xl border border-border bg-card p-6">
          <div>
            <Label htmlFor="title">Challenge title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Build a real-time telemetry dashboard"
              className="mt-1.5 h-11"
              required
              minLength={5}
              maxLength={160}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Scope, technical stack, expected deliverables and what “done” looks like."
              className="mt-1.5 min-h-[180px]"
              required
              minLength={10}
              maxLength={5000}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {form.description.trim().length} characters — at least 10.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="skills">Skills required</Label>
              <Input
                id="skills"
                value={form.skillsRequired}
                onChange={(e) => set("skillsRequired", e.target.value)}
                placeholder="React, Node.js, MongoDB"
                className="mt-1.5 h-11"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Comma separated.</p>
            </div>
            <div>
              <Label htmlFor="deadline">Final deadline</Label>
              <Input
                id="deadline"
                type="date"
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                value={form.finalDeadline}
                onChange={(e) => set("finalDeadline", e.target.value)}
                className="mt-1.5 h-11"
                required
              />
            </div>
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5">
            <Label className="mb-2 block">Contribution type</Label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => set("contributionType", "project")}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  form.contributionType === "project"
                    ? "border-foreground/30 bg-white/[0.05]"
                    : "border-border hover:border-foreground/25"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Rocket className="h-4 w-4" />
                  New project repo
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Innoverse creates a private GitHub repository for the collaboration.
                </span>
              </button>
              <button
                type="button"
                onClick={() => set("contributionType", "issue")}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  form.contributionType === "issue"
                    ? "border-foreground/30 bg-white/[0.05]"
                    : "border-border hover:border-foreground/25"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Compass className="h-4 w-4" />
                  Open-source issue
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Create or link an issue on an existing repo. Students fork and open a PR.
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            {form.contributionType === "issue" ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="owner">Repository owner</Label>
                  <Input
                    id="owner"
                    value={form.githubOwner}
                    onChange={(e) => set("githubOwner", e.target.value)}
                    placeholder="acme"
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="repo">Repository name</Label>
                  <Input
                    id="repo"
                    value={form.githubRepoName}
                    onChange={(e) => set("githubRepoName", e.target.value)}
                    placeholder="widgets"
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="issueNumber">Existing issue # (optional)</Label>
                  <Input
                    id="issueNumber"
                    value={form.issueNumber}
                    onChange={(e) => set("issueNumber", e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Leave blank to create one"
                    inputMode="numeric"
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="labels">Labels</Label>
                  <Input
                    id="labels"
                    value={form.issueLabels}
                    onChange={(e) => set("issueLabels", e.target.value)}
                    placeholder="good first issue, backend"
                    className="mt-1.5 h-10"
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Leaving the number blank creates the issue with this title and description. The
                  approved student is assigned the issue after signing the collaboration agreement.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="github">Create GitHub repository</Label>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      A private repo is created and linked to this challenge.
                    </p>
                  </div>
                  <Switch
                    id="github"
                    checked={form.createGithubRepo}
                    onCheckedChange={(v) => set("createGithubRepo", v)}
                  />
                </div>
                {form.createGithubRepo && (
                  <div>
                    <Label htmlFor="repoName">Repository name</Label>
                    <Input
                      id="repoName"
                      value={form.githubRepoName}
                      onChange={(e) => set("githubRepoName", e.target.value)}
                      placeholder="my-challenge-repo"
                      className="mt-1.5 h-10"
                    />
                  </div>
                )}
                <div className="flex items-start gap-2 rounded-md border border-border/60 bg-background p-3">
                  <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Students get read-only access after signing the agreement. They contribute
                    through forks and pull requests; you review and merge.
                  </p>
                </div>
              </div>
            )}
          </div>

          <Button type="submit" variant="default" size="lg" className="w-full" disabled={posting}>
            {posting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {posting ? "Posting…" : "Post challenge"}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            You can delete a challenge later; proposals stay in your records.
          </p>
        </div>
      </form>
    </AppShell>
  );
}
