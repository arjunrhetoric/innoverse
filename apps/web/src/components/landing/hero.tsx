"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { AppPreview } from "./app-preview";

export function Hero() {
  const { isAuthenticated, dashboardPath } = useUser();

  return (
    <section className="relative border-b border-border">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pt-20 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="animate-hero eyebrow" style={{ ["--d" as string]: "0ms" }}>
            Proof of work, not promises
          </p>

          <h1
            className="animate-hero mt-4 text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[3.25rem] lg:text-[3.5rem]"
            style={{ ["--d" as string]: "60ms" }}
          >
            The evidence layer for
            <br className="hidden sm:block" /> early-career hiring.
          </h1>

          <p
            className="animate-hero mx-auto mt-5 max-w-xl text-balance text-md leading-relaxed text-muted-foreground"
            style={{ ["--d" as string]: "120ms" }}
          >
            Startups post real work. Students ship it through GitHub pull requests.
            Every completed challenge ends in a verifiable Proof-of-Work Report —
            with a confidence score, a reviewer rubric, and an audit trail.
          </p>

          <div
            className="animate-hero mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row"
            style={{ ["--d" as string]: "180ms" }}
          >
            {isAuthenticated ? (
              <Button size="lg" asChild>
                <Link href={dashboardPath}>
                  Open dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link href="/login">
                  Start building
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <Link href="/explore">Browse open challenges</Link>
            </Button>
          </div>

          <p
            className="animate-hero mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-2xs text-subtle-foreground"
            style={{ ["--d" as string]: "240ms" }}
          >
            <span>GitHub-native</span>
            <span aria-hidden>·</span>
            <span>Public verification</span>
            <span aria-hidden>·</span>
            <span>Free for students</span>
          </p>
        </div>

        <div
          className="animate-hero mx-auto mt-12 max-w-4xl sm:mt-14"
          style={{ ["--d" as string]: "300ms" }}
        >
          <AppPreview />
          <p className="mt-3 text-center font-mono text-2xs text-subtle-foreground">
            The real interface, populated with sample data.
          </p>
        </div>
      </div>
    </section>
  );
}
