"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award, Star, Loader2, Fingerprint, AlertCircle, CheckCircle2, Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { certificates as certApi } from "@/lib/api";
import { projectChannel } from "@/lib/realtime";
import { useSSE } from "@/hooks/useSSE";
import { useUser } from "@/hooks/useUser";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function CertificateSection({ projectId, progress }: { projectId: string; progress: number }) {
  const { user } = useUser();
  const [proposals, setProposals] = useState<any[]>([]);
  const [issued, setIssued] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [done, setDone] = useState("");
  const [brandingComplete, setBrandingComplete] = useState<boolean | null>(null);
  const [brandingMissing, setBrandingMissing] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      const [data, brandingRes] = await Promise.all([
        certApi.getForProblem(projectId),
        fetch("/api/settings/branding", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
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
    issued.map((c: any) => (typeof c.studentId === "object" ? String(c.studentId._id) : String(c.studentId)))
  );
  const pending = proposals.filter((p: any) => {
    const sid = typeof p.studentId === "object" ? String(p.studentId._id) : String(p.studentId);
    return !issuedFor.has(sid);
  });

  const handleIssue = async (proposal: any) => {
    const studentId = typeof proposal.studentId === "object" ? proposal.studentId._id : proposal.studentId;
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
      await certApi.submit(formData);
      setDone("Official Innoverse certificate issued successfully.");
      setExpanded(null);
      setReview("");
      setRating(5);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to issue certificate");
    } finally {
      setIssuing(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      {brandingComplete === false && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-muted-foreground">
              {brandingMissing.length > 0
                ? `Still missing: ${brandingMissing.join(", ")}.`
                : "Add your company logo, signatory, and signature before issuing certificates."}
            </p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/settings/branding?returnTo=${encodeURIComponent(`/project/${projectId}`)}`}>Complete Branding Kit</Link>
          </Button>
        </div>
      )}

      {progress < 100 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Project progress is {progress}%. Certificates are usually issued on completion — you can still issue one now.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      {done && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-500">{done}</p>
        </div>
      )}

      {proposals.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <Award className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No approved contributors</h3>
          <p className="text-sm text-muted-foreground">Certificates can be issued once you approve a proposal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal: any, i: number) => {
            const student = typeof proposal.studentId === "object" ? proposal.studentId : null;
            const sid = student?._id ? String(student._id) : String(proposal.studentId);
            const cert = issued.find((c: any) => {
              const csid = typeof c.studentId === "object" ? String(c.studentId._id) : String(c.studentId);
              return csid === sid;
            });
            const isOpen = expanded === sid;

            return (
              <motion.div
                key={proposal._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h4 className="font-medium text-sm">{student?.name || student?.githubUsername || "Student"}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{student?.email || ""}</p>
                  </div>
                  {cert ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="text-[10px]">Issued</Badge>
                      <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                        <Fingerprint className="h-3 w-3" />
                        {String(cert.verificationCode).slice(0, 8)}…
                      </span>
                    </div>
                  ) : (
                    <Button size="sm" variant="gradient" onClick={() => { setExpanded(isOpen ? null : sid); setError(""); }}>
                      <Award className="mr-1 h-3.5 w-3.5" />
                      {isOpen ? "Cancel" : "Issue Certificate"}
                    </Button>
                  )}
                </div>

                {isOpen && !cert && (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                    <div>
                      <Label className="text-xs mb-1.5 block">Rating</Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                            <Star className={cn("h-5 w-5", n <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Review</Label>
                      <Textarea
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        placeholder="What did this contributor deliver?"
                        className="min-h-10"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      The official Innoverse certificate is generated automatically with your branding, the contribution evidence (merged PRs, commits, milestones), and a verification QR.
                    </p>
                    <Button size="sm" variant="gradient" onClick={() => handleIssue(proposal)} disabled={issuing}>
                      {issuing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Award className="mr-1 h-3.5 w-3.5" />}
                      Issue
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {issued.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Issued ({issued.length})</h4>
          <div className="space-y-2">
            {issued.map((c: any) => {
              const s = typeof c.studentId === "object" ? c.studentId : null;
              return (
                <div key={c._id} className="rounded-lg border border-border/60 bg-card p-3 flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium">{s?.name || "Student"}</span>
                  <span className="text-muted-foreground">{c.issuedAt ? formatDate(c.issuedAt) : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pending.length === 0 && proposals.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">All approved contributors have been certified.</p>
      )}
    </div>
  );
}
