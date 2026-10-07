"use client";

import { upload } from "@vercel/blob/client";

const MAX_BYTES = 15 * 1024 * 1024;

function contentTypeFor(fileName: string, fallback: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "pdf":
      return "application/pdf";
    default:
      return fallback || "application/octet-stream";
  }
}

function folderFor(kind: "proposal" | "branding", fileName: string) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  return kind === "branding"
    ? `innoverse/uploads/branding/${Date.now()}-${safe}`
    : `innoverse/uploads/${Date.now()}-${safe}`;
}

export class DirectUploadUnavailableError extends Error {
  constructor() {
    super("Direct upload is not configured on this server");
    this.name = "DirectUploadUnavailableError";
  }
}

/**
 * Upload straight to Blob from the browser (no server body involved,
 * so the ~4.5MB serverless limit doesn't apply).
 *
 * Throws DirectUploadUnavailableError when the token route itself is
 * down/misconfigured (local dev without BLOB_READ_WRITE_TOKEN) so callers
 * can fall back to multipart. Any other error is a genuine upload
 * rejection and is thrown with the real message.
 */
export async function uploadDirect(
  file: File,
  kind: "proposal" | "branding",
  onProgress?: (percentage: number) => void
): Promise<string> {
  let tokenCheck: Response;
  try {
    // Probe first so a missing/misconfigured token route degrades to
    // multipart instead of surfacing as a cryptic CORS failure.
    tokenCheck = await fetch("/api/uploads/token", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ probe: true }),
    });
  } catch {
    throw new DirectUploadUnavailableError();
  }

  if (tokenCheck.status === 401) {
    throw new Error("You must be signed in to upload");
  }
  if (!tokenCheck.ok) {
    // Token route broken → caller falls back.
    throw new DirectUploadUnavailableError();
  }
  const probe = await tokenCheck.json().catch(() => null);
  if (!probe?.directUpload) {
    throw new DirectUploadUnavailableError();
  }

  const blob = await upload(folderFor(kind, file.name || "file"), file, {
    access: "public",
    contentType: contentTypeFor(file.name || "", file.type),
    handleUploadUrl: "/api/uploads/token",
    ...(onProgress ? { onUploadProgress: ({ percentage }) => onProgress(percentage) } : {}),
  });
  return blob.url;
}

export { MAX_BYTES as BLOB_MAX_BYTES };
