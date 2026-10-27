"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Landmark, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { signIn } from "next-auth/react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InstitutionRegisterPage() {
  const [institutionName, setInstitutionName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionName, name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard/institution",
      });
      if (!result || result.error) {
        throw new Error("Account created, but sign-in failed. Try signing in.");
      }
      window.location.href = result.url || "/dashboard/institution";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-md">
          <Link href="/login" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-8">
            <Landmark className="mb-4 h-8 w-8 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Create an institution account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              For universities and programs running industry-sponsored capstones. No GitHub account needed.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="institutionName" className="mb-1.5 block text-sm">Institution name</Label>
                <Input id="institutionName" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} placeholder="State Tech University" required className="h-11" />
              </div>
              <div>
                <Label htmlFor="name" className="mb-1.5 block text-sm">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Program coordinator" required className="h-11" />
              </div>
              <div>
                <Label htmlFor="email" className="mb-1.5 block text-sm">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coordinator@university.edu" required className="h-11" />
              </div>
              <div>
                <Label htmlFor="password" className="mb-1.5 block text-sm">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters, letter + number" required className="h-11" />
              </div>

              {error && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </p>
              )}

              <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create account
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
