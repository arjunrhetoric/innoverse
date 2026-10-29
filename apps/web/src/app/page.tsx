"use client";

import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  Building2,
  School,
  ShieldCheck,
  GitBranch,
  FileCheck2,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Hero } from "@/components/landing/hero";
import { Workflow } from "@/components/landing/workflow";
import { LiveMetrics } from "@/components/landing/live-metrics";
import { ReportPreview } from "@/components/landing/report-preview";

const reportPillars = [
  {
    icon: GitBranch,
    title: "Evidence, frozen at sign-off",
    body: "Merged pull requests, authored commits, active days, review threads and milestone decisions — captured from GitHub and timestamped.",
  },
  {
    icon: FileCheck2,
    title: "A rubric the founder actually filled in",
    body: "Code quality, delivery, communication and testing are scored on a weighted rubric. The per-item scores are published, not hidden in a composite.",
  },
  {
    icon: ShieldCheck,
    title: "Confidence with its reasons attached",
    body: "A 0–100 attribution score, computed from authorship signals, is printed alongside every reason that moved it.",
  },
];

const audiences = [
  {
    icon: GraduationCap,
    role: "For students",
    body: "Build real products with your GitHub account as the record. Leave with a verified report and certificate, not a list of claims.",
    href: "/explore",
    cta: "Find a challenge",
  },
  {
    icon: Building2,
    role: "For startups",
    body: "Post scoped work, review proposals with evidence attached, and see exactly what each candidate shipped before you hire.",
    href: "/login",
    cta: "Post a challenge",
  },
  {
    icon: School,
    role: "For institutions",
    body: "Run cohorts with join codes, track participation and merged work, and export accreditation-ready reports.",
    href: "/register/institution",
    cta: "Register a cohort",
  },
];

export default function LandingPage() {
  return (
    <main id="main" className="min-h-screen bg-background">
      <Navbar />
      <Hero />

      {/* Live platform numbers, straight from the database */}
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <LiveMetrics />
        </div>
      </section>

      <Workflow />

      {/* The report — the product's actual output */}
      <section id="report" className="scroll-mt-20 border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
            <div>
              <SectionHeading
                align="left"
                eyebrow="Proof of work"
                title="The claim and the evidence, on the same page"
                description="Every finished challenge produces a report a hiring manager can audit in under a minute. It is public, printable, and independently verifiable."
              />
              <ul className="mt-8 space-y-5">
                {reportPillars.map((p) => (
                  <li key={p.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                      <p.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{p.title}</h3>
                      <p className="mt-0.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                        {p.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <Link href="/verify">
                    <ShieldCheck className="h-4 w-4" />
                    Verify a credential
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/talent">
                    Browse verified talent
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <Reveal>
              <ReportPreview />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeading
            eyebrow="Three sides, one record"
            title="One workspace, shared by everyone in the loop"
            description="The student, the startup and the institution all read the same underlying evidence."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {audiences.map((a, i) => (
              <Reveal key={a.role} delay={i * 60}>
                <div className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-2">
                    <a.icon className="h-4 w-4 text-foreground" />
                  </span>
                  <h3 className="mt-4 text-md font-semibold text-foreground">{a.role}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {a.body}
                  </p>
                  <Link
                    href={a.href}
                    className="group mt-5 inline-flex items-center gap-1 text-sm font-medium text-foreground"
                  >
                    {a.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
              Your next commit could be for a real startup.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-md leading-relaxed text-muted-foreground">
              Sign in with GitHub, find a challenge that matches your stack, and
              start shipping work that ends in a credential.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/login">
                  <GraduationCap className="h-4 w-4" />
                  Join as a student
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">
                  <Building2 className="h-4 w-4" />
                  Join as a startup
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
