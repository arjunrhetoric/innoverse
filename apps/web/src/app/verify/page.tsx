"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Fingerprint, ScanLine, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function VerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push(`/verify/${encodeURIComponent(trimmed)}`);
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto w-full max-w-[1160px] px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-2xs uppercase tracking-[0.14em] text-muted-foreground">
              <ScanLine className="h-3 w-3" aria-hidden />
              Public verification
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Verify a credential
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Enter the verification code printed on an Innoverse certificate. The check reads the
              issuing startup, the recipient and the evidence behind it — no account needed.
            </p>

            <form onSubmit={submit} className="mt-8">
              <Field
                id="verification-code"
                label="Verification code"
                hint="UUID from the certificate"
                required
              >
                <Input
                  id="verification-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. 3f2a1c94-5b7e-4d21-9a86-c0d4e5f61b27"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="h-11 font-mono tracking-tight"
                />
              </Field>
              <p className="mt-2 text-2xs leading-relaxed text-subtle-foreground">
                Printed under the QR code on the certificate and in the report footer. Paste it
                exactly as shown, including the hyphens.
              </p>

              <Button type="submit" variant="default" size="lg" className="mt-5 w-full" disabled={!code.trim()}>
                Verify code
                <ArrowRight />
              </Button>
            </form>

            <p className="mt-4 text-xs text-muted-foreground">
              Only have a report link?{" "}
              <Link href="/talent" className="text-foreground underline underline-offset-4">
                Open it from the talent directory
              </Link>
              .
            </p>
          </div>

          <aside aria-labelledby="what-you-get" className="rounded-lg border border-border bg-card">
            <h2
              id="what-you-get"
              className="border-b border-border px-5 py-3.5 text-2xs font-medium uppercase tracking-[0.08em] text-subtle-foreground"
            >
              What a valid check returns
            </h2>
            <ul className="divide-y divide-border">
              {[
                {
                  icon: ShieldCheck,
                  title: "Status",
                  body: "Whether the certificate is valid, revoked, or not on record.",
                },
                {
                  icon: Fingerprint,
                  title: "Identity",
                  body: "Recipient, issuing startup and the challenge the work was delivered against.",
                },
                {
                  icon: ScanLine,
                  title: "Evidence",
                  body: "Merged pull requests, commits and milestones counted at issue time.",
                },
                {
                  icon: Fingerprint,
                  title: "Fingerprint",
                  body: "SHA-256 hash of the issued document, so you can match it to your copy.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-3 px-5 py-3.5">
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
      <Footer />
    </main>
  );
}
