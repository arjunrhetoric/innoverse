import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";

export const C = {
  navy: rgb(0.09, 0.13, 0.24),
  gold: rgb(0.72, 0.56, 0.16),
  goldLight: rgb(0.85, 0.74, 0.38),
  gray: rgb(0.42, 0.44, 0.5),
  light: rgb(0.62, 0.63, 0.68),
  line: rgb(0.86, 0.85, 0.81),
  ivory: rgb(0.995, 0.992, 0.98),
  panel: rgb(0.975, 0.97, 0.955),
};

export interface Fonts {
  sans: PDFFont;
  sansBold: PDFFont;
  serif: PDFFont;
  serifBold: PDFFont;
  serifItalic: PDFFont;
  mono: PDFFont;
}

export async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  return {
    sans: await doc.embedFont(StandardFonts.Helvetica),
    sansBold: await doc.embedFont(StandardFonts.HelveticaBold),
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    serifBold: await doc.embedFont(StandardFonts.TimesRomanBold),
    serifItalic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    mono: await doc.embedFont(StandardFonts.Courier),
  };
}

export function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function drawParagraph(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    width: number;
    font: PDFFont;
    size: number;
    color?: ReturnType<typeof rgb>;
    leading?: number;
    maxLines?: number;
  }
): number {
  const leading = opts.leading ?? opts.size * 1.4;
  let y = opts.y;
  const lines = wrap(text, opts.font, opts.size, opts.width);
  const limit = opts.maxLines ?? lines.length;
  for (const line of lines.slice(0, limit)) {
    page.drawText(line, {
      x: opts.x,
      y,
      size: opts.size,
      font: opts.font,
      color: opts.color ?? C.gray,
    });
    y -= leading;
  }
  return y;
}

export function drawFrame(page: PDFPage) {
  const W = page.getWidth();
  const H = page.getHeight();
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.ivory });
  page.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: C.navy, borderWidth: 0.9 });
  page.drawRectangle({ x: 32, y: 32, width: W - 64, height: H - 64, borderColor: C.gold, borderWidth: 0.4 });
}

export function drawDocumentHeader(
  page: PDFPage,
  fonts: Fonts,
  opts: { title: string; code: string; subtitle?: string }
): number {
  const W = page.getWidth();
  const H = page.getHeight();
  const M = 56;

  page.drawText("INNOVERSE", { x: M, y: H - 74, size: 15, font: fonts.sansBold, color: C.navy });
  page.drawText("AGREEMENT REGISTRY", {
    x: M,
    y: H - 87,
    size: 6.5,
    font: fonts.sans,
    color: C.gray,
  });
  page.drawText(opts.code, {
    x: W - M - fonts.mono.widthOfTextAtSize(opts.code, 8),
    y: H - 74,
    size: 8,
    font: fonts.mono,
    color: C.gray,
  });

  page.drawLine({
    start: { x: M, y: H - 100 },
    end: { x: W - M, y: H - 100 },
    thickness: 0.8,
    color: C.gold,
  });

  page.drawText(opts.title, { x: M, y: H - 132, size: 21, font: fonts.serifBold, color: C.navy });
  if (opts.subtitle) {
    page.drawText(opts.subtitle, {
      x: M,
      y: H - 148,
      size: 8.5,
      font: fonts.sans,
      color: C.gray,
    });
    return H - 168;
  }
  return H - 156;
}

export function drawSectionTitle(
  page: PDFPage,
  fonts: Fonts,
  x: number,
  y: number,
  number: string,
  title: string
): number {
  page.drawText(number, { x, y, size: 8, font: fonts.mono, color: C.gold });
  page.drawText(title.toUpperCase(), {
    x: x + 18,
    y,
    size: 8,
    font: fonts.sansBold,
    color: C.navy,
  });
  return y - 14;
}

export function drawPartyBox(
  page: PDFPage,
  fonts: Fonts,
  opts: { x: number; y: number; width: number; label: string; name: string; detail?: string }
) {
  const height = 52;
  page.drawRectangle({
    x: opts.x,
    y: opts.y - height,
    width: opts.width,
    height,
    color: C.panel,
  });
  page.drawRectangle({
    x: opts.x,
    y: opts.y - height,
    width: opts.width,
    height,
    borderColor: C.line,
    borderWidth: 0.5,
  });
  page.drawText(opts.label, {
    x: opts.x + 10,
    y: opts.y - 16,
    size: 6.5,
    font: fonts.sansBold,
    color: C.gray,
  });
  page.drawText(opts.name, {
    x: opts.x + 10,
    y: opts.y - 30,
    size: 11,
    font: fonts.serifBold,
    color: C.navy,
    maxWidth: opts.width - 20,
  });
  if (opts.detail) {
    page.drawText(opts.detail, {
      x: opts.x + 10,
      y: opts.y - 43,
      size: 7.5,
      font: fonts.sans,
      color: C.gray,
      maxWidth: opts.width - 20,
    });
  }
}

export async function embedSignature(doc: PDFDocument, bytes?: Uint8Array | null) {
  if (!bytes || bytes.length < 4) return null;
  try {
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    return isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function drawSignatureBlock(
  doc: PDFDocument,
  page: PDFPage,
  fonts: Fonts,
  opts: {
    x: number;
    y: number;
    width: number;
    label: string;
    name: string;
    detail?: string;
    date?: Date | null;
    signatureBytes?: Uint8Array | null;
    pendingLabel?: string;
  }
) {
  const lineY = opts.y;
  const image = await embedSignature(doc, opts.signatureBytes);

  if (image) {
    const scale = Math.min(opts.width / image.width, 42 / image.height, 1);
    page.drawImage(image, {
      x: opts.x,
      y: lineY + 8,
      width: image.width * scale,
      height: image.height * scale,
    });
  } else if (opts.name) {
    page.drawText(opts.name, {
      x: opts.x + 2,
      y: lineY + 12,
      size: 17,
      font: fonts.serifItalic,
      color: C.navy,
      maxWidth: opts.width - 4,
    });
  }

  page.drawLine({
    start: { x: opts.x, y: lineY },
    end: { x: opts.x + opts.width, y: lineY },
    thickness: 0.75,
    color: C.navy,
  });

  page.drawText(opts.label, {
    x: opts.x,
    y: lineY - 11,
    size: 6.5,
    font: fonts.sans,
    color: C.gray,
  });
  page.drawText(opts.name || "—", {
    x: opts.x,
    y: lineY - 23,
    size: 9,
    font: fonts.sansBold,
    color: C.navy,
    maxWidth: opts.width,
  });
  if (opts.detail) {
    page.drawText(opts.detail, {
      x: opts.x,
      y: lineY - 34,
      size: 7.5,
      font: fonts.sans,
      color: C.gray,
      maxWidth: opts.width,
    });
  }
  if (opts.date) {
    page.drawText(
      opts.date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      {
        x: opts.x,
        y: lineY - 45,
        size: 7.5,
        font: fonts.sans,
        color: C.gray,
      }
    );
  } else if (opts.pendingLabel) {
    page.drawText(opts.pendingLabel, {
      x: opts.x,
      y: lineY - 45,
      size: 7.5,
      font: fonts.sans,
      color: C.gold,
    });
  }
}

export function drawDocumentFooter(
  page: PDFPage,
  fonts: Fonts,
  opts: { left: string; right: string }
) {
  const W = page.getWidth();
  const M = 56;
  page.drawLine({
    start: { x: M, y: 58 },
    end: { x: W - M, y: 58 },
    thickness: 0.4,
    color: C.line,
  });
  page.drawText(opts.left, { x: M, y: 46, size: 6.5, font: fonts.sans, color: C.gray });
  page.drawText(opts.right, {
    x: W - M - fonts.sans.widthOfTextAtSize(opts.right, 6.5),
    y: 46,
    size: 6.5,
    font: fonts.sans,
    color: C.gray,
  });
}
