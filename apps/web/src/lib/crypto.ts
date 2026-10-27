import crypto from "crypto";

/**
 * Symmetric encryption for secrets at rest (currently GitHub tokens).
 * AES-256-GCM with a random IV per value.
 *
 * Key source: TOKEN_ENCRYPTION_KEY (preferred) or NEXTAUTH_SECRET (fallback).
 * Rotating the source invalidates stored ciphertexts — users simply sign in
 * again, which re-encrypts their token.
 */
function keySource(): string {
  const source = process.env.TOKEN_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!source) {
    throw new Error(
      "No encryption key configured. Set TOKEN_ENCRYPTION_KEY (or NEXTAUTH_SECRET)."
    );
  }
  return source;
}

function key(): Buffer {
  return crypto.createHash("sha256").update(keySource(), "utf8").digest();
}

/** Returns `v1:iv:tag:ciphertext` (all base64url). */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Unsupported secret format");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivB64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("v1:");
}
