import { PDFDocument, PDFFont, rgb, StandardFonts } from "pdf-lib";

export interface ContractMilestone {
  title: string;
  amount: number;
  dueDate?: string | null;
}

export interface ContractData {
  contractCode: string;
  title: string;
  description: string;
  challengeTitle: string;
  startupName: string;
  studentName: string;
  currency: string;
  totalAmount: number;
  milestones: ContractMilestone[];
  issuedAt: Date;
  startupSignatoryName?: string | null;
  startupSignatoryTitle?: string | null;
  signatureBytes?: Uint8Array | null;
  studentAcceptedName?: string | null;
  studentAcceptedAt?: Date | null;
}

const NAVY = rgb(0.09, 0.13, 0.24);
const GOLD = rgb(0.72, 0.56, 0.16);
const GRAY = rgb(0.42, 0.44, 0.5);
const LINE = rgb(0.85, 0.84, 0.8);

function money(amount: number, currency: string) {
  const value = amount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return `${currency} ${value}`;
}

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

/** One-page micro-internship agreement, generated when the student accepts. */
export async function renderContractPdf(data: ContractData): Promise<Uint8Array> {
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

  // Header
  page.drawText("INNOVERSE", { x: M, y: H - 72, size: 14, font: bold, color: NAVY });
  page.drawText("MICRO-INTERNSHIP AGREEMENT", { x: M, y: H - 86, size: 7, font: sans, color: GRAY });
  page.drawText(data.contractCode, {
    x: W - M - mono.widthOfTextAtSize(data.contractCode, 8),
    y: H - 72,
    size: 8,
    font: mono,
    color: GRAY,
  });
  page.drawLine({ start: { x: M, y: H - 98 }, end: { x: W - M, y: H - 98 }, thickness: 0.75, color: GOLD });

  page.drawText(data.title, { x: M, y: H - 128, size: 19, font: serif, color: NAVY });
  page.drawText("This agreement is made between:", { x: M, y: H - 150, size: 9, font: sans, color: GRAY });

  // Parties
  let y = H - 172;
  const party = (role: string, name: string) => {
    page.drawText(role, { x: M, y, size: 8, font: bold, color: GRAY });
    page.drawText(name, { x: M + 92, y, size: 10, font: bold, color: NAVY });
    y -= 16;
  };
  party("STARTUP", data.startupName);
  party("STUDENT", data.studentName);
  party("ISSUED", data.issuedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));

  // Scope
  y -= 8;
  page.drawText("1. SCOPE", { x: M, y, size: 9, font: bold, color: NAVY });
  y -= 14;
  page.drawText(`Challenge: ${data.challengeTitle}`, { x: M, y, size: 9, font: sans, color: NAVY });
  y -= 14;
  for (const line of wrap(data.description || "Deliver the agreed scope for the challenge above.", sans, 9, W - 2 * M).slice(0, 6)) {
    page.drawText(line, { x: M, y, size: 9, font: sans, color: GRAY });
    y -= 12;
  }

  // Milestones
  y -= 10;
  page.drawText("2. SCHEDULE OF PAYMENTS", { x: M, y, size: 9, font: bold, color: NAVY });
  y -= 18;
  const cols = { title: M, amount: W - M - 150, due: W - M - 60 };
  page.drawText("DELIVERABLE", { x: cols.title, y, size: 7, font: bold, color: GRAY });
  page.drawText("AMOUNT", { x: cols.amount, y, size: 7, font: bold, color: GRAY });
  page.drawText("DUE", { x: cols.due, y, size: 7, font: bold, color: GRAY });
  y -= 6;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: LINE });
  y -= 14;

  data.milestones.forEach((m, i) => {
    page.drawText(`${i + 1}. ${m.title}`, {
      x: cols.title,
      y,
      size: 9,
      font: sans,
      color: NAVY,
      maxWidth: cols.amount - cols.title - 8,
    });
    page.drawText(money(m.amount, data.currency), {
      x: cols.amount,
      y,
      size: 9,
      font: sans,
      color: NAVY,
    });
    page.drawText(
      m.dueDate ? new Date(m.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—",
      { x: cols.due, y, size: 8, font: sans, color: GRAY }
    );
    y -= 16;
  });

  page.drawLine({ start: { x: M, y: y + 8 }, end: { x: W - M, y: y + 8 }, thickness: 0.5, color: LINE });
  y -= 4;
  page.drawText("TOTAL", { x: cols.title, y, size: 9, font: bold, color: NAVY });
  page.drawText(money(data.totalAmount, data.currency), {
    x: cols.amount,
    y,
    size: 10,
    font: bold,
    color: NAVY,
  });

  // Terms
  y -= 26;
  page.drawText("3. TERMS", { x: M, y, size: 9, font: bold, color: NAVY });
  y -= 14;
  const terms = [
    "Intellectual property: on full payment of all milestones, the student assigns to the startup all rights, title and interest in the deliverables created under this engagement.",
    "Confidentiality: both parties keep non-public information received through this engagement confidential and use it only to perform the work.",
    "Payment: the startup pays each milestone after accepting the deliverable; the student confirms receipt in Innoverse. Innoverse records the status but does not process or hold funds.",
    "Evidence: completion may be evidenced by merged pull requests, commits and milestones recorded on the linked GitHub repository.",
  ];
  for (const term of terms) {
    for (const line of wrap(`• ${term}`, sans, 8, W - 2 * M - 4).slice(0, 3)) {
      page.drawText(line, { x: M, y, size: 8, font: sans, color: GRAY });
      y -= 10;
    }
    y -= 3;
  }

  // Signatures
  const signY = 150;
  page.drawText("4. SIGNATURES", { x: M, y: signY + 52, size: 9, font: bold, color: NAVY });

  if (data.signatureBytes) {
    try {
      const sig = await doc.embedPng(data.signatureBytes);
      const scale = Math.min(150 / sig.width, 42 / sig.height, 1);
      page.drawImage(sig, { x: M, y: signY + 4, width: sig.width * scale, height: sig.height * scale });
    } catch {
      // Fall back to a typed signature line.
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
  page.drawText(data.studentAcceptedName || data.studentName, { x: sx, y: signY - 14, size: 9, font: bold, color: NAVY });
  page.drawText(
    data.studentAcceptedAt
      ? `Accepted ${data.studentAcceptedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
      : "Student acceptance pending",
    { x: sx, y: signY - 26, size: 7.5, font: sans, color: GRAY }
  );

  page.drawText(
    "Generated by Innoverse. This is a demonstration agreement and not legal advice; have counsel review before real use.",
    { x: M, y: 62, size: 6.5, font: sans, color: GRAY }
  );

  return doc.save();
}
