import { get, put } from "@vercel/blob";
import fs from "fs";
import path from "path";

export function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

/** "private" unless explicitly configured otherwise. Private is the safe default. */
export function blobAccess(): "public" | "private" {
  return process.env.BLOB_ACCESS === "public" ? "public" : "private";
}

let detectedAccess: "public" | "private" | null = null;

/**
 * Resolve the store's access mode.
 * BLOB_ACCESS wins when set; otherwise probe the store once (private first,
 * then public) so the app works against either kind of Blob store.
 */
export async function resolveBlobAccess(): Promise<"public" | "private"> {
  if (process.env.BLOB_ACCESS === "public") return "public";
  if (process.env.BLOB_ACCESS === "private") return "private";
  if (detectedAccess) return detectedAccess;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    detectedAccess = "public";
    return detectedAccess;
  }

  const { put, del } = await import("@vercel/blob");
  for (const access of ["private", "public"] as const) {
    try {
      const probe = await put(`innoverse/__access-probe-${Date.now()}`, "probe", {
        access,
        contentType: "text/plain",
        token,
        addRandomSuffix: true,
      });
      await del(probe.url, { token }).catch(() => null);
      detectedAccess = access;
      return access;
    } catch {
      // Try the other mode.
    }
  }

  detectedAccess = "public";
  return detectedAccess;
}

const LOCAL_PREFIX = "local:";
const LOCAL_DIR = ".private-uploads";

function isLocal(source: string) {
  return source.startsWith(LOCAL_PREFIX);
}

/**
 * Store a file.
 *
 * Production: Vercel Blob with the configured access mode. Private files are
 * only readable through an authorized route in this app.
 * Local dev without a token: written under .private-uploads/ (never served
 * statically) and referenced with a `local:` prefix.
 */
export async function uploadFile(
  data: Uint8Array | Buffer | Blob,
  folder: string,
  fileName: string,
  contentType: string
): Promise<string> {
  const safeFolder = folder.replace(/(^\/+|\/+$)/g, "");
  const safeName = sanitizeFileName(fileName);
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    const body = data instanceof Blob ? data : Buffer.from(data as Uint8Array);
    const access = await resolveBlobAccess();
    const blob = await put(`innoverse/${safeFolder}/${Date.now()}-${safeName}`, body, {
      access,
      contentType,
      token,
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "File storage is not configured (BLOB_READ_WRITE_TOKEN missing). Uploads are disabled."
    );
  }

  const dir = path.join(process.cwd(), LOCAL_DIR, safeFolder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const name = `${Date.now()}-${safeName}`;
  const bytes =
    data instanceof Blob ? Buffer.from(await data.arrayBuffer()) : Buffer.from(data as Uint8Array);
  fs.writeFileSync(path.join(dir, name), bytes);
  return `${LOCAL_PREFIX}${safeFolder}/${name}`;
}

/** Read a stored file back into memory (for PDF embedding, validation, proxying). */
export async function readStoredBytes(source: string): Promise<Buffer> {
  if (isLocal(source)) {
    const rel = source.slice(LOCAL_PREFIX.length);
    const abs = path.join(process.cwd(), LOCAL_DIR, rel);
    return fs.readFileSync(abs);
  }

  // Legacy local files stored under public/ by the previous uploader.
  if (source.startsWith("/")) {
    const abs = path.join(process.cwd(), "public", source.replace(/^\//, ""));
    if (fs.existsSync(abs)) return fs.readFileSync(abs);
    throw new Error("Stored file not found");
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const isPublicUrl = source.includes(".public.blob.vercel-storage.com");

  // Without a token we can still read legacy public blobs over HTTPS.
  if (!token) {
    if (isPublicUrl) {
      const res = await fetch(source, { cache: "no-store" });
      if (!res.ok) throw new Error("Stored file not found");
      return Buffer.from(await res.arrayBuffer());
    }
    throw new Error("Blob storage is not configured");
  }

  const inferredAccess: "public" | "private" = isPublicUrl
    ? "public"
    : source.includes(".private.blob.vercel-storage.com")
      ? "private"
      : await resolveBlobAccess();

  const result = await get(source, { access: inferredAccess, token });
  if (!result || !result.stream) {
    throw new Error("Stored file not found");
  }
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}
