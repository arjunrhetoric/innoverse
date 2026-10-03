"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16 px-4">
        <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-foreground" />
            <h1 className="text-xl font-medium tracking-tight">Verify a Certificate</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Enter the verification code printed on an Innoverse certificate to confirm it is genuine.
          </p>
          <Label htmlFor="code" className="mb-2 block text-sm">Verification code</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. 9f2c…"
            className="h-11 mb-4 font-mono"
          />
          <Button
            variant="default"
            className="w-full"
            disabled={!code.trim()}
            onClick={() => router.push(`/verify/${encodeURIComponent(code.trim())}`)}
          >
            Verify
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
      <Footer />
    </main>
  );
}
