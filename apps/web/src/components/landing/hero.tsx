"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { useUser } from "@/hooks/useUser";

export function Hero() {
  const { isAuthenticated, dashboardPath } = useUser();

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Backdrop */}
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="bg-toplight absolute inset-0" aria-hidden />

      <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-32 text-center sm:px-6 md:pb-20 md:pt-44">
        <div className="animate-hero flex justify-center" style={{ "--d": "0ms" } as React.CSSProperties}>
          <Link
            href="#platform"
            className="group flex items-center gap-2 rounded-full border border-border bg-white/[0.03] py-1 pl-3 pr-2.5 text-[13px] text-muted-foreground transition-colors duration-100 hover:border-foreground/20 hover:text-foreground"
          >
            <StatusDot status="active" pulse />
            Now onboarding startups for 2026
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-100 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <h1
          className="type-hero animate-hero mt-7 text-foreground"
          style={{ "--d": "90ms", fontSize: "clamp(44px, 7.2vw, 76px)", fontWeight: 500 } as React.CSSProperties}
        >
          Ship real products
          <br />
          with student engineers.
        </h1>

        <p
          className="animate-hero mx-auto mt-6 max-w-xl text-balance text-[17px] leading-relaxed text-muted-foreground"
          style={{ "--d": "180ms" } as React.CSSProperties}
        >
          INNOVERSE connects startups with vetted student developers. Post a
          challenge, review proposals, and collaborate on GitHub — from first
          commit to verified certificate.
        </p>

        <div
          className="animate-hero mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ "--d": "270ms" } as React.CSSProperties}
        >
          {isAuthenticated ? (
            <Button
              size="lg"
              variant="default"
              className="shadow-cta h-11 rounded-full px-6 transition-all duration-100 hover:brightness-110 active:scale-[0.99]"
              asChild
            >
              <Link href={dashboardPath}>
                Open dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                variant="default"
                className="shadow-cta h-11 rounded-full px-6 transition-all duration-100 hover:brightness-110 active:scale-[0.99]"
                asChild
              >
                <Link href="/login">
                  Start building
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 rounded-full border-border bg-white/[0.02] px-6 transition-colors duration-100 hover:bg-white/[0.05] active:scale-[0.99]"
                asChild
              >
                <Link href="#showcase">See it in action</Link>
              </Button>
            </>
          )}
        </div>

        <div
          className="animate-hero mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground"
          style={{ "--d": "360ms" } as React.CSSProperties}
        >
          {["GitHub-native", "Verified certificates", "Free to join"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
