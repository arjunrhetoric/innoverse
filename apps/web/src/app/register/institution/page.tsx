"use client";

import { useState } from "react";
import Link from "next/link";
import { Landmark, Check } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";

const included = [
  "Cohorts with join codes students can redeem",
  "Participation, merged pull requests and skills coverage per cohort",
  "Every student's Proof-of-Work Report, in one place",
  "CSV export for accreditation and reporting",
];

export default function InstitutionRegisterPage() {
  const [institutionName, setInstitutionName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (!institutionName.trim()) next.institutionName = "Enter the institution name.";
    if (!name.trim()) next.name = "Enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      next.email = "Enter a valid email address.";
    if (password.length < 10) next.password = "Use at least 10 characters.";
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
      next.password = "Include at least one letter and one number.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
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
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      {/* Form */}
      <main className="order-2 flex items-center justify-center px-4 py-12 sm:px-8 lg:order-1">
        <div className="w-full max-w-[420px]">
          <Link
            href="/login"
            className="mb-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to sign in
          </Link>

          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card">
            <Landmark className="h-4 w-4 text-foreground" />
          </span>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Create an institution account
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            For universities and programs running industry-sponsored capstones. No
            GitHub account needed.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            <Field id="institutionName" label="Institution name" error={fieldErrors.institutionName} required>
              <Input
                id="institutionName"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="State Tech University"
                autoComplete="organization"
                aria-invalid={Boolean(fieldErrors.institutionName) || undefined}
                required
              />
            </Field>

            <Field id="name" label="Your name" error={fieldErrors.name} required>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Program coordinator"
                autoComplete="name"
                aria-invalid={Boolean(fieldErrors.name) || undefined}
                required
              />
            </Field>

            <Field id="email" label="Email" error={fieldErrors.email} hint="Institution domain preferred" required>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coordinator@university.edu"
                aria-invalid={Boolean(fieldErrors.email) || undefined}
                required
              />
            </Field>

            <Field
              id="password"
              label="Password"
              error={fieldErrors.password}
              hint="10+ characters, letter and number"
              required
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(fieldErrors.password) || undefined}
                required
              />
            </Field>

            <FormError>{error}</FormError>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-2xs leading-relaxed text-subtle-foreground">
            By creating an account you agree to use cohort data only for the purpose it
            was collected: supporting and reporting on student work.
          </p>
        </div>
      </main>

      {/* Context */}
      <aside className="order-1 hidden flex-col justify-between border-l border-border bg-surface px-10 py-10 lg:order-2 lg:flex xl:px-14">
        <Link href="/" className="flex items-center gap-2" aria-label="Innoverse home">
          <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-foreground">
            <span className="text-[12px] font-bold leading-none text-background">I</span>
          </span>
          <span className="text-[13px] font-semibold tracking-[0.02em] text-foreground">Innoverse</span>
        </Link>

        <div className="max-w-sm">
          <p className="eyebrow">For institutions</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-foreground">
            Evidence your accreditation office can actually use.
          </h2>
          <ul className="mt-7 space-y-3">
            {included.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-2xs text-subtle-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </aside>
    </div>
  );
}
