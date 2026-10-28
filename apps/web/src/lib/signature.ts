/** Decode a PNG/JPEG data URL into bytes, with size and magic-byte checks. */
export function decodeSignatureDataUrl(input: unknown): Uint8Array | null {
  if (typeof input !== "string") return null;
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(input.trim());
  if (!match) return null;

  const base64 = match[2];
  if (base64.length > 3_000_000) return null; // ~2MB decoded

  const bytes = Buffer.from(base64, "base64");
  if (bytes.length < 8 || bytes.length > 2 * 1024 * 1024) return null;

  const isPng =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

  if (!isPng && !isJpeg) return null;
  return new Uint8Array(bytes);
}
