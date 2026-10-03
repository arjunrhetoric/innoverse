"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GithubIcon as Github } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    n: "01",
    title: "Startups post challenges",
    description:
      "Define the problem, required skills, and deadline. A GitHub repository is created automatically when you need one.",
  },
  {
    n: "02",
    title: "Students apply with proposals",
    description:
      "Browse open challenges and submit a proposal with a plan and presentation. Founders review everything in one queue.",
  },
  {
    n: "03",
    title: "Collaborate, ship, certify",
    description:
      "Work through milestones and pull requests with inline review. Completion earns a verifiable certificate.",
  },
];

export function Workflow() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.step);
            setActive(i);
          }
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="workflow" className="scroll-mt-16 border-b border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionHeading
            align="left"
            eyebrow="Workflow"
            title="From challenge to shipped in three moves"
            description="A tight loop designed for students who want real experience and founders who need real output."
          />
          {/* Progress */}
          <div className="mt-8 hidden gap-2 lg:flex" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.n}
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-colors duration-300",
                  i <= active ? "bg-foreground/70" : "bg-white/10"
                )}
              />
            ))}
          </div>
          <Reveal delay={120}>
            <Button variant="outline" className="mt-8" asChild>
              <Link href="/login">
                <Github className="mr-2 h-4 w-4" />
                Sign in with GitHub
              </Link>
            </Button>
          </Reveal>
        </div>

        <div>
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-step={i}
              className={cn(
                "flex gap-5 py-8 transition-opacity duration-300",
                i !== 0 && "border-t border-border",
                i !== active && "lg:opacity-45"
              )}
            >
              <span
                className={cn(
                  "shrink-0 font-mono text-sm tabular-nums transition-colors duration-300",
                  i === active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.n}
              </span>
              <div>
                <h3 className="text-xl font-medium tracking-tight text-foreground">
                  {s.title}
                </h3>
                <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
