import { PDFDocument, PDFFont, rgb, StandardFonts } from "pdf-lib";

export interface CollaborationAgreementData {
  agreementCode: string;
  projectTitle: string;
  projectDescription: string;
  startupName: string;
  studentName: string;
  repoUrl?: string | null;
  issuedAt: Date;
  startupSignatoryName?: string | null;
  startupSignatoryTitle?: string | null;
  signatureBytes?: Uint8Array | null;
  studentAcceptedName: string;
  studentAcceptedAt: Date;
}

const NAVY = rgb(0.09, 0.13, 0.24);
const GOLD = rgb(0.72, 0.56, 0.16);
const GRAY = rgb(0.42, 0.44, 0.5);
const LINE = rgb(0.85, 0.84, 0.8);

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
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

/**
 * Collaboration + IP assignment agreement, generated when the student
 * accepts terms at approval time — before any repository access is granted.
 */
export async function renderCollaborationPdf(
  data: CollaborationAgreementData
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const W = page.getWidth();
  const H = page.getHeight();
  const M = 48;

  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
  const mono = await doc.embedFont(StandardFonts.Courier);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.995, 0.992, 0.98) });
  page.drawRectangle({ x: M - 12, y: M - 12, width: W - 2 * (M - 12), height: H - 2 * (M - 12), borderColor: NAVY, borderWidth: 1 });
  page.drawRectangle({ x: M - 6, y: M - 6, width: W - 2 * (M - 6), height: H - 2 * (M - 6), borderColor: GOLD, borderWidth: 0.5 });

  page.drawText("INNOVERSE", { x: M, y: H - 72, size: 14, font: bold, color: NAVY });
  page.drawText("COLLABORATION & IP ASSIGNMENT AGREEMENT", { x: M, y: H - 86, size: 6.5, font: sans, color: GRAY });
  page.drawText(data.agreementCode, {
    x: W - M - mono.widthOfTextAtSize(data.agreementCode, 8),
    y: H - 72,
    size: 8,
    font: mono,
    color: GRAY,
  });
  page.drawLine({ start: { x: M, y: H - 98 }, end: { x: W - M, y: H - 98 }, thickness: 0.75, color: GOLD });

  page.drawText(data.projectTitle, { x: M, y: H - 128, size: 19, font: serif, color: NAVY });
  page.drawText("This agreement is made between:", { x: M, y: H - 150, size: 9, font: sans, color: GRAY });

  let y = H - 172;
  const party = (role: string, name: string) => {
    page.drawText(role, { x: M, y, size: 8, font: bold, color: GRAY });
    page.drawText(name, { x: M + 92, y, size: 10, font: bold, color: NAVY });
    y -= 16;
  };
  party("STARTUP", data.startupName);
  party("STUDENT", data.studentName);
  party("EFFECTIVE", data.issuedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));

  if (data.repoUrl) {
    y -= 2;
    page.drawText("REPOSITORY", { x: M, y, size: 8, font: bold, color: GRAY });
    page.drawText(data.repoUrl, { x: M + 92, y, size: 8.5, font: sans, color: NAVY });
    y -= 16;
  }

  y -= 8;
  page.drawText("1. PROJECT", { x: M, y, size: 9, font: bold, color: NAVY });
  y -= 14;
  for (const line of wrap(data.projectDescription || "Contribute to the project described by the startup.", sans, 9, W - 2 * M).slice(0, 6)) {
    page.drawText(line, { x: M, y, size: 9, font: sans, color: GRAY });
    y -= 12;
  }

  y -= 10;
  page.drawText("2. TERMS", { x: M, y, size: 9, font: bold, color: NAVY });
  y -= 14;

  const terms = [
    "Access: the student receives read access to the repository and contributes through forks and pull requests. Direct pushes to protected branches are not permitted; merges require the startup's review.",
    "IP assignment: the student assigns to the startup all rights, title and interest in the contributions created under this collaboration, effective on creation of each contribution.",
    "Confidentiality: the student keeps non-public information in the repository confidential and uses it only to perform this collaboration.",
    "No employment: this collaboration is not an employment relationship and creates no salary, benefits or exclusivity.",
    "Attribution: the startup will make reasonable efforts to credit the student in the project history; the student may reference the verified contributions in their portfolio.",
    "Conduct: both parties follow the repository's contribution guidelines and applicable law.",
  ];

  for (const term of terms) {
    for (const line of wrap(`• ${term}`, sans, 8, W - 2 * M - 4).slice(0, 4)) {
      page.drawText(line, { x: M, y, size: 8, font: sans, color: GRAY });
      y -= 10;
    }
    y -= 3;
  }

  y -= 6;
  page.drawText("3. SIGNATURES", { x: M, y, size: 9, font: bold, color: NAVY });

  const signY = Math.max(150, y - 70);
  if (data.signatureBytes) {
    try {
      const sig = await doc.embedPng(data.signatureBytes);
      const scale = Math.min(150 / sig.width, 42 / sig.height, 1);
      page.drawImage(sig, { x: M, y: signY + 4, width: sig.width * scale, height: sig.height * scale });
    } catch {
      // Typed signature fallback below.
    }
  }
  page.drawLine({ start: { x: M, y: signY }, end: { x: M + 200, y: signY }, thickness: 0.75, color: NAVY });
  page.drawText(data.startupSignatoryName || data.startupName, { x: M, y: signY - 14, size: 9, font: bold, color: NAVY });
  page.drawText(
    `${data.startupSignatoryTitle ? `${data.startupSignatoryTitle}, ` : ""}${data.startupName}`,
    { x: M, y: signY - 26, size: 7.5, font: sans, color: GRAY }
  );

  const sx = W / 2 + 20;
  page.drawLine({ start: { x: sx, y: signY }, end: { x: sx + 200, y: signY }, thickness: 0.75, color: NAVY });
  page.drawText(data.studentAcceptedName, { x: sx, y: signY - 14, size: 9, font: bold, color: NAVY });
  page.drawText(
    `Accepted ${data.studentAcceptedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    { x: sx, y: signY - 26, size: 7.5, font: sans, color: GRAY }
  );

  page.drawText(
    "Generated by Innoverse. This is a demonstration agreement and not legal advice; have counsel review before real use.",
    { x: M, y: 62, size: 6.5, font: sans, color: GRAY }
  );

  return doc.save();
}
