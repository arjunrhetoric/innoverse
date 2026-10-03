"use client";

import Link from "next/link";
import {
  GitBranch,
  ShieldCheck,
  Award,
  Users,
  Code2,
  Activity,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Building2,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusDot } from "@/components/ui/status-dot";
import { CopyButton } from "@/components/ui/copy-button";
import { Progress } from "@/components/ui/progress";
import { Hero } from "@/components/landing/hero";
import { AppPreview } from "@/components/landing/app-preview";
import { Workflow } from "@/components/landing/workflow";

// ─── Data ────────────────────────────────────────────────────────────────────

const metrics = [
  { value: "500+", label: "Active students" },
  { value: "120+", label: "Startup partners" },
  { value: "350+", label: "Projects shipped" },
  { value: "98%", label: "Satisfaction" },
];

const testimonials = [
  {
    quote:
      "INNOVERSE gave me a chance to work on real startup problems. The experience was 10x better than any classroom project.",
    name: "Prakriti Tiwari",
    title: "Computer Science Student",
  },
  {
    quote:
      "We found amazing talent through this platform. The GitHub integration made collaboration seamless from day one.",
    name: "Rahul Mehta",
    title: "Founder, TechStart AI",
  },
  {
    quote:
      "The certificate system and ratings helped me land my first internship. Recruiters loved seeing real project contributions.",
    name: "Arjun Singh",
    title: "Full-Stack Developer",
  },
  {
    quote:
      "As a startup with limited resources, INNOVERSE connected us with passionate students who delivered exceptional work.",
    name: "Sarah Chen",
    title: "CTO, DataFlow Labs",
  },
  {
    quote:
      "The milestone tracking and real-time dashboards kept everyone aligned. It felt like a professional dev environment.",
    name: "Vikram Singh",
    title: "Backend Developer Intern",
  },
];

// ─── Landing Page ────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />

      {/* ─── Product showcase ─────────────────────────────────────── */}
      <section id="showcase" className="scroll-mt-16 border-b border-border">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-20">
          <SectionHeading
            eyebrow="Product tour"
            title="One workspace, three views"
            description="Discover challenges, review proposals, and track delivery — the same interface both sides share."
          />
          <Reveal delay={120} className="mx-auto mt-10 max-w-5xl">
            <AppPreview />
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-5 text-center font-mono text-xs text-muted-foreground">
              Real interface · sample data · <StatusDot status="active" className="mx-1 inline-flex" /> synced live
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── Metrics ───────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-4">
          {metrics.map((m, i) => (
            <Reveal
              key={m.label}
              delay={i * 60}
              className={`py-8 ${i !== 0 ? "border-l border-border pl-6 sm:pl-8" : ""} ${
                i === 2 ? "max-lg:border-l-0 max-lg:pl-0" : ""
              }`}
            >
              <p className="font-mono text-3xl font-medium tracking-tight text-foreground tabular-nums">
                {m.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{m.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Platform bento ────────────────────────────────────────── */}
      <section id="platform" className="scroll-mt-16 border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <SectionHeading
            eyebrow="Platform"
            title="Everything runs through one workspace"
            description="Challenges, proposals, code review, and certification share the same data — no screenshots, no status meetings, no lost context."
          />

          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Reveal className="md:col-span-2">
              <div className="flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors duration-100 hover:border-foreground/20">
                <div className="flex items-center gap-2.5">
                  <GitBranch className="h-4 w-4 text-foreground" />
                  <h3 className="text-[15px] font-medium tracking-tight text-foreground">
                    GitHub-native workflow
                  </h3>
                </div>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Repos are created automatically. Every pull request, review,
                  and merge is tracked against the challenge.
                </p>
                <div className="mt-5 flex-1 rounded-md border border-border bg-background p-3">
                  <div className="flex items-center gap-2.5">
                    <StatusDot status="success" />
                    <p className="truncate text-sm font-medium text-foreground">
                      Add realtime dashboard
                    </p>
                    <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
                      #48
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> ci passing
                    </span>
                    <span>2 reviews</span>
                    <span>+412 −87</span>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={60}>
              <div className="flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors duration-100 hover:border-foreground/20">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-foreground" />
                  <h3 className="text-[15px] font-medium tracking-tight text-foreground">
                    Verified startups
                  </h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Business-email verification keeps the marketplace legitimate.
                  Students only see real companies.
                </p>
                <p className="mt-auto pt-4 font-mono text-xs text-muted-foreground">
                  @_ verified · techstart.ai
                </p>
              </div>
            </Reveal>

            <Reveal>
              <div className="flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors duration-100 hover:border-foreground/20">
                <div className="flex items-center gap-2.5">
                  <Award className="h-4 w-4 text-foreground" />
                  <h3 className="text-[15px] font-medium tracking-tight text-foreground">
                    Certificates that verify
                  </h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Completion mints a certificate anyone can verify in seconds.
                </p>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="font-mono text-xs text-muted-foreground">INV-2026-8X2K</span>
                  <CopyButton value="INV-2026-8X2K" />
                </div>
              </div>
            </Reveal>

            <Reveal delay={60}>
              <div className="flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors duration-100 hover:border-foreground/20">
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-foreground" />
                  <h3 className="text-[15px] font-medium tracking-tight text-foreground">
                    Skill matching
                  </h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Challenges surface to students with the right stack, ranked by fit.
                </p>
                <div className="mt-auto space-y-1.5 pt-4 font-mono text-xs">
                  {[["react", "94%"], ["node", "88%"], ["postgres", "71%"]].map(([s, pct]) => (
                    <div key={s} className="flex items-center justify-between text-muted-foreground">
                      <span>{s}</span>
                      <span className="text-foreground tabular-nums">{pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors duration-100 hover:border-foreground/20">
                <div className="flex items-center gap-2.5">
                  <Activity className="h-4 w-4 text-foreground" />
                  <h3 className="text-[15px] font-medium tracking-tight text-foreground">
                    Live project tracking
                  </h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Milestones and progress stay visible to both sides, in real time.
                </p>
                <div className="mt-auto pt-4">
                  <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                    <span>milestones 3/4</span>
                    <span className="text-foreground tabular-nums">75%</span>
                  </div>
                  <Progress value={75} className="mt-2 h-1.5" />
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <div className="mt-4 flex flex-col gap-4 rounded-lg border border-border bg-card p-6 transition-colors duration-100 hover:border-foreground/20 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <Code2 className="h-4 w-4 shrink-0 text-foreground" />
                <h3 className="text-[15px] font-medium tracking-tight text-foreground">
                  Inline code review
                </h3>
              </div>
              <div className="grid flex-1 gap-px overflow-hidden rounded-md border border-border bg-border font-mono text-xs sm:grid-cols-2">
                <p className="bg-red-500/[0.07] px-3 py-2 text-red-400">
                  − const data = await fetchAll()
                </p>
                <p className="bg-emerald-500/[0.07] px-3 py-2 text-emerald-400">
                  + const data = await fetchPage(cursor)
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Workflow />

      {/* ─── Community ─────────────────────────────────────────────── */}
      <section id="community" className="scroll-mt-16 border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <SectionHeading
            eyebrow="Community"
            title="Built by people shipping real work"
          />
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={(i % 3) * 60}>
                <figure className="flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors duration-100 hover:border-foreground/20">
                  <blockquote className="flex-1 text-[15px] leading-relaxed text-foreground">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 border-t border-border pt-4">
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{t.title}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
            <Reveal delay={120}>
              <Link
                href="/login"
                className="group flex h-full min-h-44 flex-col justify-between rounded-lg border border-dashed border-border p-6 transition-colors duration-100 hover:border-foreground/25 hover:bg-white/[0.02]"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Join 500+ students
                </p>
                <span className="flex items-center gap-1.5 text-[15px] font-medium text-foreground">
                  Start your first challenge
                  <ArrowRight className="h-4 w-4 transition-transform duration-100 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─────────────────────────────────────────────── */}
      <section id="contact" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal>
            <div className="relative overflow-hidden rounded-xl border border-border bg-card px-6 py-14 text-center sm:py-16">
              <div className="bg-toplight pointer-events-none absolute inset-0" aria-hidden />
              <div className="relative">
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Get started
                </p>
                <h2 className="type-display mx-auto mt-3 max-w-xl text-3xl font-medium text-foreground sm:text-[40px]">
                  Your next commit could be for a real startup.
                </h2>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    variant="default"
                    className="shadow-cta h-11 rounded-full px-6 transition-all duration-100 hover:brightness-110 active:scale-[0.99]"
                    asChild
                  >
                    <Link href="/login">
                      <GraduationCap className="mr-2 h-5 w-5" />
                      Join as student
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-11 rounded-full border-border bg-white/[0.02] px-6 transition-colors duration-100 hover:bg-white/[0.05] active:scale-[0.99]"
                    asChild
                  >
                    <Link href="/login">
                      <Building2 className="mr-2 h-5 w-5" />
                      Join as startup
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
