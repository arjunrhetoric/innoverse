import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

export interface CertificateEvidence {
  mergedPRs: number;
  commits: number;
  milestonesCompleted: number;
  milestonesTotal: number;
}

export interface CertificateData {
  studentName: string;
  problemTitle: string;
  companyName: string;
  rating: number;
  issuedAt: Date;
  verificationCode: string;
  evidence: CertificateEvidence;
  startupLogoAbsPath: string;
  signatureAbsPath: string;
  signatoryName: string;
  signatoryTitle: string;
}

const NAVY = rgb(0.09, 0.13, 0.24);
const GOLD = rgb(0.72, 0.56, 0.16);
const GOLD_LIGHT = rgb(0.85, 0.74, 0.38);
const GRAY = rgb(0.45, 0.46, 0.52);
const IVORY = rgb(0.98, 0.97, 0.94);

/** Fake letter-spacing for small-caps labels (pdf-lib has no tracking). */
function spaced(text: string) {
  return text.split("").join(" ");
}

function isPng(bytes: Uint8Array) {
  return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

async function embedImage(doc: PDFDocument, absPath: string) {
  const bytes = fs.readFileSync(absPath);
  return isPng(bytes) ? doc.embedPng(bytes) : doc.embedJpg(bytes);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Largest size (down to min) that fits maxWidth. Fixes long-name overflow. */
function fitSize(text: string, font: PDFFont, startSize: number, minSize: number, maxWidth: number) {
  let size = startSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 1;
  }
  return size;
}

function centeredX(pageWidth: number, font: PDFFont, size: number, text: string) {
  return (pageWidth - font.widthOfTextAtSize(text, size)) / 2;
}

function drawCentered(page: PDFPage, W: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>, y: number, text: string) {
  page.drawText(text, { x: centeredX(W, font, size, text), y, size, font, color });
}

/**
 * Official Innoverse co-branded certificate (A4 landscape).
 * Ivory + navy + gold theme; serif display type; evidence stat blocks.
 */
export async function renderCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([841.89, 595.28]);
  const W = page.getWidth();
  const H = page.getHeight();

  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);

  // ── Frame: navy outer, gold inner, gold corner accents ──
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: IVORY });
  page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: NAVY, borderWidth: 2.5 });
  page.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: GOLD, borderWidth: 1 });
  const c = 8;
  for (const [cx, cy] of [[26, 26], [W - 26, 26], [26, H - 26], [W - 26, H - 26]] as const) {
    page.drawSquare({ x: cx - c / 2, y: cy - c / 2, size: c, color: GOLD });
  }

  // ── Header ──
  const headerTop = H - 62;
  page.drawText("INNOVERSE", { x: 56, y: headerTop, size: 21, font: sansBold, color: NAVY });
  page.drawText(spaced("INNOVATION ECOSYSTEM"), { x: 57, y: headerTop - 15, size: 7, font: sans, color: GRAY });

  let logoRight = 56;
  let logoBottom = headerTop - 40;
  try {
    const logo = await embedImage(doc, data.startupLogoAbsPath);
    const scale = Math.min(150 / logo.width, 50 / logo.height, 1);
    const w = logo.width * scale;
    const h = logo.height * scale;
    const x = W - 56 - w;
    const y = headerTop + 8 - h;
    page.drawImage(logo, { x, y, width: w, height: h });
    logoRight = W - 56;
    logoBottom = y - 6;
  } catch (err) {
    console.error("Failed to embed startup logo:", err);
    throw new Error("Startup logo could not be read. Re-upload it in Company Branding.");
  }
  const coSize = fitSize(data.companyName.toUpperCase(), sans, 9, 7, 220);
  page.drawText(data.companyName.toUpperCase(), {
    x: logoRight - sans.widthOfTextAtSize(data.companyName.toUpperCase(), coSize),
    y: logoBottom - 12,
    size: coSize,
    font: sans,
    color: GRAY,
  });

  // Divider with centered ornament
  const divY = H - 128;
  page.drawLine({ start: { x: 56, y: divY }, end: { x: W - 56, y: divY }, thickness: 0.75, color: GOLD_LIGHT });
  page.drawSquare({ x: W / 2 - 3.5, y: divY - 3.5, size: 7, color: GOLD });

  // ── Title block ──
  drawCentered(page, W, serifBold, 37, NAVY, H - 178, "Certificate of Completion");
  const projSize = fitSize(data.problemTitle, serifItalic, 14, 10, W - 220);
  const projLines = wrapText(data.problemTitle, serifItalic, projSize, W - 220).slice(0, 2);
  let py = H - 202;
  for (const line of projLines) {
    drawCentered(page, W, serifItalic, projSize, GRAY, py, line);
    py -= projSize + 4;
  }

  // ── Recipient ──
  drawCentered(page, W, sans, 9, GRAY, H - 252, spaced("PROUDLY PRESENTED TO"));
  const nameSize = fitSize(data.studentName, serifBold, 32, 16, W - 200);
  drawCentered(page, W, serifBold, nameSize, NAVY, H - 292, data.studentName);
  // Name underline flourish
  const nameW = Math.min(serifBold.widthOfTextAtSize(data.studentName, nameSize), W - 200);
  page.drawLine({
    start: { x: (W - nameW) / 2 + 20, y: H - 300 },
    end: { x: (W + nameW) / 2 - 20, y: H - 300 },
    thickness: 0.75,
    color: GOLD_LIGHT,
  });

  // ── Evidence stat blocks ──
  const ev = data.evidence;
  const stats: Array<[string, string]> = [
    [String(ev.mergedPRs), ev.mergedPRs === 1 ? "MERGED PULL REQUEST" : "MERGED PULL REQUESTS"],
    [String(ev.commits), ev.commits === 1 ? "COMMIT" : "COMMITS"],
    [`${ev.milestonesCompleted}/${ev.milestonesTotal}`, "MILESTONES"],
  ];
  const colW = 170;
  const totalW = colW * stats.length;
  const startX = (W - totalW) / 2;
  const statY = H - 348;
  stats.forEach(([value, label], i) => {
    const cx = startX + colW * i + colW / 2;
    const vSize = fitSize(value, serifBold, 24, 14, colW - 20);
    page.drawText(value, {
      x: cx - serifBold.widthOfTextAtSize(value, vSize) / 2,
      y: statY,
      size: vSize,
      font: serifBold,
      color: NAVY,
    });
    const lSize = 7;
    const spacedLabel = spaced(label);
    const labelW = sans.widthOfTextAtSize(spacedLabel, lSize);
    page.drawText(spacedLabel, {
      x: cx - Math.min(labelW, colW - 16) / 2,
      y: statY - 14,
      size: labelW > colW - 16 ? 6 : lSize,
      font: sans,
      color: GRAY,
    });
    if (i < stats.length - 1) {
      page.drawLine({
        start: { x: startX + colW * (i + 1), y: statY - 18 },
        end: { x: startX + colW * (i + 1), y: statY + 30 },
        thickness: 0.5,
        color: GOLD_LIGHT,
      });
    }
  });

  drawCentered(
    page, W, sans, 9, GRAY, H - 406,
    `Issued on ${data.issuedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
  );

  // ── Footer: signature (left), seal (center-right), QR (right) ──
  const footTop = 158;
  // Signature
  try {
    const sig = await embedImage(doc, data.signatureAbsPath);
    const scale = Math.min(168 / sig.width, 52 / sig.height, 1);
    page.drawImage(sig, { x: 72, y: footTop - 52, width: sig.width * scale, height: sig.height * scale });
  } catch (err) {
    console.error("Failed to embed signature:", err);
    throw new Error("Signature image could not be read. Re-upload it in Company Branding.");
  }
  page.drawLine({ start: { x: 72, y: footTop - 60 }, end: { x: 252, y: footTop - 60 }, thickness: 0.75, color: NAVY });
  const sigNameSize = fitSize(data.signatoryName, sansBold, 11, 8, 180);
  page.drawText(data.signatoryName, { x: 72, y: footTop - 76, size: sigNameSize, font: sansBold, color: NAVY });
  const sigTitle = data.signatoryTitle ? `${data.signatoryTitle}, ${data.companyName}` : data.companyName;
  const sigTitleSize = fitSize(sigTitle, sans, 9, 7, 220);
  page.drawText(sigTitle, { x: 72, y: footTop - 90, size: sigTitleSize, font: sans, color: GRAY });

  // Seal
  const sealCX = 500;
  const sealCY = 108;
  page.drawCircle({ x: sealCX, y: sealCY, size: 44, borderColor: GOLD, borderWidth: 2 });
  page.drawCircle({ x: sealCX, y: sealCY, size: 37, borderColor: GOLD, borderWidth: 0.75 });
  const sealTop = "INNOVERSE";
  page.drawText(sealTop, {
    x: sealCX - sansBold.widthOfTextAtSize(sealTop, 8.5) / 2,
    y: sealCY + 10,
    size: 8.5,
    font: sansBold,
    color: NAVY,
  });
  page.drawText("VERIFIED", {
    x: sealCX - sansBold.widthOfTextAtSize("VERIFIED", 8.5) / 2,
    y: sealCY - 6,
    size: 8.5,
    font: sansBold,
    color: NAVY,
  });

  // QR + code
  const verifyUrl = `${getBaseUrl()}/verify/${data.verificationCode}`;
  const qrPng = await QRCode.toBuffer(verifyUrl, { width: 360, margin: 1 });
  const qr = await doc.embedPng(qrPng);
  const qrSize = 82;
  const qrX = W - 168;
  const qrY = sealCY - qrSize / 2;
  page.drawImage(qr, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  const scanLabel = spaced("SCAN TO VERIFY");
  page.drawText(scanLabel, {
    x: qrX + (qrSize - sans.widthOfTextAtSize(scanLabel, 6.5)) / 2,
    y: qrY + qrSize + 6,
    size: 6.5,
    font: sans,
    color: GRAY,
  });
  const codeText = data.verificationCode.slice(0, 13);
  page.drawText(codeText, {
    x: qrX + (qrSize - mono.widthOfTextAtSize(codeText, 7)) / 2,
    y: qrY - 13,
    size: 7,
    font: mono,
    color: GRAY,
  });

  return doc.save();
}

export function getBaseUrl() {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function publicPathToAbs(publicPath: string) {
  return path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}
