"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { GraduationCap, Building2, ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { auth } from "@/lib/api";
import { cn } from "@/lib/utils";

const roles = [
  {
    id: "Student",
    icon: GraduationCap,
    title: "Student Developer",
    description: "Browse innovation challenges, submit proposals, and collaborate on real-world projects.",
    benefits: [
      "Work on real startup problems",
      "Build your GitHub portfolio",
      "Earn verified certificates",
      "Get rated by startup founders",
    ],
  },
  {
    id: "Startup",
    icon: Building2,
    title: "Startup Founder",
    description: "Post innovation challenges, review student proposals, and find your next development partner.",
    benefits: [
      "Post unlimited challenges",
      "Auto-create GitHub repos",
      "Review proposals with PPTs",
      "Rate and certify contributors",
    ],
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
    <div className="min-h-screen flex items-center justify-center py-20">
      <div className="mx-auto max-w-4xl px-4 w-full">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-12"
        >
          <h1 className="type-display text-3xl sm:text-4xl font-medium">
            Choose Your Role
          </h1>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto">
            Select how you want to use INNOVERSE. You can change this later.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role, i) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
            >
              <button
                type="button"
                onClick={() => handleSelect(role.id)}
                disabled={loading}
                aria-pressed={selected === role.id}
                className={cn(
                  "w-full text-left rounded-lg border p-7 transition-colors duration-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected === role.id
                    ? "border-foreground/40 bg-white/[0.03]"
                    : "border-border bg-card hover:border-foreground/20"
                )}
              >
                <div className="h-11 w-11 rounded-md border border-border bg-white/[0.03] flex items-center justify-center mb-5">
                  <role.icon className="h-5 w-5 text-foreground" />
                </div>

                <h3 className="text-base font-medium tracking-tight mb-1.5">{role.title}</h3>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  {role.description}
                </p>

                <ul className="space-y-2">
                  {role.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-muted-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex items-center text-sm font-medium text-foreground">
                  Select {role.title}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-destructive mt-4 text-sm"
          >
            {error}
          </motion.p>
        )}
      </div>

      {/* Business Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Business Email Verification
            </DialogTitle>
            <DialogDescription>
              Enter your business email to verify your startup. This helps us
              maintain quality on the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="businessEmail" className="mb-2 block">
              Business Email
            </Label>
            <Input
              id="businessEmail"
              type="email"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-11"
            />
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              disabled={loading}
              onClick={() => submitRole("Startup", businessEmail)}
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
