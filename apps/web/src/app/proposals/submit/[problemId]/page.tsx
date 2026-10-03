"use client";

import { useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Upload, FileText, Send, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { proposals } from "@/lib/api";
import Link from "next/link";

export default function SubmitProposalPage() {
  const params = useParams();
  const router = useRouter();
  const problemId = params.problemId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !file) {
      setError("Please fill all fields and upload a presentation.");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("problemId", problemId);
    formData.append("description", description);
    formData.append("proposalFile", file);

    try {
      const data = await proposals.submit(formData);
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

  if (success) {
    return (
      <AppShell>
        <div className="flex flex-col items-center py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <h2 className="type-display mt-5 text-2xl font-medium text-foreground">
            Proposal submitted
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Redirecting to dashboard…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
        <div className="mx-auto max-w-xl">
          <div className="mb-5">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/student">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Challenges
              </Link>
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              New proposal
            </p>
            <h1 className="type-display mt-1.5 text-2xl font-medium text-foreground">
              Submit proposal
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe your approach and upload your presentation.
            </p>
            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <Label htmlFor="description">Proposal Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your approach, technical stack, timeline..."
                  className="mt-1.5 min-h-[150px]"
                  required
                />
              </div>

              <div>
                <Label>Upload Presentation (PPT/PPTX)</Label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`mt-1.5 cursor-pointer rounded-lg border border-dashed p-8 text-center transition-colors duration-100 ${
                    dragActive
                      ? "border-foreground/40 bg-white/[0.04]"
                      : file
                      ? "border-emerald-500/40 bg-emerald-500/[0.04]"
                      : "border-border hover:border-foreground/25 hover:bg-white/[0.02]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ppt,.pptx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setFile(e.target.files[0]);
                    }}
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-10 w-10 text-emerald-500" />
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-10 w-10 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        Drag and drop or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        PPT, PPTX up to 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full"
                disabled={loading || !description || !file}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Proposal
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
    </AppShell>
  );
}
