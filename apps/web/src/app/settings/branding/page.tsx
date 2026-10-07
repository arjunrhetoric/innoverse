"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Building2, PenLine, Loader2, AlertCircle, CheckCircle2, Upload, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { uploadDirect, DirectUploadUnavailableError } from "@/lib/blob-upload";

interface Branding {
  companyName: string | null;
  startupLogo: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  signatureImage: string | null;
  complete: boolean;
  missing?: string[];
}

export default function BrandingPage() {
  return (
    <Suspense fallback={null}>
      <BrandingForm />
    </Suspense>
  );
}

function safeReturnTo(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function BrandingForm() {
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryTitle, setSignatoryTitle] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [signature, setSignature] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!authLoading && user?.role !== "Startup") {
      router.push("/dashboard");
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "Startup") return;
    fetch("/api/settings/branding", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load branding kit");
        const data = await res.json();
        setBranding(data);
        setCompanyName(data.companyName ?? "");
        setSignatoryName(data.signatoryName ?? "");
        setSignatoryTitle(data.signatoryTitle ?? "");
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setDone("");
    try {
      const formData = new FormData();
      formData.append("companyName", companyName);
      formData.append("signatoryName", signatoryName);
      formData.append("signatoryTitle", signatoryTitle);
      // Browser-direct upload first (no server body involved); fall back to
      // multipart for local dev without Blob, where the server stores files.
      const directOne = async (f: File): Promise<string | File> => {
        try {
          return await uploadDirect(f, "branding");
        } catch (err: unknown) {
          if (err instanceof DirectUploadUnavailableError) return f;
          throw err;
        }
      };
      if (logo) {
        formData.append("logo", await directOne(logo));
      }
      if (signature) {
        formData.append("signature", await directOne(signature));
      }

      const res = await fetch("/api/settings/branding", {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save");
      setBranding(data.branding);
      setLogo(null);
      setSignature(null);
      setDone(data.message || "Saved.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 pb-16 px-4">
          <div className="mx-auto max-w-2xl">
            <Skeleton className="h-10 w-64 mb-6 rounded-lg" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        <div className="mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                Company Branding
              </h1>
              {returnTo && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={returnTo}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Issuance
                  </Link>
                </Button>
              )}
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Your logo and authorized signature appear on every Innoverse certificate you issue. Both are required before certificates can be issued.
            </p>
            {branding && (
              <p className={`text-xs mt-2 font-medium ${branding.complete ? "text-emerald-500" : "text-amber-500"}`}>
                {branding.complete
                  ? "Branding kit complete — certificates enabled."
                  : `Still missing: ${(branding.missing ?? []).join(", ") || "logo, signature, signatory name"}.`}
              </p>
            )}
          </motion.div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 mb-6 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {done && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-6 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-500">{done}</p>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div>
              <Label htmlFor="companyName" className="mb-1.5 block text-sm">Company name</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." className="h-11" />
            </div>

            <div>
              <Label className="mb-1.5 block text-sm">Company logo (PNG/JPG, under 5MB)</Label>
              <div className="flex items-center gap-4">
                {branding?.startupLogo && (
                  <Image src={branding.startupLogo} alt="Company logo" width={80} height={80} className="rounded-lg border border-border object-contain bg-white h-20 w-20" />
                )}
                <label className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground cursor-pointer hover:border-primary/50">
                  <Upload className="h-3.5 w-3.5" />
                  {logo ? logo.name : "Choose logo"}
                  <input type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="signatoryName" className="mb-1.5 block text-sm">Authorized signatory</Label>
                <Input id="signatoryName" value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} placeholder="Jane Doe" className="h-11" />
              </div>
              <div>
                <Label htmlFor="signatoryTitle" className="mb-1.5 block text-sm">Title</Label>
                <Input id="signatoryTitle" value={signatoryTitle} onChange={(e) => setSignatoryTitle(e.target.value)} placeholder="CTO" className="h-11" />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-sm">Signature image (PNG/JPG, under 5MB)</Label>
              <div className="flex items-center gap-4">
                {branding?.signatureImage && (
                  <Image src={branding.signatureImage} alt="Signature" width={120} height={60} className="rounded-lg border border-border object-contain bg-white h-15 w-30" />
                )}
                <label className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground cursor-pointer hover:border-primary/50">
                  <PenLine className="h-3.5 w-3.5" />
                  {signature ? signature.name : "Choose signature"}
                  <input type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={(e) => setSignature(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">Tip: a transparent PNG of a handwritten signature looks best on the certificate.</p>
            </div>

            <Button variant="gradient" onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Branding Kit
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
