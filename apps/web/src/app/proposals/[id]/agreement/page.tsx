"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileSignature,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  GitFork,
  ExternalLink,
  Download,
  Upload,
  X,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/ui/copy-button";
import { useUser } from "@/hooks/useUser";
import { formatDate } from "@/lib/utils";

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
  const [signatureDataUrl, setSignatureDataUrl] = useState("");

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
        body: JSON.stringify({ ipAssignmentAccepted: true, signatureDataUrl }),
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

  const onSignatureFile = (file?: File) => {
    setError("");
    if (!file) {
      setSignatureDataUrl("");
      return;
    }
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      setError("Upload a PNG or JPEG signature image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Signature image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSignatureDataUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  return (
    <AppShell>
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/dashboard/student"
            className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>

          {loading ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="space-y-2 pt-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <Skeleton key={i} className="h-3 w-full" />
                  ))}
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-40 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            </div>
          ) : !data ? (
            <EmptyState
              icon={AlertCircle}
              title="Agreement not available"
              description={error || "This agreement could not be loaded. It may belong to another account."}
              action={{ label: "Back to dashboard", href: "/dashboard/student" }}
            />
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
              {/* ── Document ─────────────────────────────────────────────── */}
              <article className="min-w-0">
                <header className="border-b border-border pb-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-2xs uppercase tracking-[0.18em] text-subtle-foreground">
                      Collaboration agreement
                    </p>
                    <StatusBadge status={done ? "Signed" : "Pending"} />
                  </div>
                  <h1 className="mt-2 font-serif text-2xl leading-tight tracking-tight text-foreground sm:text-3xl">
                    {data.problem.title}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="text-subtle-foreground">
                      Between <span className="text-foreground">{data.startup.name}</span> and{" "}
                      <span className="text-foreground">{data.student.name}</span>
                    </span>
                    {data.problem.repo && (
                      <span className="font-mono text-subtle-foreground">{data.problem.repo}</span>
                    )}
                    {data.proposal.agreementCode && (
                      <span className="font-mono text-subtle-foreground">
                        Ref {data.proposal.agreementCode}
                      </span>
                    )}
                  </div>
                  {data.proposal.agreementFile && (
                    <div className="mt-4">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/api/proposals/${data.proposal.id}/agreement/file`}>
                          <Download className="h-3.5 w-3.5" />
                          Download {done ? "signed" : "draft"} agreement (PDF)
                        </a>
                      </Button>
                    </div>
                  )}
                </header>

                <div className="space-y-7 pt-6 text-sm leading-7 text-muted-foreground">
                  <section>
                    <h2 className="mb-1.5 text-sm font-semibold text-foreground">
                      <span className="mr-2 font-mono text-xs text-subtle-foreground">1.</span>
                      Scope of collaboration
                    </h2>
                    <p>{data.problem.description}</p>
                  </section>

                  <section>
                    <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <FileSignature className="h-3.5 w-3.5 text-subtle-foreground" />
                      What you are agreeing to
                    </h2>
                    <ol className="list-none space-y-3 text-[13px] leading-6">
                      <li>
                        <span className="font-medium text-foreground">Read access, not write.</span>{" "}
                        You can fork the repository and open pull requests. Direct pushes to
                        protected branches are not granted; the startup reviews and merges.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">IP assignment.</span> You
                        assign the rights to your contributions for this project to{" "}
                        {data.startup.name}.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">Confidentiality.</span>{" "}
                        Non-public repository information stays between you and the startup.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">No employment.</span> This
                        collaboration is not an employment relationship.
                      </li>
                    </ol>
                  </section>

                  <section className="border-t border-border pt-6">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-subtle-foreground" />
                      Acceptance
                    </h2>

                    {error && (
                      <p
                        role="alert"
                        className="mb-3 flex items-start gap-1.5 rounded-md border border-danger-border bg-danger-subtle px-3 py-2 text-xs text-danger"
                      >
                        <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                        {error}
                      </p>
                    )}

                    {done ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-2 rounded-lg border border-success-border bg-success-subtle px-3 py-2.5">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          <div>
                            <p className="text-sm text-success">Agreement signed.</p>
                            {data.proposal.termsAcceptedAt && (
                              <p className="mt-0.5 text-xs text-success">
                                Accepted{" "}
                                <span className="tnum font-mono">
                                  {formatDate(data.proposal.termsAcceptedAt)}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        {warning && (
                          <p className="rounded-md border border-warning-border bg-warning-subtle px-3 py-2 text-xs text-warning">
                            {warning}
                          </p>
                        )}

                        {!data.proposal.accessGrantedAt && (
                          <div className="rounded-md border border-warning-border bg-warning-subtle px-3 py-2.5">
                            <p className="text-xs leading-relaxed text-warning">
                              Your GitHub invitation may still be pending. Accept it from your email
                              or GitHub notifications; the repository link returns 404 until you do.
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={resend}
                              disabled={submitting}
                            >
                              {submitting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : null}
                              Resend invitation
                            </Button>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-1">
                          {data.proposal.repoUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={data.proposal.repoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <GitFork className="h-3.5 w-3.5" />
                                Open repository
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/project/${data.problem.id}`}>Track project</Link>
                          </Button>
                          {data.proposal.agreementFile && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/api/proposals/${data.proposal.id}/agreement/file`}>
                                <Download className="h-3.5 w-3.5" />
                                Download agreement
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <label className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground">
                          <input
                            type="checkbox"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-border"
                            disabled={!isStudent}
                          />
                          <span>
                            I have read and accept the collaboration and IP assignment terms above.
                          </span>
                        </label>

                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between gap-3">
                            <Label htmlFor="signature" className="text-[13px] font-medium">
                              Your signature (optional PNG/JPG)
                            </Label>
                            <span className="text-2xs text-subtle-foreground">Max 2 MB</span>
                          </div>

                          {signatureDataUrl ? (
                            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={signatureDataUrl}
                                alt="Signature preview"
                                className="h-14 w-28 rounded-md border border-border bg-background object-contain p-1"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-foreground">Signature attached</p>
                                <p className="text-xs text-muted-foreground">
                                  It will appear on the PDF.
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById("signature")?.click()}
                                  disabled={!isStudent}
                                >
                                  Replace
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Remove signature"
                                  onClick={() => {
                                    setSignatureDataUrl("");
                                    const input = document.getElementById(
                                      "signature"
                                    ) as HTMLInputElement | null;
                                    if (input) input.value = "";
                                  }}
                                  disabled={!isStudent}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-surface/40 p-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                                <Upload className="h-4 w-4 text-muted-foreground" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-foreground">
                                  Upload a scanned signature
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  If omitted, your typed name is used as the signature.
                                </p>
                              </div>
                            </div>
                          )}

                          <input
                            id="signature"
                            type="file"
                            accept="image/png,image/jpeg"
                            disabled={!isStudent}
                            onChange={(e) => onSignatureFile(e.target.files?.[0])}
                            className="block w-full text-xs text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-xs file:text-foreground hover:file:border-border-strong"
                          />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Button
                            variant="default"
                            size="lg"
                            disabled={!accepted || submitting || !isStudent}
                            onClick={sign}
                          >
                            {submitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileSignature className="h-4 w-4" />
                            )}
                            Sign & get read access
                          </Button>
                          {!isStudent && (
                            <p className="text-xs text-muted-foreground">
                              Waiting for the student to sign.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </article>

              {/* ── Terms rail ───────────────────────────────────────────── */}
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <section className="overflow-hidden rounded-lg border border-border bg-card">
                  <header className="border-b border-border px-4 py-3">
                    <h2 className="text-sm font-semibold text-foreground">Summary of terms</h2>
                  </header>
                  <dl className="divide-y divide-border text-xs">
                    <div className="px-4 py-2.5">
                      <dt className="text-subtle-foreground">Startup</dt>
                      <dd className="mt-0.5 text-foreground">{data.startup.name}</dd>
                    </div>
                    <div className="px-4 py-2.5">
                      <dt className="text-subtle-foreground">Student</dt>
                      <dd className="mt-0.5 text-foreground">{data.student.name}</dd>
                    </div>
                    <div className="px-4 py-2.5">
                      <dt className="text-subtle-foreground">Repository</dt>
                      <dd className="mt-0.5 break-all font-mono text-foreground">
                        {data.problem.repo || "Not linked"}
                      </dd>
                    </div>
                    <div className="px-4 py-2.5">
                      <dt className="text-subtle-foreground">Access granted</dt>
                      <dd className="mt-0.5 text-foreground">Read only — fork and pull requests</dd>
                    </div>
                    <div className="px-4 py-2.5">
                      <dt className="text-subtle-foreground">IP assignment</dt>
                      <dd className="mt-0.5 text-foreground">{data.startup.name}</dd>
                    </div>
                    <div className="px-4 py-2.5">
                      <dt className="text-subtle-foreground">Employment</dt>
                      <dd className="mt-0.5 text-foreground">None</dd>
                    </div>
                    {data.proposal.agreementCode && (
                      <div className="px-4 py-2.5">
                        <dt className="text-subtle-foreground">Reference</dt>
                        <dd className="mt-1 flex items-center gap-1.5">
                          <CopyButton value={data.proposal.agreementCode} label="Copy reference" />
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>

                <section className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
                  <header className="border-b border-border px-4 py-3">
                    <h2 className="text-sm font-semibold text-foreground">Signatures</h2>
                  </header>
                  <ul className="divide-y divide-border text-xs">
                    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="min-w-0 truncate text-muted-foreground">
                        Student · {data.student.name}
                      </span>
                      <StatusBadge status={done ? "Signed" : "Pending"} />
                    </li>
                    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="min-w-0 truncate text-muted-foreground">
                        Startup · {data.startup.name}
                      </span>
                      <StatusBadge status={done ? "Signed" : "Pending"} />
                    </li>
                  </ul>
                  <p className="border-t border-border px-4 py-2.5 text-2xs leading-relaxed text-subtle-foreground">
                    {done
                      ? "Both signatures are on the generated PDF."
                      : "The startup countersignature is applied to the PDF when you sign."}
                  </p>
                </section>

                <section className="mt-4 rounded-lg border border-border bg-card px-4 py-3">
                  <p className="text-2xs uppercase tracking-[0.08em] text-subtle-foreground">
                    Effective date
                  </p>
                  <p className="tnum mt-1 font-mono text-sm text-foreground">
                    {data.proposal.termsAcceptedAt
                      ? formatDate(data.proposal.termsAcceptedAt)
                      : "On signature"}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-2xs text-subtle-foreground">
                    <Badge variant="default" className="font-mono">
                      {data.proposal.status}
                    </Badge>
                    {data.proposal.agreementFile ? "PDF available" : "PDF generated on signature"}
                  </p>
                </section>
              </aside>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
