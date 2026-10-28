"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Handshake,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wallet,
  FileSignature,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { formatDate } from "@/lib/utils";

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

const variantFor: Record<string, "success" | "info" | "warning" | "destructive"> = {
  Draft: "warning",
  Active: "info",
  Completed: "success",
  Cancelled: "destructive",
  Pending: "warning",
  Delivered: "info",
  Paid: "info",
  Confirmed: "success",
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

  const confirmed = data?.milestones.filter((m) => m.status === "Confirmed").length ?? 0;
  const progress = data?.milestones.length ? Math.round((confirmed / data.milestones.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-5">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/engagements">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Engagements
              </Link>
            </Button>
          </div>

          {loading ? (
            <Skeleton className="h-96 w-full rounded-2xl" />
          ) : error || !data ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <p className="text-muted-foreground">{error || "Engagement not found"}</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-medium tracking-tight sm:text-2xl">{data.title}</h1>
                      <Badge variant={variantFor[data.status]} className="text-[10px]">{data.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {data.startup.name} · {data.student.name} · {data.problem.title}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xl font-medium tracking-tight">
                      {data.currency} {data.totalAmount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {data.description && (
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{data.description}</p>
                )}

                <div className="mt-5">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{confirmed}/{data.milestones.length} confirmed</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>

                {data.contractFile && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/engagements/${data.id}/contract`}>
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Download agreement (PDF)
                      </a>
                    </Button>
                    {data.studentAcceptedAt && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <FileSignature className="h-3.5 w-3.5" />
                        Accepted {formatDate(data.studentAcceptedAt)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {data.party === "student" && data.status === "Draft" && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                  <h2 className="flex items-center gap-2 text-sm font-medium">
                    <Handshake className="h-4 w-4 text-primary" />
                    Accept this engagement
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    By accepting you agree to the milestone schedule and assign the deliverables&apos; IP
                    to {data.startup.name} once all milestones are paid.
                  </p>
                  <label className="mt-3 flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>I accept the IP assignment and confidentiality terms in the agreement.</span>
                  </label>
                  <Button
                    className="mt-4"
                    variant="gradient"
                    disabled={!acceptedTerms || busy === "accept"}
                    onClick={() => act("accept", `/api/engagements/${data.id}/accept`, { ipAssignmentAccepted: true })}
                  >
                    {busy === "accept" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Accept & generate agreement
                  </Button>
                </div>
              )}

              <div>
                <h2 className="mb-3 text-sm font-medium">Milestones</h2>
                <div className="space-y-2">
                  {data.milestones.map((m) => (
                    <div key={m.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium">{m.title}</h3>
                            <Badge variant={variantFor[m.status]} className="text-[10px]">{m.status}</Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                            <span>{data.currency} {m.amount.toLocaleString("en-IN")}</span>
                            {m.dueDate && <span>Due {formatDate(m.dueDate)}</span>}
                            {m.deliveredAt && <span>Delivered {formatDate(m.deliveredAt)}</span>}
                            {m.paidAt && <span>Marked paid {formatDate(m.paidAt)}</span>}
                            {m.confirmedAt && <span>Confirmed {formatDate(m.confirmedAt)}</span>}
                            {m.paidReference && <span className="font-mono">ref {m.paidReference}</span>}
                            {m.evidenceUrl && (
                              <a
                                href={m.evidenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                Evidence
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {data.party === "startup" && data.status === "Active" && m.status === "Delivered" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setPaying(paying === m.id ? null : m.id); setReference(""); }}
                          >
                            <Wallet className="mr-1 h-3.5 w-3.5" />
                            Mark paid
                          </Button>
                        )}
                        {data.party === "student" && data.status === "Active" && m.status === "Pending" && (
                          <Button
                            size="sm"
                            variant="gradient"
                            onClick={() => {
                              setDelivering(delivering === m.id ? null : m.id);
                              setEvidence("");
                            }}
                          >
                            <FileSignature className="mr-1 h-3.5 w-3.5" />
                            Mark delivered
                          </Button>
                        )}
                        {data.party === "student" && data.status === "Active" && m.status === "Paid" && (
                          <Button
                            size="sm"
                            variant="gradient"
                            disabled={busy === m.id}
                            onClick={() =>
                              act(
                                m.id,
                                `/api/engagements/${data.id}/milestones/${m.id}/confirm`
                              )
                            }
                          >
                            {busy === m.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                            Confirm received
                          </Button>
                        )}
                      </div>

                      {delivering === m.id && (
                        <div className="mt-3 border-t border-border/60 pt-3">
                          <Label className="mb-1.5 block text-[11px]">Evidence URL</Label>
                          <div className="flex gap-2">
                            <Input
                              value={evidence}
                              onChange={(e) => setEvidence(e.target.value)}
                              placeholder="https://github.com/owner/repo/pull/12"
                              className="h-9 text-xs"
                            />
                            <Button
                              size="sm"
                              variant="gradient"
                              disabled={busy === m.id || !evidence.trim()}
                              onClick={() =>
                                act(
                                  m.id,
                                  `/api/engagements/${data.id}/milestones/${m.id}/deliver`,
                                  { evidenceUrl: evidence.trim() }
                                )
                              }
                            >
                              {busy === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Deliver"}
                            </Button>
                          </div>
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            Paste the pull request or commit that proves the deliverable. If the
                            startup merges that PR, this milestone is marked delivered automatically.
                          </p>
                        </div>
                      )}

                      {paying === m.id && (
                        <div className="mt-3 border-t border-border/60 pt-3">
                          <Label className="mb-1.5 block text-[11px]">Payment reference (optional)</Label>
                          <div className="flex gap-2">
                            <Input
                              value={reference}
                              onChange={(e) => setReference(e.target.value)}
                              placeholder="UTR / transaction id"
                              className="h-9 font-mono text-xs"
                            />
                            <Button
                              size="sm"
                              variant="gradient"
                              disabled={busy === m.id}
                              onClick={() =>
                                act(
                                  m.id,
                                  `/api/engagements/${data.id}/milestones/${m.id}/pay`,
                                  { reference }
                                )
                              }
                            >
                              {busy === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm payment"}
                            </Button>
                          </div>
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            Innoverse records payment status; funds are transferred outside the platform.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {data.status === "Completed" && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm text-emerald-500">
                    All milestones paid and confirmed. The engagement is complete.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
