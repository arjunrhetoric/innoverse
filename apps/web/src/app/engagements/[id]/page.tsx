"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wallet,
  FileSignature,
  ExternalLink,
  Check,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Meta } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { Section } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmAction } from "@/components/ui/confirm-dialog";
import { useUser } from "@/hooks/useUser";
import { cn, formatDate } from "@/lib/utils";

interface Milestone {
  id: string;
  title: string;
  amount: number;
  dueDate: string | null;
  status: "Pending" | "Delivered" | "Paid" | "Confirmed";
  evidenceUrl: string | null;
  deliveredAt: string | null;
  paidAt: string | null;
  paidReference: string | null;
  confirmedAt: string | null;
}

interface Detail {
  id: string;
  title: string;
  description: string;
  status: "Draft" | "Active" | "Completed" | "Cancelled";
  currency: string;
  totalAmount: number;
  createdAt: string;
  studentAcceptedAt: string | null;
  studentAcceptedName: string | null;
  ipAssignmentAccepted: boolean;
  contractFile: string | null;
  party: "student" | "startup";
  student: { id: string; name: string; githubUsername: string | null; email: string | null };
  startup: { id: string; name: string };
  problem: { id: string; title: string };
  milestones: Milestone[];
}

const STAGE_ORDER: Milestone["status"][] = ["Pending", "Delivered", "Paid", "Confirmed"];

const STAGE_HINT: Record<Milestone["status"], string> = {
  Pending: "Work not yet delivered",
  Delivered: "Deliverable submitted",
  Paid: "Transfer sent by startup",
  Confirmed: "Receipt confirmed by student",
};

export default function EngagementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [delivering, setDelivering] = useState<string | null>(null);
  const [evidence, setEvidence] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [confirmMilestone, setConfirmMilestone] = useState<string | null>(null);
  const [confirmEngagement, setConfirmEngagement] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  const load = () =>
    fetch(`/api/engagements/${id}`, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Engagement not found");
        setData(json.engagement);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Engagement not found"))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (isAuthenticated) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthenticated]);

  const act = async (key: string, url: string, body?: unknown) => {
    setBusy(key);
    setError("");
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Action failed");
      await load();
      setPaying(null);
      setReference("");
      setDelivering(null);
      setEvidence("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const milestones = data?.milestones ?? [];
  const counts: Record<Milestone["status"], number> = { Pending: 0, Delivered: 0, Paid: 0, Confirmed: 0 };
  for (const m of milestones) counts[m.status] += 1;

  const confirmed = counts.Confirmed;
  const progress = milestones.length ? Math.round((confirmed / milestones.length) * 100) : 0;
  const settledAmount = milestones
    .filter((m) => m.status === "Confirmed")
    .reduce((sum, m) => sum + m.amount, 0);

  const openStages = milestones
    .filter((m) => m.status !== "Confirmed")
    .map((m) => STAGE_ORDER.indexOf(m.status));
  const currentStage = milestones.length === 0 ? 0 : openStages.length ? Math.min(...openStages) : 3;

  const money = (n: number) => `${data?.currency ?? ""} ${n.toLocaleString("en-IN")}`;

  const onSignatureFile = (file?: File) => {
    if (!file) {
      setSignatureDataUrl("");
      return;
    }
    if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 2 * 1024 * 1024) {
      setError("Signature must be a PNG or JPEG under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSignatureDataUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  if (authLoading) {
    return (
      <AppShell>
        <DetailSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {loading ? (
        <DetailSkeleton />
      ) : error && !data ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">{error || "Engagement not found"}</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/engagements">Back to engagements</Link>
          </Button>
        </div>
      ) : !data ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Engagement not found</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/engagements">Back to engagements</Link>
          </Button>
        </div>
      ) : (
        <>
          <PageHeader
            back={{ href: "/engagements", label: "Engagements" }}
            eyebrow={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={data.status} />
                <span className="eyebrow truncate">{data.problem.title}</span>
              </div>
            }
            title={data.title}
            description={data.description || undefined}
            meta={
              <>
                <Meta
                  label="Total"
                  value={
                    <>
                      <span className="text-subtle-foreground">{data.currency}</span>{" "}
                      <span className="tnum">{data.totalAmount.toLocaleString("en-IN")}</span>
                    </>
                  }
                />
                <Meta label="Milestones" value={`${milestones.length}`} />
                <Meta label="Opened" value={formatDate(data.createdAt)} />
              </>
            }
          />

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-md border border-danger-border bg-danger-subtle px-3 py-2.5"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-5">
              {data.party === "student" && data.status === "Draft" && (
                <Section
                  title="Accept this engagement"
                  description={`Accepting agrees the milestone schedule and assigns the deliverables' IP to ${data.startup.name} once every milestone is paid.`}
                >
                  <div className="space-y-4 p-5">
                    <label
                      htmlFor="accept-terms"
                      className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground"
                    >
                      <input
                        id="accept-terms"
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-brand"
                      />
                      <span>
                        I accept the IP assignment and confidentiality terms in the agreement.
                      </span>
                    </label>

                    <Field
                      id="signature"
                      label="Your signature"
                      hint="Optional PNG or JPG, under 2MB"
                    >
                      <input
                        id="signature"
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={(e) => onSignatureFile(e.target.files?.[0])}
                        className="block w-full cursor-pointer rounded-md border border-input bg-background text-xs text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-l-md file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-xs file:text-foreground"
                      />
                    </Field>
                    <p className="text-xs text-muted-foreground">
                      {signatureDataUrl
                        ? "Signature attached — it will appear on the agreement."
                        : "If omitted, your typed name is used as the signature."}
                    </p>

                    <Button
                      variant="brand"
                      disabled={!acceptedTerms || busy === "accept"}
                      onClick={() =>
                        act("accept", `/api/engagements/${data.id}/accept`, {
                          ipAssignmentAccepted: true,
                          signatureDataUrl,
                        })
                      }
                    >
                      {busy === "accept" ? <Loader2 className="animate-spin" /> : <FileSignature />}
                      Accept &amp; generate agreement
                    </Button>
                  </div>
                </Section>
              )}

              <Section
                title="Milestone pipeline"
                actions={
                  <p className="text-xs text-muted-foreground">
                    Current stage{" "}
                    <span className="font-medium text-brand">
                      {milestones.length === 0 ? "—" : STAGE_ORDER[currentStage]}
                    </span>
                  </p>
                }
              >
                {/* Stepper: Pending → Delivered → Paid → Confirmed */}
                <div className="border-b border-border p-4">
                  <ol
                    aria-label="Milestone pipeline stages"
                    className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4"
                  >
                    {STAGE_ORDER.map((stage, i) => {
                      const isCurrent = milestones.length > 0 && i === currentStage;
                      const isDone = i < currentStage;
                      return (
                        <li
                          key={stage}
                          aria-current={isCurrent ? "step" : undefined}
                          className={cn(
                            "px-3 py-3",
                            isCurrent ? "bg-brand-subtle" : "bg-card"
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-2xs font-medium",
                                isCurrent
                                  ? "border-brand bg-brand text-brand-foreground"
                                  : isDone
                                    ? "border-success-border bg-success-subtle text-success"
                                    : "border-border bg-surface-2 text-subtle-foreground"
                              )}
                            >
                              {isDone ? <Check className="h-2.5 w-2.5" /> : <span className="tnum">{i + 1}</span>}
                            </span>
                            <span
                              className={cn(
                                "truncate text-xs font-medium",
                                isCurrent
                                  ? "text-brand"
                                  : isDone
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                              )}
                            >
                              {stage}
                            </span>
                          </div>
                          <p
                            className={cn(
                              "mt-1.5 font-mono text-lg leading-none tnum",
                              isCurrent ? "text-brand" : "text-foreground"
                            )}
                          >
                            {counts[stage]}
                            <span className="text-2xs text-subtle-foreground"> / {milestones.length}</span>
                          </p>
                          <p className="mt-1 truncate text-2xs text-muted-foreground">
                            {isCurrent ? "Current stage" : STAGE_HINT[stage]}
                          </p>
                        </li>
                      );
                    })}
                  </ol>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">
                        <span className="tnum text-foreground">
                          {confirmed}/{milestones.length}
                        </span>{" "}
                        milestones confirmed
                      </span>
                      <span className="font-mono tnum text-muted-foreground">
                        {money(settledAmount)} settled of {money(data.totalAmount)}
                      </span>
                    </div>
                    <Progress value={progress} tone={progress === 100 ? "success" : "brand"} />
                  </div>
                </div>

                {milestones.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No milestones have been added to this engagement.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {milestones.map((m, i) => (
                      <li key={m.id} className="px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className="mt-0.5 w-4 shrink-0 text-right font-mono text-xs text-subtle-foreground tnum">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-medium text-foreground">{m.title}</h3>
                                <StatusBadge status={m.status} />
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="font-mono text-sm text-foreground tnum">
                                  {money(m.amount)}
                                </span>
                                <span>
                                  Due{" "}
                                  <span className="font-mono text-muted-foreground">
                                    {m.dueDate ? formatDate(m.dueDate) : "—"}
                                  </span>
                                </span>
                                {m.evidenceUrl && (
                                  <a
                                    href={m.evidenceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-brand hover:underline"
                                  >
                                    Evidence
                                    <ExternalLink className="h-3 w-3" aria-hidden />
                                  </a>
                                )}
                              </div>
                              {(m.deliveredAt || m.paidAt || m.confirmedAt || m.paidReference) && (
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-subtle-foreground">
                                  {m.deliveredAt && (
                                    <span>Delivered {formatDate(m.deliveredAt)}</span>
                                  )}
                                  {m.paidAt && <span>Marked paid {formatDate(m.paidAt)}</span>}
                                  {m.confirmedAt && (
                                    <span>Confirmed {formatDate(m.confirmedAt)}</span>
                                  )}
                                  {m.paidReference && (
                                    <span className="font-mono">ref {m.paidReference}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {data.party === "startup" &&
                              data.status === "Active" &&
                              m.status === "Delivered" && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => {
                                    setPaying(paying === m.id ? null : m.id);
                                    setReference("");
                                  }}
                                >
                                  <Wallet />
                                  Mark paid
                                </Button>
                              )}
                            {data.party === "student" &&
                              data.status === "Active" &&
                              m.status === "Pending" && (
                                <Button
                                  size="sm"
                                  variant="brand"
                                  onClick={() => {
                                    setDelivering(delivering === m.id ? null : m.id);
                                    setEvidence("");
                                  }}
                                >
                                  <FileSignature />
                                  Mark delivered
                                </Button>
                              )}
                            {data.party === "student" &&
                              data.status === "Active" &&
                              m.status === "Paid" && (
                                <Button
                                  size="sm"
                                  variant="brand"
                                  disabled={busy === m.id}
                                  onClick={() =>
                                    act(m.id, `/api/engagements/${data.id}/milestones/${m.id}/confirm`)
                                  }
                                >
                                  {busy === m.id ? (
                                    <Loader2 className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 />
                                  )}
                                  Confirm received
                                </Button>
                              )}
                            {data.party === "startup" &&
                              data.status === "Active" &&
                              m.status !== "Confirmed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy === m.id}
                                  onClick={() => setConfirmMilestone(m.id)}
                                >
                                  {busy === m.id ? (
                                    <Loader2 className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 />
                                  )}
                                  Mark complete
                                </Button>
                              )}
                          </div>
                        </div>

                        {delivering === m.id && (
                          <div className="mt-3 border-t border-border pt-3 sm:ml-7">
                            <Field
                              id={`evidence-${m.id}`}
                              label="Evidence URL"
                              hint="Pull request or commit"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                  id={`evidence-${m.id}`}
                                  value={evidence}
                                  onChange={(e) => setEvidence(e.target.value)}
                                  placeholder="https://github.com/owner/repo/pull/12"
                                  className="font-mono text-xs"
                                />
                                <Button
                                  size="sm"
                                  variant="brand"
                                  className="sm:w-auto"
                                  disabled={busy === m.id || !evidence.trim()}
                                  onClick={() =>
                                    act(m.id, `/api/engagements/${data.id}/milestones/${m.id}/deliver`, {
                                      evidenceUrl: evidence.trim(),
                                    })
                                  }
                                >
                                  {busy === m.id ? (
                                    <Loader2 className="animate-spin" />
                                  ) : (
                                    "Deliver"
                                  )}
                                </Button>
                              </div>
                            </Field>
                            <p className="mt-1.5 text-2xs text-muted-foreground">
                              Paste the pull request or commit that proves the deliverable. If the
                              startup merges that PR, this milestone is marked delivered automatically.
                            </p>
                          </div>
                        )}

                        {paying === m.id && (
                          <div className="mt-3 border-t border-border pt-3 sm:ml-7">
                            <Field
                              id={`reference-${m.id}`}
                              label="Payment reference"
                              hint="Optional"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                  id={`reference-${m.id}`}
                                  value={reference}
                                  onChange={(e) => setReference(e.target.value)}
                                  placeholder="UTR / transaction id"
                                  className="font-mono text-xs"
                                />
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="sm:w-auto"
                                  disabled={busy === m.id}
                                  onClick={() =>
                                    act(m.id, `/api/engagements/${data.id}/milestones/${m.id}/pay`, {
                                      reference,
                                    })
                                  }
                                >
                                  {busy === m.id ? (
                                    <Loader2 className="animate-spin" />
                                  ) : (
                                    "Confirm payment"
                                  )}
                                </Button>
                              </div>
                            </Field>
                            <p className="mt-1.5 text-2xs text-muted-foreground">
                              Innoverse records payment status; funds are transferred outside the
                              platform.
                            </p>
                          </div>
                        )}

                        <ConfirmAction
                          open={confirmMilestone === m.id}
                          onOpenChange={(o) => setConfirmMilestone(o ? m.id : null)}
                          title="Mark this milestone complete?"
                          description={
                            <>
                              This settles <span className="font-medium text-foreground">{m.title}</span>{" "}
                              ({money(m.amount)}) and cannot be undone. Use it only when payment was
                              settled outside Innoverse.
                            </>
                          }
                          confirmLabel="Mark complete"
                          tone="warning"
                          pending={busy === m.id}
                          onConfirm={() => {
                            setConfirmMilestone(null);
                            act(m.id, `/api/engagements/${data.id}/milestones/${m.id}/complete`);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {data.status === "Completed" && (
                <div className="flex items-start gap-2 rounded-lg border border-success-border bg-success-subtle px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <p className="text-sm text-success">
                    All milestones paid and confirmed. The engagement is complete.
                  </p>
                </div>
              )}
            </div>

            {/* Right rail: contract summary */}
            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <Section title="Contract">
                <dl className="divide-y divide-border">
                  <div className="px-5 py-4">
                    <dt className="text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Total fee
                    </dt>
                    <dd className="mt-1 font-mono text-xl font-semibold tracking-tight text-foreground tnum">
                      {money(data.totalAmount)}
                    </dd>
                    <dd className="mt-0.5 text-2xs text-subtle-foreground">
                      <span className="tnum">{money(settledAmount)}</span> settled across{" "}
                      <span className="tnum">{milestones.length}</span> milestones
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4 px-5 py-3">
                    <div>
                      <dt className="text-2xs uppercase tracking-[0.08em] text-subtle-foreground">
                        Startup
                      </dt>
                      <dd className="mt-0.5 truncate text-sm text-foreground">{data.startup.name}</dd>
                    </div>
                    <div>
                      <dt className="text-2xs uppercase tracking-[0.08em] text-subtle-foreground">
                        Student
                      </dt>
                      <dd className="mt-0.5 truncate text-sm text-foreground">{data.student.name}</dd>
                    </div>
                  </div>
                  <div className="space-y-2 px-5 py-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <dt className="text-muted-foreground">Confirmed</dt>
                      <dd className="font-mono text-foreground tnum">
                        {confirmed} / {milestones.length}
                      </dd>
                    </div>
                    <Progress value={progress} tone={progress === 100 ? "success" : "brand"} />
                  </div>
                  <div className="px-5 py-3">
                    <dt className="sr-only">Agreement</dt>
                    <dd>
                      {data.contractFile ? (
                        <Button variant="outline" size="sm" className="w-full" asChild>
                          <a href={`/api/engagements/${data.id}/contract`}>
                            <Download />
                            Download agreement
                          </a>
                        </Button>
                      ) : (
                        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                          The agreement is generated when the student accepts.
                        </p>
                      )}
                      {data.studentAcceptedAt && (
                        <p className="mt-2 text-2xs text-muted-foreground">
                          Accepted{" "}
                          <span className="font-mono">{formatDate(data.studentAcceptedAt)}</span>
                          {data.studentAcceptedName ? ` by ${data.studentAcceptedName}` : ""}
                        </p>
                      )}
                      {!data.studentAcceptedAt && data.status === "Draft" && (
                        <p className="mt-2 text-2xs text-muted-foreground">
                          Awaiting the student&apos;s acceptance.
                        </p>
                      )}
                    </dd>
                  </div>
                </dl>
              </Section>

              {data.party === "startup" && data.status === "Active" && (
                <Section
                  title="Close engagement"
                  description="Confirms every remaining milestone and closes the engagement. Irreversible."
                >
                  <div className="p-5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={busy === "complete-engagement"}
                      onClick={() => setConfirmEngagement(true)}
                    >
                      {busy === "complete-engagement" ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <CheckCircle2 />
                      )}
                      Mark engagement complete
                    </Button>
                  </div>
                </Section>
              )}

              <p className="px-1 text-2xs leading-relaxed text-muted-foreground">
                Innoverse records milestone and payment status. Money moves outside the platform;
                repository access is governed by the separate collaboration agreement.
              </p>
            </aside>
          </div>

          <ConfirmAction
            open={confirmEngagement}
            onOpenChange={setConfirmEngagement}
            title="Close this engagement?"
            description="Every remaining milestone will be marked complete and the engagement closed. This cannot be undone — use it only when payment happened offline."
            confirmLabel="Mark complete"
            tone="warning"
            pending={busy === "complete-engagement"}
            onConfirm={() => {
              setConfirmEngagement(false);
              act("complete-engagement", `/api/engagements/${data.id}/complete`);
            }}
          />
        </>
      )}
    </AppShell>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-7 w-72" />
      <Skeleton className="mt-2 h-4 w-full max-w-xl" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}
