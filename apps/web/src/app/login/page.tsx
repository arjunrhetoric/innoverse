"use client";

import { Suspense, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { GithubIcon as Github } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

import { signIn } from "next-auth/react";

function LoginError() {
  const params = useSearchParams();
  const error = params.get("error");
  if (!error) return null;

  const message =
    error === "GitHubEmailMissing"
      ? "GitHub did not return an email. Make your email visible to the app, then try again."
      : "Sign-in failed. Check your details, or confirm the GitHub OAuth callback URL.";

  return <p className="mt-4 text-sm text-destructive text-center">{message}</p>;
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
    <div className="min-h-screen flex items-center justify-center relative bg-background">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="rounded-xl p-8 border border-border bg-card">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="h-9 w-9 rounded-md bg-foreground flex items-center justify-center">
                <span className="text-background font-bold text-base">I</span>
              </div>
              <span className="text-xl font-semibold tracking-tight">INNOVERSE</span>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome Back</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Sign in to continue to your innovation journey
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => { setTab("github"); setError(""); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "github" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Students & startups
            </button>
            <button
              type="button"
              onClick={() => { setTab("institution"); setError(""); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "institution" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Institutions
            </button>
          </div>

          {tab === "github" ? (
            <Button
              variant="default"
              size="lg"
              className="w-full"
              onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            >
              <Github className="mr-2 h-5 w-5" />
              Continue with GitHub
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>
          ) : (
            <form onSubmit={institutionLogin} className="space-y-4">
              <div>
                <Label htmlFor="email" className="mb-1.5 block text-sm">Institution email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coordinator@university.edu"
                  required
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="password" className="mb-1.5 block text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              {error && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </p>
              )}
              <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign in as institution
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                New to Innoverse?{" "}
                <Link href="/register/institution" className="font-medium text-brand-bright hover:underline">
                  Create an institution account
                </Link>
              </p>
            </form>
          )}

          <Suspense fallback={null}>
            <LoginError />
          </Suspense>

          <div className="mt-8 space-y-3">
            {[
              "Access real startup challenges",
              "Collaborate via GitHub repos",
              "Earn verified certificates",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-brand-bright shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link href="#" className="text-brand-bright hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="#" className="text-brand-bright hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
