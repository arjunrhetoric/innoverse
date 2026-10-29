"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Download,
  FileText,
  Fingerprint,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Star,
  XCircle,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/ui/copy-button";
import { certificates } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type VerifyResult = Awaited<ReturnType<typeof certificates.verify>>;
/* publicToken is returned by the route but not declared on the shared client type. */
type VerifyCert = NonNullable<VerifyResult["certificate"]> & { publicToken?: string | null };

export default function VerifyResultPage() {
  const params = useParams();
  const code = decodeURIComponent(params.code as string);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    certificates
      .verify(code)
      .then(setResult)
      .catch((err: unknown) => {
        setFailed(true);
        setResult({
          valid: false,
          message: err instanceof Error ? err.message : "Verification could not run",
        });
      })
      .finally(() => setLoading(false));
  }, [code]);

  const cert = result?.certificate as VerifyCert | undefined;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto w-full max-w-[1160px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/verify"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ScanLine className="h-3.5 w-3.5" aria-hidden />
              Verify another code
            </Link>
            <span className="font-mono text-2xs text-subtle-foreground">
              code <span className="text-muted-foreground">{code}</span>
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-6">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-3 h-6 w-56" />
                <Skeleton className="mt-2 h-3 w-72" />
              </div>
              <div className="rounded-lg border border-border bg-card p-6">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-7 w-64" />
                <Skeleton className="mt-6 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-5/6" />
                <Skeleton className="mt-6 h-16 w-full" />
              </div>
            </div>
          ) : failed ? (
            /* ── error ─────────────────────────────────────────────── */
            <section
              role="alert"
              aria-labelledby="verify-error"
              className="rounded-xl border border-warning-border bg-card"
            >
              <div className="flex items-start gap-3 border-b border-border px-6 py-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-warning-border bg-warning-subtle">
                  <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h1 id="verify-error" className="text-lg font-semibold tracking-tight text-foreground">
                    Verification could not run
                  </h1>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {result?.message || "The verification service did not respond. This is not a result about the credential itself."}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 px-6 py-4">
                <Button variant="default" size="sm" asChild>
                  <Link href={`/verify/${encodeURIComponent(code)}`}>
                    <RefreshCw />
                    Try again
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/verify">Enter a different code</Link>
                </Button>
              </div>
            </section>
          ) : cert?.revoked ? (
            /* ── revoked ───────────────────────────────────────────── */
            <>
              <section className="rounded-xl border border-danger-border bg-card">
                <div className="flex items-start gap-3 border-b border-border px-6 py-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-danger-border bg-danger-subtle">
                    <Ban className="h-4 w-4 text-danger" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-lg font-semibold tracking-tight text-foreground">
                        Certificate revoked
                      </h1>
                      <StatusBadge status="revoked" />
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      This certificate was issued by {cert.startupName} and is no longer valid.
                    </p>
                  </div>
                </div>

                <div className="px-6 py-5">
                  <dl className="divide-y divide-border text-sm">
                    <Row label="Awarded to" value={cert.studentName} />
                    <Row label="Challenge" value={cert.problemTitle} />
                    {cert.issuedAt && (
                      <Row label="Originally issued" value={formatDate(cert.issuedAt)} mono />
                    )}
                    {cert.revokedAt && (
                      <Row label="Revoked on" value={formatDate(cert.revokedAt)} mono />
                    )}
                    {cert.revocationReason && (
                      <Row label="Reason" value={cert.revocationReason} />
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <dt className="text-muted-foreground">Verification code</dt>
                      <dd>
                        <CopyButton value={cert.verificationCode} />
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/verify">Verify another code</Link>
                </Button>
                {cert.publicToken && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/r/${cert.publicToken}`}>
                      <FileText />
                      See the report
                    </Link>
                  </Button>
                )}
              </div>
            </>
          ) : result?.valid && cert ? (
            /* ── valid ─────────────────────────────────────────────── */
            <>
              <section className="rounded-xl border border-success-border bg-card">
                <div className="flex items-start gap-3 border-b border-border px-6 py-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-success-border bg-success-subtle">
                    <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-lg font-semibold tracking-tight text-foreground">
                        Credential verified
                      </h1>
                      <StatusBadge status="verified" />
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      This certificate matches the record held by Innoverse.
                    </p>
                  </div>
                </div>

                <div className="px-6 py-6">
                  <p className="font-mono text-2xs uppercase tracking-[0.14em] text-subtle-foreground">
                    Certificate of completion
                  </p>
                  <p className="mt-2 font-serif text-2xl leading-snug text-foreground">
                    {cert.problemTitle}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Awarded to{" "}
                    <span className="font-medium text-foreground">{cert.studentName}</span>
                    {cert.studentGithub ? (
                      <span className="font-mono text-xs text-subtle-foreground">
                        {" "}
                        @{cert.studentGithub}
                      </span>
                    ) : null}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div
                      className="flex items-center gap-0.5"
                      aria-label={`Rated ${cert.rating} out of 5 by the startup`}
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={
                            i < cert.rating
                              ? "h-3.5 w-3.5 fill-warning text-warning"
                              : "h-3.5 w-3.5 text-subtle-foreground/40"
                          }
                          aria-hidden
                        />
                      ))}
                    </div>
                    <Badge variant="outline" className="tnum">
                      {cert.rating}/5
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Issued by <span className="text-foreground">{cert.startupName}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      on <span className="tnum font-mono">{formatDate(cert.issuedAt)}</span>
                    </span>
                  </div>

                  {cert.evidence && (
                    <div className="mt-6 rounded-lg border border-border bg-surface-2 px-4 py-4">
                      <h2 className="text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground">
                        Evidence at issue
                      </h2>
                      <div className="mt-3 grid grid-cols-3 gap-4">
                        <Stat label="Merged PRs" value={cert.evidence.mergedPRs} />
                        <Stat label="Commits" value={cert.evidence.commits} />
                        <Stat
                          label="Milestones"
                          value={`${cert.evidence.milestonesCompleted}/${cert.evidence.milestonesTotal}`}
                        />
                      </div>
                    </div>
                  )}

                  {cert.review && (
                    <div className="mt-5">
                      <h2 className="text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground">
                        Reviewer note
                      </h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {cert.review}
                      </p>
                    </div>
                  )}
                </div>

                <footer className="border-t border-border bg-surface px-6 py-4">
                  <dl className="space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <dt className="text-muted-foreground">Verification code</dt>
                      <dd>
                        <CopyButton value={cert.verificationCode} />
                      </dd>
                    </div>
                    {cert.sha256 && (
                      <div className="flex flex-col gap-1 border-t border-border pt-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                          <Fingerprint className="h-3 w-3" aria-hidden />
                          SHA-256
                        </dt>
                        <dd className="min-w-0 break-all font-mono text-2xs text-muted-foreground">
                          {cert.sha256}
                        </dd>
                      </div>
                    )}
                  </dl>
                </footer>
              </section>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {cert.certificateFile && (
                  <Button variant="default" size="sm" asChild>
                    <a
                      href={`/api/certificates/verify/${cert.verificationCode}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download />
                      Download certificate
                    </a>
                  </Button>
                )}
                {cert.publicToken && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/r/${cert.publicToken}`}>
                      <FileText />
                      Open the Proof-of-Work Report
                      <ArrowRight />
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/verify">Verify another code</Link>
                </Button>
              </div>
            </>
          ) : (
            /* ── not found ─────────────────────────────────────────── */
            <section className="rounded-xl border border-border bg-card">
              <div className="flex items-start gap-3 px-6 py-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2">
                  <XCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold tracking-tight text-foreground">
                    No credential matches this code
                  </h1>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {result?.message ||
                      "Check the code against the certificate — a single wrong character will not resolve."}
                  </p>
                  <p className="mt-3 font-mono text-2xs text-subtle-foreground">
                    searched: {code}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button variant="default" size="sm" asChild>
                      <Link href="/verify">
                        Try another code
                        <ArrowRight />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/talent">Browse reports</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-foreground ${mono ? "tnum font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
