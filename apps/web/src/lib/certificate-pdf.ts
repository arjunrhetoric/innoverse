import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export interface CertificateEvidence {
  mergedPRs: number;
  prsOpened?: number;
  commits: number;
  commitsByStudent?: number;
  commitsByOthers?: number;
  activeDays?: number;
  linesAdded?: number;
  linesDeleted?: number;
  reviewsGiven?: number;
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
  startupLogoBytes: Uint8Array;
  signatureBytes: Uint8Array;
  signatoryName: string;
  signatoryTitle: string;
  rubric?: {
    rows: Array<{ key: string; label: string; score: number; weight: number; weighted: number }>;
    overall: number;
  };
  confidence?: {
    score: number;
    level: "high" | "medium" | "low";
    reasons: string[];
  };
  summary?: string;
  reportUrl?: string;
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

async function embedImage(doc: PDFDocument, bytes: Uint8Array) {
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
    const logo = await embedImage(doc, data.startupLogoBytes);
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
    const sig = await embedImage(doc, data.signatureBytes);
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

  // ── Page 2: Proof-of-Work Report ──
  await drawReportPage(doc, data, { serif, serifBold, sans, sansBold, mono });

  return doc.save();
}

export function getBaseUrl() {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function drawReportPage(
  doc: PDFDocument,
  data: CertificateData,
  fonts: { serif: PDFFont; serifBold: PDFFont; sans: PDFFont; sansBold: PDFFont; mono: PDFFont }
) {
  const page = doc.addPage([841.89, 595.28]);
  const W = page.getWidth();
  const H = page.getHeight();
  const { serifBold, sans, sansBold, mono } = fonts;
  const ev = data.evidence;

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: IVORY });
  page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: NAVY, borderWidth: 2.5 });
  page.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: GOLD, borderWidth: 1 });

  page.drawText("INNOVERSE", { x: 56, y: H - 62, size: 12, font: sansBold, color: NAVY });
  page.drawText(spaced("PROOF-OF-WORK REPORT"), { x: 56, y: H - 76, size: 6.5, font: sans, color: GRAY });
  page.drawText(data.studentName, {
    x: W - 56 - sansBold.widthOfTextAtSize(data.studentName, 11),
    y: H - 62,
    size: 11,
    font: sansBold,
    color: NAVY,
  });
  page.drawLine({ start: { x: 56, y: H - 92 }, end: { x: W - 56, y: H - 92 }, thickness: 0.75, color: GOLD_LIGHT });

  page.drawText("Evidence snapshot", { x: 56, y: H - 118, size: 13, font: serifBold, color: NAVY });
  page.drawText(data.problemTitle, { x: 56, y: H - 134, size: 9, font: sans, color: GRAY });

  // ── Evidence table (left) ──
  const attribution = ev.commits > 0
    ? Math.round(((ev.commitsByStudent ?? 0) / Math.max(ev.commits, 1)) * 100)
    : 0;
  const rows: Array<[string, string]> = [
    ["Merged pull requests", String(ev.mergedPRs)],
    ["Pull requests opened", String(ev.prsOpened ?? 0)],
    ["Commits authored by student", String(ev.commitsByStudent ?? 0)],
    ["Commit attribution", `${attribution}%`],
    ["Active contribution days", String(ev.activeDays ?? 0)],
    ["Lines added / removed", `${ev.linesAdded ?? 0} / ${ev.linesDeleted ?? 0}`],
    ["Review comments given", String(ev.reviewsGiven ?? 0)],
    ["Milestones completed", `${ev.milestonesCompleted}/${ev.milestonesTotal}`],
  ];

  let rowY = H - 164;
  for (const [label, value] of rows) {
    page.drawText(label, { x: 56, y: rowY, size: 9, font: sans, color: GRAY });
    page.drawText(value, {
      x: 330 - sansBold.widthOfTextAtSize(value, 9),
      y: rowY,
      size: 9,
      font: sansBold,
      color: NAVY,
    });
    page.drawLine({
      start: { x: 56, y: rowY - 5 },
      end: { x: 330, y: rowY - 5 },
      thickness: 0.25,
      color: GOLD_LIGHT,
    });
    rowY -= 22;
  }

  // ── Rubric bars (right) ──
  const barX = 400;
  const barW = 220;
  const barRight = barX + barW;
  page.drawText("Reviewer rubric", { x: barX, y: H - 118, size: 13, font: serifBold, color: NAVY });

  let rubricY = H - 152;
  for (const row of data.rubric?.rows ?? []) {
    page.drawText(row.label, { x: barX, y: rubricY, size: 8.5, font: sans, color: NAVY });
    page.drawText(`${row.score.toFixed(1)} / 5`, {
      x: barRight - sans.widthOfTextAtSize(`${row.score.toFixed(1)} / 5`, 8),
      y: rubricY,
      size: 8,
      font: sans,
      color: GRAY,
    });
    page.drawRectangle({
      x: barX,
      y: rubricY - 12,
      width: barW,
      height: 6,
      color: rgb(0.9, 0.89, 0.86),
    });
    page.drawRectangle({
      x: barX,
      y: rubricY - 12,
      width: Math.max(0, Math.min(1, row.score / 5)) * barW,
      height: 6,
      color: NAVY,
    });
    page.drawText(`weight ${Math.round(row.weight * 100)}%`, {
      x: barX,
      y: rubricY - 23,
      size: 6.5,
      font: sans,
      color: GRAY,
    });
    rubricY -= 38;
  }

  if (data.rubric) {
    page.drawText("Overall rubric score", { x: barX, y: rubricY - 6, size: 9, font: sans, color: GRAY });
    page.drawText(`${data.rubric.overall.toFixed(2)} / 5`, {
      x: barRight - sansBold.widthOfTextAtSize(`${data.rubric.overall.toFixed(2)} / 5`, 11),
      y: rubricY - 8,
      size: 11,
      font: sansBold,
      color: NAVY,
    });
  }

  // ── Confidence block (bottom left) ──
  const conf = data.confidence;
  if (conf) {
    page.drawText("Contribution confidence", { x: 56, y: 236, size: 11, font: serifBold, color: NAVY });
    page.drawText(`${conf.score}`, { x: 56, y: 200, size: 30, font: serifBold, color: NAVY });
    page.drawText("/ 100", { x: 56 + serifBold.widthOfTextAtSize(`${conf.score}`, 30) + 4, y: 202, size: 9, font: sans, color: GRAY });
    page.drawRectangle({
      x: 130,
      y: 208,
      width: 180,
      height: 8,
      color: rgb(0.9, 0.89, 0.86),
    });
    page.drawRectangle({
      x: 130,
      y: 208,
      width: (conf.score / 100) * 180,
      height: 8,
      color: conf.level === "high" ? rgb(0.13, 0.55, 0.36) : conf.level === "medium" ? GOLD : rgb(0.7, 0.25, 0.25),
    });
    page.drawText(
      conf.level.toUpperCase(),
      { x: 132, y: 220, size: 7, font: sansBold, color: GRAY }
    );

    let reasonY = 180;
    for (const reason of conf.reasons.slice(0, 4)) {
      for (const line of wrapText(`• ${reason}`, sans, 7.5, 330).slice(0, 2)) {
        page.drawText(line, { x: 56, y: reasonY, size: 7.5, font: sans, color: GRAY });
        reasonY -= 10;
      }
    }
  }

  // ── Reviewer summary + verification footer ──
  if (data.summary) {
    page.drawText("Reviewer summary", { x: 420, y: 236, size: 9, font: sansBold, color: NAVY });
    let summaryY = 220;
    for (const line of wrapText(data.summary, sans, 8, 340).slice(0, 6)) {
      page.drawText(line, { x: 420, y: summaryY, size: 8, font: sans, color: GRAY });
      summaryY -= 11;
    }
  }

  page.drawLine({ start: { x: 56, y: 74 }, end: { x: W - 56, y: 74 }, thickness: 0.5, color: GOLD_LIGHT });
  page.drawText(
    `Evidence captured ${data.issuedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · Immutable snapshot`,
    { x: 56, y: 58, size: 7, font: sans, color: GRAY }
  );

  const verifyUrl = data.reportUrl || `${getBaseUrl()}/r/${data.verificationCode}`;
  page.drawText(verifyUrl, {
    x: W - 56 - mono.widthOfTextAtSize(verifyUrl, 7),
    y: 58,
    size: 7,
    font: mono,
    color: GRAY,
  });

  page.drawText(spaced("INNOVERSE • VERIFIED EVIDENCE"), {
    x: (W - sans.widthOfTextAtSize(spaced("INNOVERSE • VERIFIED EVIDENCE"), 6.5)) / 2,
    y: 42,
    size: 6.5,
    font: sans,
    color: GOLD,
  });
}
