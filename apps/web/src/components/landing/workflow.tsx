"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GithubIcon as Github } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    n: "01",
    title: "Startups post a challenge",
    description:
      "Define the problem, the required skills and the deadline. If the work needs a repository, Innoverse creates one and installs its GitHub App on it.",
    detail: "Challenge · skills · deadline · repo or open issue",
  },
  {
    n: "02",
    title: "Students propose and get selected",
    description:
      "Students submit a plan and a presentation. Founders review every proposal in one queue, then sign a collaboration agreement with the selected student.",
    detail: "Proposal · agreement · milestone plan",
  },
  {
    n: "03",
    title: "Work ships on GitHub, then gets verified",
    description:
      "Milestones and pull requests are tracked against the challenge. At sign-off, Innoverse freezes the evidence into a report and mints a certificate anyone can verify.",
    detail: "Pull requests · reviews · report · certificate",
  },
];

export function Workflow() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActive(Number((e.target as HTMLElement).dataset.step));
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="workflow" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionHeading
            align="left"
            eyebrow="How it works"
            title="Three moves from problem to proof"
            description="One loop, shared by both sides. No screenshots, no status meetings, no lost context."
          />
          <div className="mt-7 hidden gap-1.5 lg:flex" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.n}
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-colors duration-300",
                  i <= active ? "bg-foreground/60" : "bg-border"
                )}
              />
            ))}
          </div>
          <Button variant="outline" className="mt-7" asChild>
            <Link href="/login">
              <Github className="h-4 w-4" />
              Sign in with GitHub
            </Link>
          </Button>
        </div>

        <ol>
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-step={i}
              className={cn(
                "flex gap-5 py-7 transition-opacity duration-300",
                i !== 0 && "border-t border-border",
                i !== active && "lg:opacity-50"
              )}
            >
              <span
                className={cn(
                  "shrink-0 pt-0.5 font-mono text-xs tabular-nums transition-colors",
                  i === active ? "text-foreground" : "text-subtle-foreground"
                )}
              >
                {s.n}
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-medium tracking-tight text-foreground">{s.title}</h3>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
                <p className="mt-2.5 font-mono text-2xs text-subtle-foreground">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
