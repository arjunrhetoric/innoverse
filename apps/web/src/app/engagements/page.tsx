"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Loader2,
  AlertCircle,
  Handshake,
  ArrowRight,
  Trash2,
  Compass,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { Section } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableWrap,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useUser } from "@/hooks/useUser";
import { cn, formatDate } from "@/lib/utils";

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
    <AppShell>
      <PageHeader
        eyebrow={<span className="eyebrow">Workspace · Contracted work</span>}
        title="Engagements"
        description="Paid, contracted work with one approved student — a separate agreement from the challenge itself. Each engagement tracks its own scope, fee and milestone payments."
        actions={
          isStartup ? (
            <Button variant="default" onClick={() => setShowForm((v) => !v)}>
              <Plus />
              New engagement
            </Button>
          ) : undefined
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

      {isStartup && showForm && (
        <Section
          className="mb-6"
          title="New engagement"
          description="Choose the approved challenge and student, then split the fee into milestones. The student accepts the schedule before work starts."
        >
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="engagement-challenge" label="Challenge" hint="Challenges you own">
                <Select
                  id="engagement-challenge"
                  value={problemId}
                  onChange={(e) => setProblemId(e.target.value)}
                >
                  <option value="">Select a challenge</option>
                  {challenges.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                id="engagement-student"
                label="Approved student"
                hint={problemId ? undefined : "Pick a challenge first"}
              >
                <Select
                  id="engagement-student"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={!problemId}
                >
                  <option value="">Select a student</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field
              id="engagement-title"
              label="Engagement title"
              hint="One line the student will recognise"
            >
              <Input
                id="engagement-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Build the telemetry ingestion service"
              />
            </Field>

            <Field
              id="engagement-scope"
              label="Scope"
              hint="Deliverables, expectations, working arrangement"
            >
              <Textarea
                id="engagement-scope"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deliverables, expectations, working arrangement"
                className="min-h-16"
              />
            </Field>

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3 className="text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground">
                  Milestones
                </h3>
                <span className="font-mono text-xs text-muted-foreground">
                  Total{" "}
                  <span className="tnum text-foreground">
                    {currency} {total.toLocaleString("en-IN")}
                  </span>
                </span>
              </div>
              <div className="space-y-2">
                {milestones.map((m, i) => (
                  <div key={i} className="rounded-md border border-border bg-surface-2/50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground">
                        Milestone {i + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-danger"
                        aria-label={`Remove milestone ${i + 1}`}
                        disabled={milestones.length === 1}
                        onClick={() => setMilestones((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_140px_150px]">
                      <Field id={`milestone-title-${i}`} label="Deliverable">
                        <Input
                          id={`milestone-title-${i}`}
                          value={m.title}
                          onChange={(e) =>
                            setMilestones((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                            )
                          }
                          placeholder="Deliverable"
                        />
                      </Field>
                      <Field id={`milestone-amount-${i}`} label="Amount">
                        <Input
                          id={`milestone-amount-${i}`}
                          value={m.amount}
                          onChange={(e) =>
                            setMilestones((prev) =>
                              prev.map((x, j) =>
                                j === i
                                  ? { ...x, amount: e.target.value.replace(/[^0-9.]/g, "") }
                                  : x
                              )
                            )
                          }
                          placeholder="0"
                          inputMode="decimal"
                          className="font-mono tnum"
                        />
                      </Field>
                      <Field id={`milestone-due-${i}`} label="Due date">
                        <Input
                          id={`milestone-due-${i}`}
                          type="date"
                          value={m.dueDate}
                          onChange={(e) =>
                            setMilestones((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, dueDate: e.target.value } : x))
                            )
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                disabled={milestones.length >= 10}
                onClick={() =>
                  setMilestones((prev) => [...prev, { title: "", amount: "", dueDate: "" }])
                }
              >
                <Plus />
                Add milestone
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <Button
                variant="default"
                onClick={create}
                disabled={
                  creating || !problemId || !studentId || title.trim().length < 3 || total <= 0
                }
              >
                {creating ? <Loader2 className="animate-spin" /> : null}
                Create engagement
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <p className="text-2xs text-muted-foreground">
                Needs a title, an approved student and at least one funded milestone.
              </p>
            </div>
          </div>
        </Section>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <SkeletonRows rows={4} />
        </div>
      ) : engagements.length === 0 ? (
        <div>
          <PipelineLegend className="mb-6" />
          <EmptyState
            icon={Handshake}
            title="No engagements yet"
            description={
            isStartup
              ? "An engagement starts when you select an approved student from their proposal and agree a milestone schedule. Approve a proposal first, then set the scope and fee here."
              : "An engagement starts when a startup selects you from an approved proposal and sends a milestone agreement. Until then, keep applying to challenges."
          }
          action={
            isStartup
              ? { label: "Review candidates", href: "/candidates" }
              : { label: "Browse challenges", href: "/explore" }
          }
          secondary={
            isStartup
              ? { label: "Open dashboard", href: "/dashboard/startup" }
              : { label: "My proposals", href: "/dashboard/student" }
          }
        />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Engagement</TableHead>
                  <TableHead numeric className="hidden sm:table-cell">
                    Amount
                  </TableHead>
                  <TableHead numeric className="hidden md:table-cell">
                    Next milestone
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Opened</TableHead>
                  <TableHead className="pr-4 text-right">
                    <span className="sr-only">Action</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {engagements.map((e) => {
                  const open = Math.max(e.milestoneCount - e.confirmedCount, 0);
                  const counterpart = isStartup
                    ? `Student · ${e.student.name}`
                    : `Startup · ${e.startup.name}`;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="max-w-[22rem] pl-4">
                        <Link
                          href={`/engagements/${e.id}`}
                          className="block truncate text-sm font-medium text-foreground hover:text-brand hover:underline"
                        >
                          {e.title}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {counterpart} · {e.problem.title}
                        </p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground sm:hidden">
                          <span className="text-subtle-foreground">{e.currency}</span>{" "}
                          <span className="tnum text-foreground">
                            {e.totalAmount.toLocaleString("en-IN")}
                          </span>{" "}
                          · {open === 0 ? "all settled" : `${open} open`}
                        </p>
                      </TableCell>
                      <TableCell
                        numeric
                        className="hidden whitespace-nowrap font-mono text-sm sm:table-cell"
                      >
                        <span className="text-subtle-foreground">{e.currency}</span>{" "}
                        <span className="tnum">{e.totalAmount.toLocaleString("en-IN")}</span>
                      </TableCell>
                      <TableCell numeric className="hidden md:table-cell">
                        {open === 0 ? (
                          <span className="text-xs text-muted-foreground">All settled</span>
                        ) : (
                          <>
                            <span className="font-mono text-sm tnum">
                              {Math.min(e.confirmedCount + 1, e.milestoneCount)}
                              <span className="text-subtle-foreground"> / {e.milestoneCount}</span>
                            </span>
                            <p className="mt-0.5 text-2xs text-muted-foreground">{open} open</p>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={e.status} />
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap font-mono text-xs text-muted-foreground lg:table-cell">
                        {formatDate(e.createdAt)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/engagements/${e.id}`} aria-label={`Open ${e.title}`}>
                            Open
                            <ArrowRight />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableWrap>
        </div>
      )}

      {!loading && engagements.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          {isStartup ? (
            <>
              Engagements start from an approved proposal.{" "}
              <Link
                href="/candidates"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                <Users className="h-3 w-3" aria-hidden /> Review candidates
              </Link>
            </>
          ) : (
            <>
              Payments settle outside Innoverse — confirm each milestone once the transfer lands.{" "}
              <Link
                href="/explore"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                <Compass className="h-3 w-3" aria-hidden /> Find more challenges
              </Link>
            </>
          )}
        </p>
      )}
    </AppShell>
  );
}

/** Static explanation of the milestone pipeline; shown even when the list is empty. */
function PipelineLegend({ className }: { className?: string }) {
  const steps = ["Pending", "Delivered", "Paid", "Confirmed"];
  return (
    <ol
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border border-border bg-card px-4 py-3",
        className
      )}
      aria-label="Engagement milestone pipeline"
    >
      {steps.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-border font-mono text-[9px] text-subtle-foreground">
              {i + 1}
            </span>
            <span className="text-xs text-muted-foreground">{step}</span>
          </span>
          {i < steps.length - 1 && (
            <span aria-hidden className="text-subtle-foreground">
              →
            </span>
          )}
        </li>
      ))}
      <li className="ml-auto text-2xs text-subtle-foreground">
        Student delivers · startup pays · student confirms
      </li>
    </ol>
  );
}
