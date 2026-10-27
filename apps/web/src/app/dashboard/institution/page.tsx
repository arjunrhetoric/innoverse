"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Landmark, Plus, Users, FileCheck2, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { QuickLinks } from "@/components/dashboard/quick-links";

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

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-5xl">
          <QuickLinks />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-medium tracking-tight sm:text-3xl">
                <Landmark className="h-6 w-6 text-primary" />
                Cohorts
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Run industry-sponsored capstones and track verified student outcomes for accreditation.
              </p>
            </div>
            <Button variant="gradient" onClick={() => setShowForm((v) => !v)}>
              <Plus className="mr-2 h-4 w-4" />
              New cohort
            </Button>
          </motion.div>

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {showForm && (
            <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
              <div>
                <Label htmlFor="cohortName" className="mb-1.5 block text-sm">Cohort name</Label>
                <Input
                  id="cohortName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="CSE 2026 · Capstone Batch A"
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="cohortDesc" className="mb-1.5 block text-sm">Description (optional)</Label>
                <Textarea
                  id="cohortDesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this cohort is working on this term"
                  className="min-h-16"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="gradient" onClick={createCohort} disabled={creating || name.trim().length < 3}>
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create cohort
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Cohorts</p>
              <p className="mt-1 text-2xl font-medium tracking-tight">{stats.cohorts}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Students</p>
              <p className="mt-1 text-2xl font-medium tracking-tight">{stats.members}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Evidence source</p>
              <p className="mt-1 text-sm font-medium">GitHub + startup sign-off</p>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : cohorts.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border py-16 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Create your first cohort and share its join code with students.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {cohorts.map((cohort, i) => (
                <motion.div
                  key={cohort.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium">{cohort.name}</h3>
                      {cohort.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {cohort.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {cohort.memberCount} member{cohort.memberCount === 1 ? "" : "s"}
                        </Badge>
                        <span className="font-mono">join code: {cohort.joinCode}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/institution/cohorts/${cohort.id}`}>
                        <FileCheck2 className="mr-1 h-3.5 w-3.5" />
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
