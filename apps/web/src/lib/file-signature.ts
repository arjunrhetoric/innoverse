/**
 * Content sniffing for uploaded files. Extensions and MIME types are
 * user-controlled; the first bytes of a file are not.
 */

export type DetectedType =
  | "pptx"
  | "zip"
  | "ppt"
  | "pdf"
  | "png"
  | "jpeg"
  | "html"
  | "svg"
  | "unknown";

function startsWith(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) return false;
  return signature.every((b, i) => bytes[i] === b);
}

function startsWithText(bytes: Uint8Array, text: string) {
  const head = Buffer.from(bytes.slice(0, text.length)).toString("latin1");
  return head.toLowerCase() === text.toLowerCase();
}

export function detectType(bytes: Uint8Array): DetectedType {
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    // Both .pptx and generic zip share this header; callers decide by extension.
    return "pptx";
  }
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "ppt";
  if (startsWithText(bytes, "%PDF")) return "pdf";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWithText(bytes, "<!doctype") || startsWithText(bytes, "<html")) return "html";
  if (startsWithText(bytes, "<svg") || startsWithText(bytes, "<?xml")) return "svg";
  return "unknown";
}

export interface FileValidation {
  ok: boolean;
  detected: DetectedType;
  reason?: string;
}

/** Supported document types for proposals. */
export const PROPOSAL_TYPES: DetectedType[] = ["pptx", "ppt", "pdf"];
export const IMAGE_TYPES: DetectedType[] = ["png", "jpeg"];

/** Validate an in-memory header, used after reading from storage. */
export function validateBytes(
  bytes: Uint8Array,
  allowed: DetectedType[]
): FileValidation {
  const detected = detectType(bytes);
  if (detected === "html" || detected === "svg") {
    return { ok: false, detected, reason: "Executable web content is not allowed" };
  }
  if (!allowed.includes(detected)) {
    return { ok: false, detected, reason: `Unsupported file content (detected ${detected})` };
  }
  return { ok: true, detected };
}

/** Download a small header range and inspect it. */
export async function validateRemoteFile(
  url: string,
  allowed: DetectedType[]
): Promise<FileValidation> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, detected: "unknown", reason: "Invalid file URL" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, detected: "unknown", reason: "File URL must use https" };
  }

  try {
    const res = await fetch(url, {
      headers: { Range: "bytes=0-63" },
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        ok: false,
        detected: "unknown",
        reason: `Could not read the uploaded file (HTTP ${res.status})`,
      };
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const detected = detectType(bytes);

    if (detected === "html" || detected === "svg") {
      return {
        ok: false,
        detected,
        reason: "Executable web content is not allowed",
      };
    }
    if (!allowed.includes(detected)) {
      return {
        ok: false,
        detected,
        reason: `Unsupported file content (detected ${detected})`,
      };
    }
    return { ok: true, detected };
  } catch {
    return {
      ok: false,
      detected: "unknown",
      reason: "Could not verify the uploaded file",
    };
  }
}
