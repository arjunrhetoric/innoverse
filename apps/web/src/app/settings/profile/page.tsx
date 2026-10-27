"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { UserCircle2, Loader2, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";

interface Profile {
  name: string;
  githubUsername: string | null;
  headline: string | null;
  skills: string[];
  location: string | null;
  profilePublic: boolean;
}

export default function ProfileSettingsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [cohorts, setCohorts] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [cohortMessage, setCohortMessage] = useState("");
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!authLoading && user?.role !== "Student") {
      router.push("/dashboard");
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "Student") return;
    // Load once. Session refetches on window focus must not overwrite
    // in-progress form edits.
    if (loadedOnce.current) return;
    loadedOnce.current = true;

    fetch("/api/talent/me", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load profile");
        setProfile(data.profile);
        setHeadline(data.profile.headline ?? "");
        setLocation(data.profile.location ?? "");
        setSkills((data.profile.skills ?? []).join(", "));
        setIsPublic(Boolean(data.profile.profilePublic));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));

    fetch("/api/cohorts/mine", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setCohorts(data.cohorts ?? []))
      .catch(() => null);
  }, [isAuthenticated, user?.role]);

  const joinCohort = async () => {
    setJoining(true);
    setCohortMessage("");
    try {
      const res = await fetch("/api/cohorts/join", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not join cohort");
      setCohortMessage(data.message);
      setJoinCode("");
      const mine = await fetch("/api/cohorts/mine", { credentials: "include" }).then((r) => r.json());
      setCohorts(mine.cohorts ?? []);
    } catch (err: unknown) {
      setCohortMessage(err instanceof Error ? err.message : "Could not join cohort");
    } finally {
      setJoining(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setDone("");
    try {
      const res = await fetch("/api/talent/me", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          location,
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          profilePublic: isPublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save");
      setDone(data.message);
      setProfile((prev) => (prev ? { ...prev, profilePublic: isPublic } : prev));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="px-4 pb-16 pt-24">
          <div className="mx-auto max-w-2xl">
            <Skeleton className="mb-6 h-10 w-64 rounded-lg" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="flex items-center gap-2 text-2xl font-medium tracking-tight sm:text-3xl">
              <UserCircle2 className="h-6 w-6 text-primary" />
              Talent profile
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Publish a public profile so hiring teams can find your verified reports. Nothing is
              listed until you turn visibility on.
            </p>
          </motion.div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {done && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <p className="text-sm text-emerald-500">{done}</p>
              {isPublic && profile && (
                <Link
                  href={`/talent/${user?.id}`}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-4"
                >
                  View public profile
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}

          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-background p-4">
              <div>
                <p className="text-sm font-medium">List me in the talent directory</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Only your name, headline, skills, location, GitHub handle and non-revoked reports
                  are shown.
                </p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            <div>
              <Label htmlFor="headline" className="mb-1.5 block text-sm">Headline</Label>
              <Input
                id="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Full-stack developer · React + Node"
                className="h-11"
              />
            </div>

            <div>
              <Label htmlFor="location" className="mb-1.5 block text-sm">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Bengaluru, India"
                className="h-11"
              />
            </div>

            <div>
              <Label htmlFor="skills" className="mb-1.5 block text-sm">Skills (comma separated)</Label>
              <Input
                id="skills"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React, TypeScript, MongoDB"
                className="h-11"
              />
            </div>

            <Button variant="gradient" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save profile
            </Button>
          </div>

          <div className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-6">
            <div>
              <h2 className="text-sm font-medium">Cohort</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Join your university cohort with the code your coordinator shared.
              </p>
            </div>

            {cohorts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {cohorts.map((c) => (
                  <Badge key={c.id} variant="secondary" className="text-[10px]">
                    {c.name}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="JOIN CODE"
                className="h-11 font-mono uppercase"
              />
              <Button
                variant="outline"
                onClick={joinCohort}
                disabled={joining || joinCode.trim().length < 6}
                className="shrink-0"
              >
                {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Join
              </Button>
            </div>
            {cohortMessage && (
              <p className="text-xs text-muted-foreground">{cohortMessage}</p>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
