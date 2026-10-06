"use client";

import { upload } from "@vercel/blob/client";

function folderFor(kind: "proposal" | "branding", fileName: string) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  return kind === "branding"
    ? `innoverse/uploads/branding/${Date.now()}-${safe}`
    : `innoverse/uploads/${Date.now()}-${safe}`;
}

/**
 * Upload straight to Blob from the browser (no server body involved,
 * so the ~4.5MB serverless limit doesn't apply).
 *
 * Returns the public URL, or null when direct upload is unavailable
 * (local dev without BLOB_READ_WRITE_TOKEN) so callers can fall back
 * to the classic multipart POST.
 */
export async function uploadDirect(
  file: File,
  kind: "proposal" | "branding"
): Promise<string | null> {
  try {
    const blob = await upload(folderFor(kind, file.name || "file"), file, {
      access: "public",
      handleUploadUrl: "/api/uploads/token",
    });
    return blob.url;
  } catch {
    return null;
  }
}
