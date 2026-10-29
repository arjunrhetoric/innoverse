"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { GraduationCap, Building2, Landmark, ArrowRight, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { auth } from "@/lib/api";
import { cn } from "@/lib/utils";

const roles = [
  {
    id: "Student",
    icon: GraduationCap,
    title: "Student",
    summary: "Build real products and leave with evidence.",
    description:
      "Find a challenge that matches your stack, ship it through pull requests, and earn a verified report at sign-off.",
    benefits: ["Real startup work", "GitHub as your record", "Verified certificate"],
  },
  {
    id: "Startup",
    icon: Building2,
    title: "Startup",
    summary: "Hire on evidence, not interviews alone.",
    description:
      "Post scoped work, review proposals with proof attached, and see exactly what each candidate shipped.",
    benefits: ["One review queue", "Tracked milestones", "Signed agreements"],
  },
  {
    id: "Institution",
    icon: Landmark,
    title: "Institution",
    summary: "Run cohorts with accreditation-ready data.",
    description:
      "Create cohorts with join codes, follow participation and merged work, and export a report for accreditation.",
    benefits: ["Cohort dashboards", "Merged-PR tracking", "CSV export"],
  },
];

export default function RoleSelectionPage() {
  const router = useRouter();
  const { update } = useSession();
  const [selected, setSelected] = useState<string | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [businessEmail, setBusinessEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSelect = async (roleId: string) => {
    setSelected(roleId);
    if (roleId === "Startup") {
      setShowEmailDialog(true);
    } else {
      await submitRole(roleId);
    }
  };

  const submitRole = async (role: string, email?: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await auth.selectRole(role, email);
      await update();
      router.push(data.redirectPath);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to select role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="main" className="min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="eyebrow">One last step</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-foreground">
            How will you use Innoverse?
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            This sets your workspace, your navigation and what you can see. You can
            change it later from settings.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {roles.map((role) => {
            const active = selected === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => handleSelect(role.id)}
                disabled={loading}
                aria-pressed={active}
                className={cn(
                  "group flex cursor-pointer flex-col rounded-xl border bg-card p-5 text-left transition-colors duration-[var(--dur-2)]",
                  "disabled:cursor-wait disabled:opacity-70",
                  active
                    ? "border-foreground/35 ring-1 ring-foreground/15"
                    : "border-border hover:border-border-strong"
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2">
                  <role.icon className="h-4 w-4 text-foreground" />
                </span>

                <h2 className="mt-4 text-md font-semibold text-foreground">{role.title}</h2>
                <p className="mt-0.5 text-sm font-medium text-foreground/80">{role.summary}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {role.description}
                </p>

                <ul className="mt-4 space-y-1.5">
                  {role.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                      {benefit}
                    </li>
                  ))}
                </ul>

                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-foreground">
                  {active && loading ? "Setting up…" : `Continue as ${role.title.toLowerCase()}`}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="mx-auto mt-6 max-w-md">
          <FormError>{error}</FormError>
        </div>

        <p className="mt-6 text-center text-2xs text-subtle-foreground">
          Institutions can also{" "}
          <a href="/register/institution" className="underline hover:text-muted-foreground">
            create an account with email
          </a>
          .
        </p>
      </div>

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Verify your startup
            </DialogTitle>
            <DialogDescription>
              Use a company email address. Students only see challenges from verified
              companies.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field id="businessEmail" label="Business email" hint="name@company.com">
              <Input
                id="businessEmail"
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </Field>
            <div className="mt-3">
              <FormError>{error}</FormError>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={loading || !businessEmail.trim()}
              onClick={() => submitRole("Startup", businessEmail)}
            >
              {loading ? "Verifying…" : "Verify and continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
