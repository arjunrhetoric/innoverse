"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertCircle, Check } from "lucide-react";
import { GithubIcon as Github } from "@/components/ui/icons";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SegmentedList, SegmentedTrigger, Tabs, TabsContent } from "@/components/ui/tabs";

const proofPoints = [
  "Every pull request, review and merge is attached to the challenge it belongs to.",
  "One collaboration agreement, one milestone plan, one shared record.",
  "Completed work ends in a public report anyone can verify.",
];

function LoginError() {
  const params = useSearchParams();
  const error = params.get("error");
  if (!error) return null;

  const message =
    error === "GitHubEmailMissing"
      ? "GitHub did not share an email address. Make your email visible to the app, then try again."
      : "Sign-in failed. Check your details, or confirm the GitHub OAuth callback URL.";

  return (
    <p
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-md border border-danger-border bg-danger-subtle px-3 py-2 text-xs leading-relaxed text-danger"
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

export default function LoginPage() {
  const [tab, setTab] = useState<"github" | "institution">("github");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const institutionLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard/institution",
      });
      if (!result || result.error) {
        setError("Invalid email or password.");
        return;
      }
      window.location.href = result.url || "/dashboard/institution";
    } catch {
      setError("Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Context panel */}
      <aside className="hidden flex-col justify-between border-r border-border bg-surface px-10 py-10 lg:flex xl:px-14">
        <Link href="/" className="flex items-center gap-2" aria-label="Innoverse home">
          <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-foreground">
            <span className="text-[12px] font-bold leading-none text-background">I</span>
          </span>
          <span className="text-[13px] font-semibold tracking-[0.02em] text-foreground">Innoverse</span>
        </Link>

        <div className="max-w-md">
          <p className="eyebrow">Sign in</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-foreground">
            The work is the credential.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Innoverse reads real GitHub activity and turns it into evidence a hiring
            manager can audit — without a single self-reported line on a résumé.
          </p>
          <ul className="mt-8 space-y-3">
            {proofPoints.map((point) => (
              <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-2xs text-subtle-foreground">
          Free for students. Startups post challenges at no cost during onboarding.
        </p>
      </aside>

      {/* Form panel */}
      <main id="main" className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-[392px]">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 lg:hidden" aria-label="Innoverse home">
            <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-foreground">
              <span className="text-[12px] font-bold leading-none text-background">I</span>
            </span>
            <span className="text-[13px] font-semibold tracking-[0.02em] text-foreground">Innoverse</span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in to Innoverse</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Students and startups use GitHub. Institutions use an email and password.
          </p>

          <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setError(""); }} className="mt-6">
            <SegmentedList className="mb-6 grid w-full grid-cols-2">
              <SegmentedTrigger value="github" className="justify-center">
                Students &amp; startups
              </SegmentedTrigger>
              <SegmentedTrigger value="institution" className="justify-center">
                Institutions
              </SegmentedTrigger>
            </SegmentedList>

            <TabsContent value="github" className="mt-0">
              <Button
                size="lg"
                className="w-full"
                onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
              >
                <Github className="h-4 w-4" />
                Continue with GitHub
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                We request repository access so commits, reviews and merges can be
                attributed to the right person. You can revoke it from GitHub at any time.
              </p>
              <p className="mt-6 text-xs text-muted-foreground">
                New here?{" "}
                <Link href="/role-selection" className="font-medium text-foreground hover:underline">
                  Choose a role to get started
                </Link>
              </p>
            </TabsContent>

            <TabsContent value="institution" className="mt-0">
              <form onSubmit={institutionLogin} className="space-y-4" noValidate>
                <Field id="email" label="Institution email" required>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="coordinator@university.edu"
                    aria-invalid={Boolean(error) || undefined}
                    required
                  />
                </Field>
                <Field id="password" label="Password" required>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={Boolean(error) || undefined}
                    required
                  />
                </Field>

                <FormError>{error}</FormError>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>

              <p className="mt-6 text-xs text-muted-foreground">
                New to Innoverse?{" "}
                <Link href="/register/institution" className="font-medium text-foreground hover:underline">
                  Create an institution account
                </Link>
              </p>
            </TabsContent>
          </Tabs>

          <Suspense fallback={null}>
            <LoginError />
          </Suspense>

          <p className="mt-10 border-t border-border pt-5 text-2xs leading-relaxed text-subtle-foreground">
            By continuing you agree that GitHub activity on Innoverse challenges may be
            published in a Proof-of-Work Report. Nothing is published until a challenge
            is completed and signed off.
          </p>

          <p className="mt-4 text-2xs text-subtle-foreground">
            <Link href="/" className="hover:text-muted-foreground">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
