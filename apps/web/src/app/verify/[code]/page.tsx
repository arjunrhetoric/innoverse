"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, XCircle, Star, Download } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/ui/copy-button";
import { certificates } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function VerifyResultPage() {
  const params = useParams();
  const code = decodeURIComponent(params.code as string);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    certificates
      .verify(code)
      .then(setResult)
      .catch((err) => setResult({ valid: false, message: err.message }))
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16 px-4">
        <div className="mx-auto max-w-lg">
          {loading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : result?.valid ? (
            <div className="rounded-xl border border-emerald-500/30 bg-card p-8 text-center">
              <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h1 className="text-xl font-medium tracking-tight text-emerald-500 mb-1">Certificate Verified</h1>
              <p className="text-sm text-muted-foreground mb-6">This certificate is genuine.</p>
              <div className="text-left space-y-2 text-sm rounded-lg border border-border bg-background p-4 mb-6">
                <p><span className="text-muted-foreground">Awarded to:</span> <span className="font-medium">{result.certificate.studentName}</span></p>
                <p><span className="text-muted-foreground">Project:</span> <span className="font-medium">{result.certificate.problemTitle}</span></p>
                <p><span className="text-muted-foreground">Issued by:</span> <span className="font-medium">{result.certificate.startupName}</span></p>
                <p className="flex items-center gap-1">
                  <span className="text-muted-foreground">Rating:</span>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < result.certificate.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />
                  ))}
                </p>
                <p><span className="text-muted-foreground">Issued:</span> {formatDate(result.certificate.issuedAt)}</p>
                {result.certificate.evidence && (
                  <div className="pt-2 mt-2 border-t border-border/60">
                    <p className="text-muted-foreground mb-1">Verified contribution record:</p>
                    <p>
                      {result.certificate.evidence.mergedPRs} merged pull requests ·{" "}
                      {result.certificate.evidence.commits} commits ·{" "}
                      {result.certificate.evidence.milestonesCompleted}/{result.certificate.evidence.milestonesTotal} milestones
                    </p>
                  </div>
                )}
                <div className="pt-1">
                  <CopyButton value={result.certificate.verificationCode} />
                </div>
              </div>
              {result.certificate.certificateFile && (
                <Button variant="outline" asChild>
                  <a href={result.certificate.certificateFile} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download Certificate
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-destructive/30 bg-card p-8 text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-medium tracking-tight mb-1">Not Found</h1>
              <p className="text-sm text-muted-foreground mb-6">
                {result?.message || "No certificate matches this code."}
              </p>
              <Button variant="outline" asChild>
                <Link href="/verify">Try another code</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
