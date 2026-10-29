"use client";

import { useEffect, useState } from "react";
import {
  Award,
  Star,
  Loader2,
  Fingerprint,
  AlertCircle,
  CheckCircle2,
  Building2,
  Ban,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Section } from "@/components/ui/card";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/ui/copy-button";
import { ConfirmAction } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { certificates as certApi } from "@/lib/api";
import { projectChannel } from "@/lib/channels";
import { useSSE } from "@/hooks/useSSE";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

const RUBRIC_CRITERIA = [
  { key: "codeQuality", label: "Code quality" },
  { key: "delivery", label: "Delivery & reliability" },
  { key: "communication", label: "Communication" },
  { key: "testing", label: "Testing & robustness" },
];

export function CertificateSection({ projectId, progress }: { projectId: string; progress: number }) {
  const { user } = useUser();
  const { toast } = useToast();
  const [proposals, setProposals] = useState<any[]>([]);
  const [issued, setIssued] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [rubric, setRubric] = useState<Record<string, number>>({
    codeQuality: 4,
    delivery: 4,
    communication: 4,
    testing: 4,
  });
  const [summary, setSummary] = useState("");
  const [lastReport, setLastReport] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [done, setDone] = useState("");
  const [brandingComplete, setBrandingComplete] = useState<boolean | null>(null);
  const [brandingMissing, setBrandingMissing] = useState<string[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [data, brandingRes] = await Promise.all([
        certApi.getForProblem(projectId),
        fetch("/api/settings/branding", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      setProposals(data.approvedProposals || []);
      setIssued(data.certificates || []);
      if (brandingRes) {
        setBrandingComplete(Boolean(brandingRes.complete));
        setBrandingMissing(Array.isArray(brandingRes.missing) ? brandingRes.missing : []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load certificate data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useSSE(projectId ? projectChannel(projectId) : null, (event) => {
    if (event?.type !== "certificate") return;
    if (event?.actorId && user?.id && event.actorId === user.id) return;
    fetchData();
  });

  const issuedFor = new Set(
    issued.map((c: any) =>
      typeof c.studentId === "object" ? String(c.studentId._id) : String(c.studentId)
    )
  );
  const pending = proposals.filter((p: any) => {
    const sid = typeof p.studentId === "object" ? String(p.studentId._id) : String(p.studentId);
    return !issuedFor.has(sid);
  });

  const handleIssue = async (proposal: any) => {
    const studentId =
      typeof proposal.studentId === "object" ? proposal.studentId._id : proposal.studentId;
    if (!review.trim()) {
      setError("A review is required.");
      return;
    }
    setIssuing(true);
    setError("");
    setDone("");
    try {
      const formData = new FormData();
      formData.append("problemId", projectId);
      formData.append("studentId", String(studentId));
      formData.append("rating", String(rating));
      formData.append("review", review);
      formData.append("summary", summary);
      for (const [key, value] of Object.entries(rubric)) {
        formData.append(`rubric.${key}`, String(value));
      }
      const result = await certApi.submit(formData);
      const token = result?.certificate?.publicToken ?? null;
      setLastReport(token);
      setDone(
        token
          ? "Proof-of-Work Report generated. Open it with the link below."
          : "Official Innoverse certificate issued successfully."
      );
      setExpanded(null);
      setReview("");
      setSummary("");
      setRating(5);
      toast({ title: "Certificate issued", variant: "success" });
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to issue certificate");
    } finally {
      setIssuing(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (revokeReason.trim().length < 5) {
      setError("Give a revocation reason of at least 5 characters.");
      return;
    }
    setRevokeBusy(true);
    setError("");
    try {
      await certApi.revoke(id, revokeReason.trim());
      setConfirmRevoke(null);
      setRevoking(null);
      setRevokeReason("");
      setDone("Certificate revoked. Its verification page now reports REVOKED.");
      toast({ title: "Certificate revoked", description: "Verification now returns revoked.", variant: "warning" });
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to revoke certificate");
    } finally {
      setRevokeBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-3 rounded-lg border border-border bg-card p-5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-72" />
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <SkeletonRows rows={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {brandingComplete === false && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning-border bg-warning-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm leading-relaxed text-foreground">
              {brandingMissing.length > 0
                ? `Still missing: ${brandingMissing.join(", ")}.`
                : "Add your company logo, signatory and signature before issuing certificates."}
            </p>
          </div>
          <Button size="sm" variant="outline" asChild className="shrink-0">
            <Link href={`/settings/branding?returnTo=${encodeURIComponent(`/project/${projectId}`)}`}>
              Complete branding kit
            </Link>
          </Button>
        </div>
      )}

      {progress < 100 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-info-border bg-info-subtle px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p className="text-sm leading-relaxed text-foreground">
            Project progress is <span className="tnum font-mono">{progress}%</span>. Certificates
            are usually issued on completion — you can still issue one now.
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-danger-border bg-danger-subtle px-4 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm leading-relaxed text-danger">{error}</p>
        </div>
      )}

      {done && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-success-border bg-success-subtle px-4 py-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          <p className="text-sm text-foreground">{done}</p>
          {lastReport && (
            <Link
              href={`/r/${lastReport}`}
              className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              Open report
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {proposals.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No approved contributors yet"
          description="A certificate can be issued once you approve a student's proposal. Approvals appear here with the evidence already attached."
        />
      ) : (
        <Section
          title="Approved contributors"
          description="Issuing mints a credential and freezes the evidence into a public Proof-of-Work Report."
          actions={
            <span className="tnum font-mono text-2xs text-subtle-foreground">
              {proposals.length} contributor{proposals.length === 1 ? "" : "s"} · {issued.length} issued
            </span>
          }
        >
          <ul className="divide-y divide-border">
            {proposals.map((proposal: any) => {
              const student = typeof proposal.studentId === "object" ? proposal.studentId : null;
              const sid = student?._id ? String(student._id) : String(proposal.studentId);
              const cert = issued.find((c: any) => {
                const csid =
                  typeof c.studentId === "object" ? String(c.studentId._id) : String(c.studentId);
                return csid === sid;
              });
              const isOpen = expanded === sid;

              return (
                <li key={proposal._id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {student?.name || student?.githubUsername || "Student"}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {student?.email || student?.githubUsername || "—"}
                      </p>
                    </div>

                    {cert ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={cert.revoked ? "Revoked" : "Issued"} />
                        <span className="inline-flex items-center gap-1 font-mono text-2xs text-subtle-foreground">
                          <Fingerprint className="h-3 w-3" aria-hidden />
                          <span className="sr-only">Verification code </span>
                          {String(cert.verificationCode).slice(0, 8)}…
                        </span>
                        {cert.publicToken && (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/r/${cert.publicToken}`}>
                              Open report
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant={isOpen ? "outline" : "default"}
                        onClick={() => {
                          setExpanded(isOpen ? null : sid);
                          setError("");
                        }}
                        aria-expanded={isOpen}
                      >
                        <Award className="h-3.5 w-3.5" />
                        {isOpen ? "Cancel" : "Issue certificate"}
                      </Button>
                    )}
                  </div>

                  {isOpen && !cert && (
                    <div className="mt-4 space-y-4 border-t border-border pt-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <fieldset>
                          <legend className="text-[13px] font-medium text-foreground">
                            Overall rating
                          </legend>
                          <div className="mt-1.5 flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setRating(n)}
                                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                                aria-pressed={rating === n}
                                className="cursor-pointer rounded p-0.5 transition-colors hover:bg-accent"
                              >
                                <Star
                                  className={cn(
                                    "h-4 w-4",
                                    n <= rating
                                      ? "fill-warning text-warning"
                                      : "fill-transparent text-border-strong"
                                  )}
                                />
                              </button>
                            ))}
                            <span className="tnum ml-1 font-mono text-xs text-muted-foreground">
                              {rating}/5
                            </span>
                          </div>
                        </fieldset>

                        <Field
                          id="cert-review"
                          label="Review"
                          required
                          hint="Shown on the certificate"
                        >
                          <Textarea
                            id="cert-review"
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder="What did this contributor deliver?"
                            className="min-h-[60px]"
                          />
                        </Field>
                      </div>

                      <fieldset>
                        <legend className="text-[13px] font-medium text-foreground">
                          Reviewer rubric
                        </legend>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Scored on a five-point scale and published on the report.
                        </p>
                        <div className="mt-2 divide-y divide-border rounded-md border border-border">
                          {RUBRIC_CRITERIA.map((criterion) => (
                            <div
                              key={criterion.key}
                              className="flex items-center justify-between gap-3 px-3 py-2"
                            >
                              <span className="text-xs text-muted-foreground">{criterion.label}</span>
                              <div
                                className="flex gap-0.5"
                                role="group"
                                aria-label={criterion.label}
                              >
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    aria-label={`${criterion.label}: ${n}`}
                                    aria-pressed={rubric[criterion.key] === n}
                                    onClick={() =>
                                      setRubric((prev) => ({ ...prev, [criterion.key]: n }))
                                    }
                                    className={cn(
                                      "h-6 w-6 cursor-pointer rounded border font-mono text-2xs transition-colors",
                                      rubric[criterion.key] >= n
                                        ? "border-foreground/25 bg-foreground/[0.08] text-foreground"
                                        : "border-border text-subtle-foreground hover:border-border-strong hover:text-foreground"
                                    )}
                                  >
                                    {n}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </fieldset>

                      <Field
                        id="cert-summary"
                        label="Reviewer summary"
                        hint="Appears on the report"
                      >
                        <Textarea
                          id="cert-summary"
                          value={summary}
                          onChange={(e) => setSummary(e.target.value)}
                          placeholder="Strengths, growth areas, and the evidence behind them."
                          className="min-h-[72px]"
                        />
                      </Field>

                      <p className="text-2xs leading-relaxed text-subtle-foreground">
                        Issuing snapshots merged pull requests, commits, attribution and milestones,
                        then publishes the report at a shareable link with a QR code.
                      </p>

                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleIssue(proposal)} disabled={issuing}>
                          {issuing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Award className="h-3.5 w-3.5" />
                          )}
                          {issuing ? "Issuing…" : "Issue certificate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpanded(null)}
                          disabled={issuing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {issued.length > 0 && (
        <Section
          title="Issued credentials"
          description="Revoking is permanent and recorded in your audit log."
          actions={
            <span className="tnum font-mono text-2xs text-subtle-foreground">
              {issued.length} total
            </span>
          }
        >
          <ul className="divide-y divide-border">
            {issued.map((c: any) => {
              const s = typeof c.studentId === "object" ? c.studentId : null;
              const isRevoking = revoking === c._id;

              return (
                <li key={c._id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{s?.name || "Student"}</p>
                        <StatusBadge status={c.revoked ? "Revoked" : "Valid"} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono text-2xs text-subtle-foreground">
                          {formatDate(c.issuedAt)}
                        </span>
                        <CopyButton
                          value={String(c.verificationCode)}
                          label="Copy verification code"
                          showValue={false}
                          size="icon"
                        />
                        <span className="max-w-40 truncate font-mono text-2xs text-subtle-foreground">
                          {String(c.verificationCode)}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {c.publicToken && (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/r/${c.publicToken}`}>
                            Open report
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/verify/${c.verificationCode}`}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Verify
                        </Link>
                      </Button>
                      {!c.revoked && (
                        <Button
                          size="sm"
                          variant="destructive-outline"
                          onClick={() => {
                            setRevoking(isRevoking ? null : c._id);
                            setRevokeReason("");
                            setError("");
                          }}
                          aria-expanded={isRevoking}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>

                  {isRevoking && !c.revoked && (
                    <div className="mt-3 space-y-2 rounded-md border border-danger-border bg-danger-subtle/50 p-3">
                      <Field
                        id={`revoke-${c._id}`}
                        label="Reason for revocation"
                        hint="Recorded in the audit log"
                        required
                      >
                        <Textarea
                          id={`revoke-${c._id}`}
                          value={revokeReason}
                          onChange={(e) => setRevokeReason(e.target.value)}
                          placeholder="e.g. Issued against the wrong student"
                          className="min-h-[56px] bg-background"
                        />
                      </Field>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={revokeBusy || revokeReason.trim().length < 5}
                          onClick={() => setConfirmRevoke(c._id)}
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                          Continue
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRevoking(null)}>
                          Cancel
                        </Button>
                        <span className="text-2xs text-subtle-foreground">
                          Revocation cannot be undone.
                        </span>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {pending.length === 0 && proposals.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden />
          Every approved contributor has been certified.
        </p>
      )}

      <ConfirmAction
        open={Boolean(confirmRevoke)}
        onOpenChange={(open) => !open && setConfirmRevoke(null)}
        title="Revoke this certificate?"
        description="The public verification page will report the credential as revoked, with the reason you gave. This cannot be undone; you would need to issue a new certificate."
        confirmLabel="Revoke permanently"
        pending={revokeBusy}
        onConfirm={() => confirmRevoke && handleRevoke(confirmRevoke)}
      />
    </div>
  );
}
