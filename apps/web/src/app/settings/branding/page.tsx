"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsNav, startupSettingsItems } from "@/components/layout/settings-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Section } from "@/components/ui/card";
import { PageHeader, Meta } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetImage } from "@/components/ui/asset-image";
import { cn } from "@/lib/utils";
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
      <AppShell>
        <div className="px-4 pb-16 pt-24">
          <div className="mx-auto max-w-6xl">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-7 w-56" />
            <Skeleton className="mt-2 h-4 w-full max-w-md" />
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-lg border border-border bg-card">
                    <div className="border-b border-border px-5 py-4">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="mt-2 h-3 w-64" />
                    </div>
                    <div className="space-y-4 p-5">
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-4 w-40" />
                </div>
                <div className="paper space-y-4 p-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-px w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const logoSrc = logo
    ? null
    : branding?.startupLogo
      ? `/api/branding/logo?v=${encodeURIComponent(branding.startupLogo)}`
      : null;
  const signatureSrc = signature
    ? null
    : branding?.signatureImage
      ? `/api/branding/signature?v=${encodeURIComponent(branding.signatureImage)}`
      : null;

  return (
    <AppShell>
      <div className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-6xl">
<SettingsNav items={startupSettingsItems} />
          <PageHeader
            back={returnTo ? { href: returnTo, label: "Back to issuance" } : undefined}
            eyebrow={
              <span className="font-mono text-2xs uppercase tracking-[0.14em] text-subtle-foreground">
                Settings · Branding
              </span>
            }
            title="Branding kit"
            description="The logo, signatory and signature below are printed on every certificate you issue. Issuance stays disabled until all three are set."
            meta={
              <>
                <StatusBadge status={branding?.complete ? "complete" : "pending"} />
                {branding?.missing && branding.missing.length > 0 && (
                  <Meta label="Missing" value={branding.missing.join(", ")} />
                )}
              </>
            }
          />

          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle px-4 py-3"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}
          {done && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-success-border bg-success-subtle px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <p className="text-sm text-success">{done}</p>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <div className="space-y-6">
              <Section
                title="Company identity"
                description="Printed in the certificate header, under the logo."
                contentClassName="p-5"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="companyName" label="Company name" hint="Uppercase on the certificate">
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Inc."
                    />
                  </Field>
                </div>
              </Section>

              <Section
                title="Logo"
                description="Appears top-right in the certificate header, above the company name."
                contentClassName="p-5"
              >
                <AssetDrop
                  id="logo"
                  title="Company logo"
                  shape="square"
                  assetUrl={logoSrc}
                  file={logo}
                  onFile={setLogo}
                  onClear={() => setLogo(null)}
                />
                <p className="mt-3 text-2xs leading-relaxed text-subtle-foreground">
                  PNG or JPG, up to 5MB. A wide mark on a transparent background reads best at
                  certificate size.
                </p>
              </Section>

              <Section
                title="Signature"
                description="Prints above a rule at the bottom-left of the certificate, with the name and title."
                contentClassName="p-5 space-y-5"
              >
                <AssetDrop
                  id="signature"
                  title="Signature image"
                  shape="wide"
                  assetUrl={signatureSrc}
                  file={signature}
                  onFile={setSignature}
                  onClear={() => setSignature(null)}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="signatoryName" label="Authorized signatory" hint="Set in serif">
                    <Input
                      id="signatoryName"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </Field>
                  <Field id="signatoryTitle" label="Title" hint="Under the name">
                    <Input
                      id="signatoryTitle"
                      value={signatoryTitle}
                      onChange={(e) => setSignatoryTitle(e.target.value)}
                      placeholder="CTO"
                    />
                  </Field>
                </div>

                <p className="text-2xs leading-relaxed text-subtle-foreground">
                  A transparent PNG of a handwritten signature looks best; a scan on white paper
                  will show its background.
                </p>
              </Section>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  {logo || signature
                    ? "New files are staged. Save to upload them."
                    : "Name and title changes are saved with the kit."}
                </p>
                <Button variant="default" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {saving ? "Saving…" : "Save branding kit"}
                </Button>
              </div>
            </div>

            <CertificatePreview
              logoSrc={logoSrc}
              logoStaged={Boolean(logo)}
              signatureSrc={signatureSrc}
              signatureStaged={Boolean(signature)}
              companyName={companyName}
              signatoryName={signatoryName}
              signatoryTitle={signatoryTitle}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ── Upload target: drag and drop, preview, replace, remove ─────────────── */

function AssetDrop({
  id,
  title,
  shape,
  assetUrl,
  file,
  onFile,
  onClear,
}: {
  id: string;
  title: string;
  shape: "square" | "wide";
  assetUrl: string | null;
  file: File | null;
  onFile: (file: File | null) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState("");
  // Staged file preview is derived, so no setState inside an effect.
  const stagedPreview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!stagedPreview) return;
    return () => URL.revokeObjectURL(stagedPreview);
  }, [stagedPreview]);

  const accept = (picked: File | null | undefined) => {
    if (!picked) return;
    if (!/^image\/(png|jpeg)$/.test(picked.type)) {
      setLocalError("Choose a PNG or JPG file.");
      return;
    }
    if (picked.size > 5 * 1024 * 1024) {
      setLocalError("That file is over 5MB.");
      return;
    }
    setLocalError("");
    onFile(picked);
  };

  const preview = stagedPreview ?? assetUrl;
  const state = file ? "staged" : assetUrl ? "uploaded" : "missing";

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex flex-wrap items-center gap-4 rounded-md border border-dashed p-3 transition-colors sm:flex-nowrap",
          dragOver ? "border-brand/60 bg-brand-subtle" : "border-border bg-surface/50"
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-card",
            shape === "square" ? "h-16 w-16" : "h-16 w-28"
          )}
        >
          <AssetImage
            src={preview}
            alt={`${title} preview`}
            className="h-full w-full"
            fallback="Not uploaded"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-0.5 truncate font-mono text-2xs text-muted-foreground">
            {file ? file.name : state === "uploaded" ? "Uploaded" : "Not uploaded"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {state === "uploaded" && <Badge variant="success">Uploaded</Badge>}
            {state === "staged" && <Badge variant="warning">New file — not saved</Badge>}
            {state === "missing" && <Badge variant="outline">Not uploaded</Badge>}
            {state === "uploaded" && (
              <span className="text-2xs text-subtle-foreground">Replace to change it.</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            {preview ? "Replace" : "Upload"}
          </Button>
          {file && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Remove staged ${title.toLowerCase()}`}
              onClick={onClear}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept=".png,.jpg,.jpeg"
          className="sr-only"
          aria-label={title}
          onChange={(e) => {
            accept(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <p className="mt-2 text-2xs text-subtle-foreground">
        {dragOver ? "Drop to stage the file." : "Drag a file here, or use Upload."}
      </p>
      {localError && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {localError}
        </p>
      )}
    </div>
  );
}

/* ── Live certificate preview ───────────────────────────────────────────── */

function CertificatePreview({
  logoSrc,
  logoStaged,
  signatureSrc,
  signatureStaged,
  companyName,
  signatoryName,
  signatoryTitle,
}: {
  logoSrc: string | null;
  logoStaged: boolean;
  signatureSrc: string | null;
  signatureStaged: boolean;
  companyName: string;
  signatoryName: string;
  signatoryTitle: string;
}) {
  const company = companyName.trim() || "Your company";
  const title = signatoryTitle.trim();
  const sigCaption = title ? `${title} · ${company}` : company;

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Live preview
            </p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              Certificate header &amp; signature
            </p>
          </div>
          <Badge variant="outline" className="font-mono">
            A4 landscape
          </Badge>
        </div>

        <div className="paper space-y-4 p-4">
          {/* Header block */}
          <div className="rounded-md border border-border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-2xs font-semibold uppercase tracking-[0.22em] text-foreground">
                  Innoverse
                </p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-subtle-foreground">
                  Innovation ecosystem
                </p>
              </div>
              <div className="flex min-w-0 flex-col items-end gap-1.5">
                <div className="flex h-12 w-24 items-center justify-center overflow-hidden rounded-sm border border-border bg-surface">
                  <AssetImage
                    src={logoSrc}
                    alt="Company logo on the certificate"
                    className="h-full w-full"
                    fallback="No logo"
                  />
                </div>
                <p className="max-w-[8rem] truncate text-right font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  {company}
                </p>
              </div>
            </div>
            <div className="relative mt-3 h-px bg-border">
              <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 bg-brand" />
            </div>
            <p className="mt-3 font-serif text-lg leading-tight text-foreground">
              Certificate of Completion
            </p>
          </div>

          {/* Signature block */}
          <div className="rounded-md border border-border bg-background p-3">
            <div className="flex h-12 w-40 items-end">
              <AssetImage
                src={signatureSrc}
                alt="Signature on the certificate"
                className="max-h-12 w-auto"
                fallback="Signature not uploaded"
                fallbackClassName="items-start text-left pb-1 font-mono uppercase tracking-[0.12em]"
              />
            </div>
            <div className="mt-2 h-px w-40 bg-foreground/70" />
            <p className="mt-2 truncate font-serif text-lg leading-tight text-foreground">
              {signatoryName.trim() || "Authorized signatory"}
            </p>
            <p className="mt-0.5 max-w-[16rem] truncate font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              {sigCaption}
            </p>
          </div>

          <ol className="space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[9px] text-subtle-foreground">
                1
              </span>
              <span>
                <span className="text-foreground">Logo</span> — header, top right
                {logoStaged && <span className="text-warning"> · new file staged</span>}
                {!logoSrc && <span className="text-warning"> · not uploaded</span>}
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[9px] text-subtle-foreground">
                2
              </span>
              <span>
                <span className="text-foreground">Signature</span> — footer, bottom left
                {signatureStaged && <span className="text-warning"> · new file staged</span>}
                {!signatureSrc && <span className="text-warning"> · not uploaded</span>}
              </span>
            </li>
          </ol>

          <p className="text-2xs leading-relaxed text-subtle-foreground">
            Scaled-down mock. The PDF reserves a fixed height for each image, so tall or very wide
            files are fitted, not cropped.
          </p>
        </div>
      </div>
    </aside>
  );
}
