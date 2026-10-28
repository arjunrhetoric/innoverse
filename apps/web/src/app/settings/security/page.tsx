"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Downgrade failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/dashboard/startup"
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="flex items-center gap-2 text-2xl font-medium tracking-tight sm:text-3xl">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Repository access
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Students contribute through forks and pull requests. Older approvals may still have
              write access from before that rule; this downgrades every approved contributor on your
              challenges to read-only.
            </p>

            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium">Downgrade legacy write access</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Uses your GitHub authorization to set the collaborator permission to{" "}
                <span className="font-mono">pull</span> for every approved student on your linked
                repositories. It is safe to run more than once.
              </p>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              {result && (
                <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs">
                  <p className="flex items-center gap-1.5 font-medium text-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {result.message}
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    {result.repositories} repositories · {result.checked} collaborators checked ·{" "}
                    {result.downgraded} downgraded · {result.skipped} skipped
                  </p>
                  {result.failed.length > 0 && (
                    <ul className="mt-2 space-y-1 text-destructive">
                      {result.failed.map((f, i) => (
                        <li key={i}>
                          {f.repo} · @{f.student}: {f.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <Button className="mt-4" variant="gradient" onClick={run} disabled={running}>
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {running ? "Downgrading…" : "Downgrade to read-only"}
              </Button>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              For defense in depth, also enable branch protection on your repositories: require pull
              requests and reviews for <span className="font-mono">main</span>. Innoverse cannot
              change GitHub branch rules for you.
            </p>
          </motion.div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
