"use client";

import { useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  X,
  Clock,
  Paperclip,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { proposals } from "@/lib/api";
import { uploadDirect, DirectUploadUnavailableError } from "@/lib/blob-upload";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ".ppt,.pptx";

export default function SubmitProposalPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const problemId = params.problemId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (!description || !file) {
      setError("Please fill all fields and upload a presentation.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError("Presentation must be under 15MB.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1) Browser-direct upload to Blob (skips the serverless body limit).
      //    Falls back to classic multipart when Blob isn't configured (local dev).
      setUploadPhase("Uploading presentation…");
      let directUrl: string | null = null;
      let directError = "";
      try {
        directUrl = await uploadDirect(file, "proposal", (pct) =>
          setUploadPhase(`Uploading presentation… ${pct}%`)
        );
      } catch (err: unknown) {
        if (!(err instanceof DirectUploadUnavailableError)) {
          directError = err instanceof Error ? err.message : "Direct upload failed";
        }
      }

      let data: any;
      if (directUrl) {
        setUploadPhase("Submitting…");
        data = await proposals.submitJson({
          problemId,
          description,
          pptUrl: directUrl,
        });
      } else if (directError) {
        throw new Error(`Upload failed: ${directError}`);
      } else {
        setUploadPhase("Submitting…");
        const formData = new FormData();
        formData.append("problemId", problemId);
        formData.append("description", description);
        formData.append("proposalFile", file);
        data = await proposals.submit(formData);
      }

      if (data.message?.includes("success") || data.proposal) {
        setSuccess(true);
        setTimeout(() => router.push("/dashboard/student"), 2000);
      } else {
        setError(data.message || "Failed to submit proposal");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error submitting proposal");
    } finally {
      setLoading(false);
      setUploadPhase("");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast({
      title: "Presentation removed",
      description: "Nothing will be uploaded until you attach a file again.",
      variant: "info",
    });
  };

  const uploadPct = Number(uploadPhase.match(/(\d+)%/)?.[1] ?? 0);

  if (success) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg py-16 text-center sm:py-24">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-success-border bg-success-subtle">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
            Proposal submitted
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The startup can review it now. Redirecting to your dashboard…
          </p>
          <div className="mt-5 flex justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/student">
                Go to dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        back={{ href: "/dashboard/student", label: "Challenges" }}
        eyebrow={
          <span className="font-mono text-2xs uppercase tracking-[0.18em] text-subtle-foreground">
            New proposal
          </span>
        }
        title="Submit proposal"
        description="Describe your approach and attach your presentation. The startup reviews both before deciding."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-lg border border-border bg-card">
            <header className="border-b border-border px-5 py-4">
              <h2 className="text-md font-semibold tracking-tight text-foreground">
                Your approach
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                What you would build, how, and in what order.
              </p>
            </header>

            <div className="space-y-5 px-5 py-5">
              <Field
                id="description"
                label="Proposal description"
                required
                hint={`${description.trim().length} characters`}
                error={
                  attempted && !description.trim() ? "Describe your approach to submit." : null
                }
              >
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your approach, technical stack, timeline..."
                  className="min-h-[180px]"
                  required
                />
              </Field>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <Label htmlFor="presentation" className="text-[13px] font-medium">
                    Presentation
                    <span className="ml-0.5 text-danger" aria-hidden>
                      *
                    </span>
                  </Label>
                  <span className="text-2xs text-subtle-foreground">PPT, PPTX</span>
                </div>

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors ${
                    dragActive
                      ? "border-brand bg-brand-subtle"
                      : file
                        ? "border-success-border bg-success-subtle/40"
                        : "border-border bg-surface/40 hover:border-border-strong hover:bg-surface"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    id="presentation"
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setFile(e.target.files[0]);
                    }}
                  />
                  {file ? (
                    <div className="flex w-full items-center gap-3 text-left">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {file.name}
                        </span>
                        <span className="tnum block font-mono text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${file.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card shadow-2xs">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <p className="text-sm text-foreground">Drag and drop your deck here</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        Browse files
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        One PowerPoint file, up to 15 MB
                      </p>
                    </>
                  )}
                </div>

                {file && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    Attached. Choose another file to replace it.
                  </p>
                )}
              </div>

              {loading && (
                <div className="space-y-1.5 rounded-md border border-border bg-surface/60 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground" role="status">
                    {uploadPhase || "Submitting…"}
                  </p>
                  <Progress value={uploadPct} tone="brand" />
                </div>
              )}

              <FormError>{error}</FormError>
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Your proposal is sent to the startup that posted the challenge.
              </p>
              <Button
                type="submit"
                variant="default"
                size="lg"
                disabled={loading || !description || !file}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploadPhase || "Submitting..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit proposal
                  </>
                )}
              </Button>
            </footer>
          </section>
        </form>

        {/* Rail */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <header className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Challenge</h2>
            </header>
            <div className="space-y-2 px-4 py-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                You are applying to the challenge you selected. Its title, deadline and required
                skills are on the challenge list.
              </p>
              <div className="rounded-md border border-border bg-surface/50 px-2.5 py-1.5">
                <p className="text-2xs uppercase tracking-[0.08em] text-subtle-foreground">
                  Challenge ID
                </p>
                <p className="mt-0.5 break-all font-mono text-2xs text-muted-foreground">
                  {problemId}
                </p>
              </div>
              <Link
                href="/dashboard/student"
                className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
              >
                Open challenge list
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <header className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Requirements</h2>
            </header>
            <ul className="divide-y divide-border text-xs">
              <li className="flex items-start justify-between gap-3 px-4 py-2.5">
                <span className="text-muted-foreground">Description</span>
                <span className="text-right text-foreground">Required</span>
              </li>
              <li className="flex items-start justify-between gap-3 px-4 py-2.5">
                <span className="text-muted-foreground">Presentation</span>
                <span className="text-right text-foreground">Required</span>
              </li>
              <li className="flex items-start justify-between gap-3 px-4 py-2.5">
                <span className="text-muted-foreground">Files per proposal</span>
                <span className="tnum text-right font-mono text-foreground">1</span>
              </li>
            </ul>
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <header className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">File requirements</h2>
            </header>
            <ul className="divide-y divide-border text-xs">
              <li className="flex items-start justify-between gap-3 px-4 py-2.5">
                <span className="text-muted-foreground">Formats</span>
                <span className="font-mono text-foreground">PPT, PPTX</span>
              </li>
              <li className="flex items-start justify-between gap-3 px-4 py-2.5">
                <span className="text-muted-foreground">Maximum size</span>
                <span className="tnum font-mono text-foreground">15 MB</span>
              </li>
            </ul>
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <header className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <Clock className="h-3.5 w-3.5 text-subtle-foreground" />
              <h2 className="text-sm font-semibold text-foreground">After you submit</h2>
            </header>
            <ol className="space-y-2 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              {[
                "The startup reviews your description and deck.",
                "If approved, you sign the collaboration agreement.",
                "You get read access to the repository and can open pull requests.",
              ].map((step, i) => (
                <li key={step} className="flex gap-2">
                  <span className="tnum shrink-0 font-mono text-subtle-foreground">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
