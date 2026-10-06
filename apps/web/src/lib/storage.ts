import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

export function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

/**
 * Upload a file for public serving.
 *
 * Production (Vercel): Vercel Blob, returns a full https URL. Requires
 * BLOB_READ_WRITE_TOKEN. Local disk is read-only on serverless.
 *
 * Local dev without a token: falls back to writing under public/<folder>,
 * returning a site-relative path like before.
 */
export async function uploadPublic(
  data: Uint8Array | Buffer | Blob,
  folder: string,
  fileName: string,
  contentType: string
): Promise<string> {
  const safeFolder = folder.replace(/(^\/+|\/+$)/g, "");
  const safeName = sanitizeFileName(fileName);
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    const body =
      data instanceof Blob ? data : Buffer.from(data as Uint8Array);
    const blob = await put(`innoverse/${safeFolder}/${Date.now()}-${safeName}`, body, {
      access: "public",
      contentType,
      token,
    });
    return blob.url;
  }

  // Serverless filesystems are read-only — without a Blob token there is
  // nowhere durable to put the file. Fail loudly instead of EROFS crash.
  if (process.env.VERCEL) {
    throw new Error(
      "File storage is not configured (BLOB_READ_WRITE_TOKEN missing). Uploads are disabled."
    );
  }

  const dir = path.join(process.cwd(), "public", safeFolder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const name = `${Date.now()}-${safeName}`;
  const bytes =
    data instanceof Blob ? Buffer.from(await data.arrayBuffer()) : Buffer.from(data as Uint8Array);
  fs.writeFileSync(path.join(dir, name), bytes);
  return `/${safeFolder}/${name}`;
}

/**
 * Read back an image stored via uploadPublic — either a Blob https URL
 * (fetched) or a site-relative path (read from disk, dev fallback).
 */
export async function readPublicBytes(source: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source);
    if (!res.ok) {
      throw new Error(`Could not fetch stored image (HTTP ${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  const abs = path.join(process.cwd(), "public", source.replace(/^\//, ""));
  return fs.readFileSync(abs);
}
