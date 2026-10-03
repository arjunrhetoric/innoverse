"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { GithubIcon as Github } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { signIn } from "next-auth/react";

function LoginError() {
  const params = useSearchParams();
  const error = params.get("error");
  if (!error) return null;

  const message =
    error === "GitHubEmailMissing"
      ? "GitHub did not return an email. Make your email visible to the app, then try again."
      : "GitHub sign-in failed. Confirm the OAuth callback is http://localhost:3000/api/auth/callback/github.";

  return (
    <p className="mt-4 text-sm text-destructive text-center">{message}</p>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative bg-background">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="rounded-xl p-8 border border-border bg-card">
          {/* Logo */}
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

          {/* GitHub OAuth Button */}
          <div className="block">
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
          </div>

          <Suspense fallback={null}>
            <LoginError />
          </Suspense>

          {/* Benefits */}
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

          {/* Footer */}
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
