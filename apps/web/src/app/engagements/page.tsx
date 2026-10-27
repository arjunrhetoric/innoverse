"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Handshake, Plus, Loader2, AlertCircle, ArrowRight, Trash2, Info } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { formatDate } from "@/lib/utils";

interface Engagement {
  id: string;
  title: string;
  status: "Draft" | "Active" | "Completed" | "Cancelled";
  currency: string;
  totalAmount: number;
  createdAt: string;
  student: { id: string; name: string };
  startup: { id: string; name: string };
  problem: { id: string; title: string };
  milestoneCount: number;
  paidCount: number;
  confirmedCount: number;
}

interface Challenge {
  _id: string;
  title: string;
}

interface ApprovedStudent {
  _id: string;
  name: string;
  email?: string;
}

const statusVariant: Record<string, "success" | "info" | "warning" | "destructive"> = {
  Draft: "warning",
  Active: "info",
  Completed: "success",
  Cancelled: "destructive",
};

export default function EngagementsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [problemId, setProblemId] = useState("");
  const [students, setStudents] = useState<ApprovedStudent[]>([]);
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [milestones, setMilestones] = useState<Array<{ title: string; amount: string; dueDate: string }>>([
    { title: "Kickoff deliverable", amount: "", dueDate: "" },
  ]);
  const [creating, setCreating] = useState(false);

  const isStartup = user?.role === "Startup";

  const load = () =>
    fetch("/api/engagements", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load engagements");
        setEngagements(data.engagements ?? []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role !== "Startup" && user?.role !== "Student") {
      router.push("/dashboard");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    if (!isStartup) return;
    fetch("/api/dashboard/startup", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setChallenges(data.challenges ?? []))
      .catch(() => null);
  }, [isStartup]);

  useEffect(() => {
    if (!problemId) {
      setStudents([]);
      setStudentId("");
      return;
    }
    fetch(`/api/certificates/problem/${problemId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) =>
        setStudents(
          (data.approvedProposals ?? []).map((p: any) => ({
            _id: typeof p.studentId === "object" ? p.studentId._id : p.studentId,
            name: typeof p.studentId === "object" ? p.studentId.name : "Student",
            email: typeof p.studentId === "object" ? p.studentId.email : undefined,
          }))
        )
      )
      .catch(() => setStudents([]));
  }, [problemId]);

  const total = useMemo(
    () => milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0),
    [milestones]
  );

  const create = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/engagements", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId,
          studentId,
          title,
          description,
          currency,
          milestones: milestones
            .filter((m) => m.title.trim() && Number(m.amount) > 0)
            .map((m) => ({
              title: m.title,
              amount: Number(m.amount),
              dueDate: m.dueDate || undefined,
            })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not create engagement");
      setShowForm(false);
      setTitle("");
      setDescription("");
      setProblemId("");
      setStudentId("");
      setMilestones([{ title: "Kickoff deliverable", amount: "", dueDate: "" }]);
      await load();
      router.push(`/engagements/${data.engagement._id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create engagement");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-medium tracking-tight sm:text-3xl">
                <Handshake className="h-6 w-6 text-primary" />
                Engagements
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {isStartup
                  ? "Scope paid work with an approved student. Milestones, payments and the signed agreement live in one place."
                  : "Paid work you have agreed with a startup. Confirm each payment when it lands."}
              </p>
            </div>
            {isStartup && (
              <Button variant="gradient" onClick={() => setShowForm((v) => !v)}>
                <Plus className="mr-2 h-4 w-4" />
                New engagement
              </Button>
            )}
          </motion.div>

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="mt-5 flex gap-2 rounded-xl border border-border bg-card p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">What is an engagement?</p>
              <p className="mt-0.5">
                An optional, paid scope agreed after a project is approved: milestones with amounts,
                a signed agreement, and payment tracking. Repository access is governed separately by
                the collaboration agreement the student signs before starting. Payments are recorded
                here; money moves outside the platform.
              </p>
            </div>
          </div>

          {isStartup && showForm && (
            <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-sm">Challenge</Label>
                  <select
                    value={problemId}
                    onChange={(e) => setProblemId(e.target.value)}
                    className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Select a challenge</option>
                    {challenges.map((c) => (
                      <option key={c._id} value={c._id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm">Approved student</Label>
                  <select
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    disabled={!problemId}
                    className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm disabled:opacity-50"
                  >
                    <option value="">Select a student</option>
                    {students.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-sm">Engagement title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Build the telemetry ingestion service" className="h-11" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Scope</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deliverables, expectations, working arrangement" className="min-h-16" />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-sm">Milestones</Label>
                  <span className="text-xs text-muted-foreground">Total: {currency} {total.toLocaleString("en-IN")}</span>
                </div>
                <div className="space-y-2">
                  {milestones.map((m, i) => (
                    <div key={i} className="grid gap-2 sm:grid-cols-[1fr_140px_150px_auto]">
                      <Input
                        value={m.title}
                        onChange={(e) => setMilestones((prev) => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                        placeholder="Deliverable"
                        className="h-10"
                      />
                      <Input
                        value={m.amount}
                        onChange={(e) => setMilestones((prev) => prev.map((x, j) => j === i ? { ...x, amount: e.target.value.replace(/[^0-9.]/g, "") } : x))}
                        placeholder="Amount"
                        inputMode="decimal"
                        className="h-10"
                      />
                      <Input
                        type="date"
                        value={m.dueDate}
                        onChange={(e) => setMilestones((prev) => prev.map((x, j) => j === i ? { ...x, dueDate: e.target.value } : x))}
                        className="h-10"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-destructive"
                        disabled={milestones.length === 1}
                        onClick={() => setMilestones((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  disabled={milestones.length >= 10}
                  onClick={() => setMilestones((prev) => [...prev, { title: "", amount: "", dueDate: "" }])}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add milestone
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="gradient"
                  onClick={create}
                  disabled={creating || !problemId || !studentId || title.trim().length < 3 || total <= 0}
                >
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create engagement
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="mt-6 space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : engagements.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-border py-16 text-center">
              <Handshake className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {isStartup ? "No engagements yet. Create one from an approved student." : "No engagements yet. A startup will invite you after approving your proposal."}
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {engagements.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{e.title}</h3>
                        <Badge variant={statusVariant[e.status]} className="text-[10px]">{e.status}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {isStartup ? e.student.name : e.startup.name} · {e.problem.title}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        <span>{e.currency} {e.totalAmount.toLocaleString("en-IN")}</span>
                        <span>{e.confirmedCount}/{e.milestoneCount} paid & confirmed</span>
                        <span>Created {formatDate(e.createdAt)}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/engagements/${e.id}`}>
                        Open
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
