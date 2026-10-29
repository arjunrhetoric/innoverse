"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Landmark, Plus, Users, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Meta } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Table,
  TableWrap,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUser } from "@/hooks/useUser";
import { formatDate } from "@/lib/utils";

interface Cohort {
  id: string;
  name: string;
  description: string;
  joinCode: string;
  createdAt: string;
  memberCount: number;
}

export default function InstitutionDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role !== "Institution") {
      router.push("/dashboard");
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "Institution") {
      fetch("/api/cohorts", { credentials: "include" })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to load cohorts");
          setCohorts(data.cohorts ?? []);
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"))
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, user]);

  const createCohort = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/cohorts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create cohort");
      setName("");
      setDescription("");
      setShowForm(false);
      const refreshed = await fetch("/api/cohorts", { credentials: "include" }).then((r) => r.json());
      setCohorts(refreshed.cohorts ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create cohort");
    } finally {
      setCreating(false);
    }
  };

  const stats = {
    cohorts: cohorts.length,
    members: cohorts.reduce((sum, c) => sum + c.memberCount, 0),
  };

  if (authLoading || loading) {
    return (
      <AppShell>
        <InstitutionSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            <Landmark className="h-3.5 w-3.5 text-subtle-foreground" />
            Institution
          </span>
        }
        title={user?.name || "Institution"}
        description="Cohorts group the students in one program so you can follow their verified reports, share a single join code and export evidence for accreditation."
        meta={
          <>
            <Meta label="Cohorts" value={stats.cohorts} />
            <Meta label="Students" value={stats.members} />
          </>
        }
        actions={
          <Button variant="brand" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            New cohort
          </Button>
        }
      />

      {error && !showForm && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-md border border-danger-border bg-danger-subtle px-3 py-2.5"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-xs leading-relaxed text-danger">{error}</p>
        </div>
      )}

      {cohorts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No cohorts yet"
          description="A cohort is one group of students — a capstone batch or a term. Creating one gives you a join code to share, a roster with verified reports and a CSV export for accreditation."
          action={{ label: "Create cohort", onClick: () => setShowForm(true) }}
        />
      ) : (
        <Section
          title="Cohorts"
          description="Newest first. Share a join code to enrol students."
          actions={
            <Badge variant="default">
              {stats.cohorts} cohort{stats.cohorts === 1 ? "" : "s"}
            </Badge>
          }
          contentClassName="p-0"
        >
          <TableWrap sticky>
            <Table stickyHead>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Cohort</TableHead>
                  <TableHead numeric>Members</TableHead>
                  <TableHead>Join code</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="pr-5 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohorts.map((cohort) => (
                  <TableRow key={cohort.id}>
                    <TableCell className="pl-5">
                      <Link
                        href={`/dashboard/institution/cohorts/${cohort.id}`}
                        className="text-sm font-medium text-foreground hover:text-brand"
                      >
                        {cohort.name}
                      </Link>
                      {cohort.description && (
                        <p className="mt-0.5 line-clamp-1 max-w-md text-xs text-muted-foreground">
                          {cohort.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell numeric className="text-muted-foreground">
                      {cohort.memberCount}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-foreground">{cohort.joinCode}</span>
                        <CopyButton value={cohort.joinCode} size="icon" label="Copy join code" />
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {formatDate(cohort.createdAt)}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/institution/cohorts/${cohort.id}`}>
                          Open cohort
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
        </Section>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>New cohort</DialogTitle>
            <DialogDescription>
              Name the group and describe what it is working on. You get a join code as soon as it
              is created.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <FormError>{error}</FormError>
            <Field id="cohortName" label="Cohort name" hint="Visible to students" required>
              <Input
                id="cohortName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="CSE 2026 · Capstone Batch A"
                autoComplete="off"
              />
            </Field>
            <Field id="cohortDesc" label="Description" hint="Optional">
              <Textarea
                id="cohortDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this cohort is working on this term"
                className="min-h-24"
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={createCohort}
              disabled={creating || name.trim().length < 3}
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              {creating ? "Creating…" : "Create cohort"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

/** Mirrors the loaded layout: header, meta line, then the cohort table. */
function InstitutionSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="mt-3 h-7 w-64" />
        <Skeleton className="mt-2.5 h-3.5 w-full max-w-xl" />
        <Skeleton className="mt-2 h-3.5 w-2/3 max-w-md" />
        <div className="mt-4 flex gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="mt-6 h-px bg-border" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-b-0"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-64 max-w-[60%]" />
            </div>
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
