"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileSignature,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  GitFork,
  ExternalLink,
  Download,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";

interface AgreementData {
  proposal: {
    id: string;
    status: string;
    repoUrl: string | null;
    termsAcceptedAt: string | null;
    accessGrantedAt: string | null;
    agreementCode: string | null;
    agreementFile: string | null;
    description: string;
  };
  problem: { id: string; title: string; description: string; repo: string | null };
  startup: { name: string };
  student: { name: string };
}

export default function CollaborationAgreementPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const [data, setData] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/proposals/${id}/agreement`, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Agreement not found");
        setData(json);
        setDone(Boolean(json.proposal.termsAcceptedAt));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Agreement not found"))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated]);

  const sign = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/proposals/${id}/agreement`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipAssignmentAccepted: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not sign the agreement");
      if (typeof json.message === "string") setWarning(json.message);
      setDone(true);
      const refreshed = await fetch(`/api/proposals/${id}/agreement`, {
        credentials: "include",
      }).then((r) => r.json());
      if (refreshed?.proposal) setData(refreshed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not sign the agreement");
    } finally {
      setSubmitting(false);
    }
  };

  const resend = sign;

  const isStudent = user?.role === "Student";

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-2xl">
          <Link href="/dashboard/student" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          {loading ? (
            <Skeleton className="h-96 w-full rounded-2xl" />
          ) : error || !data ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <p className="text-muted-foreground">{error || "Agreement not found"}</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Collaboration agreement
                  </p>
                  {done ? (
                    <Badge variant="success" className="text-[10px]">Signed</Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px]">Signature required</Badge>
                  )}
                </div>

                <h1 className="mt-2 text-xl font-medium tracking-tight sm:text-2xl">
                  {data.problem.title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.startup.name} · {data.student.name}
                  {data.problem.repo ? ` · ${data.problem.repo}` : ""}
                </p>

                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {data.problem.description}
                </p>

                <div className="mt-5 space-y-3 rounded-xl border border-border/60 bg-background p-4 text-sm">
                  <h2 className="flex items-center gap-2 font-medium">
                    <FileSignature className="h-4 w-4 text-primary" />
                    What you are agreeing to
                  </h2>
                  <ul className="space-y-2 text-[13px] leading-relaxed text-muted-foreground">
                    <li>
                      <span className="text-foreground">Read access, not write.</span> You can fork the
                      repository and open pull requests. Direct pushes to protected branches are not
                      granted; the startup reviews and merges.
                    </li>
                    <li>
                      <span className="text-foreground">IP assignment.</span> You assign the rights to
                      your contributions for this project to {data.startup.name}.
                    </li>
                    <li>
                      <span className="text-foreground">Confidentiality.</span> Non-public repository
                      information stays between you and the startup.
                    </li>
                    <li>
                      <span className="text-foreground">No employment.</span> This collaboration is not
                      an employment relationship.
                    </li>
                  </ul>
                </div>

                {error && (
                  <p className="mt-4 flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {error}
                  </p>
                )}

                {done ? (
                  <div className="mt-5 space-y-3">
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <p className="text-sm text-emerald-500">
                        Agreement signed.
                      </p>
                    </div>
                    {warning && (
                      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
                        {warning}
                      </p>
                    )}
                    {!data.proposal.accessGrantedAt && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Your GitHub invitation may still be pending. Accept it from your email or
                          GitHub notifications; the repository link returns 404 until you do.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={resend}
                          disabled={submitting}
                        >
                          {submitting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                          Resend invitation
                        </Button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {data.proposal.repoUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={data.proposal.repoUrl} target="_blank" rel="noopener noreferrer">
                            <GitFork className="mr-2 h-4 w-4" />
                            Open repository
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/project/${data.problem.id}`}>
                          Track project
                        </Link>
                      </Button>
                      {data.proposal.agreementFile && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/api/proposals/${data.proposal.id}/agreement/file`}>
                            <Download className="mr-2 h-4 w-4" />
                            Download agreement
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                        className="mt-0.5"
                        disabled={!isStudent}
                      />
                      <span>
                        I have read and accept the collaboration and IP assignment terms above.
                      </span>
                    </label>
                    <Button
                      variant="gradient"
                      disabled={!accepted || submitting || !isStudent}
                      onClick={sign}
                    >
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Sign & get read access
                    </Button>
                    {!isStudent && (
                      <p className="text-xs text-muted-foreground">
                        Waiting for the student to sign.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
