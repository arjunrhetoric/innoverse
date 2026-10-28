import { PDFDocument } from "pdf-lib";
import {
  C,
  drawDocumentFooter,
  drawDocumentHeader,
  drawFrame,
  drawParagraph,
  drawPartyBox,
  drawSectionTitle,
  drawSignatureBlock,
  loadFonts,
  wrap,
} from "./pdf-kit";

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
  studentSignatureBytes?: Uint8Array | null;
}

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** Paid micro-internship agreement, signed by both parties on acceptance. */
export async function renderContractPdf(data: ContractData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const W = page.getWidth();
  const fonts = await loadFonts(doc);
  const M = 56;

  drawFrame(page);

  let y = drawDocumentHeader(page, fonts, {
    title: "Micro-Internship Agreement",
    code: data.contractCode,
    subtitle: "Innoverse paid engagement registry · Milestone-based",
  });

  // ── Parties ──
  const boxW = (W - 2 * M - 10) / 2;
  drawPartyBox(page, fonts, {
    x: M,
    y,
    width: boxW,
    label: "STARTUP",
    name: data.startupName,
    detail: data.startupSignatoryName
      ? `${data.startupSignatoryName}${data.startupSignatoryTitle ? `, ${data.startupSignatoryTitle}` : ""}`
      : "Authorized representative",
  });
  drawPartyBox(page, fonts, {
    x: M + boxW + 10,
    y,
    width: boxW,
    label: "STUDENT",
    name: data.studentName,
    detail: "Independent contributor",
  });
  y -= 64;

  // ── Scope ──
  y = drawSectionTitle(page, fonts, M, y, "01", "Scope");
  y = drawParagraph(page, data.title, {
    x: M,
    y,
    width: W - 2 * M,
    font: fonts.serifBold,
    size: 12,
    color: C.navy,
    leading: 15,
    maxLines: 2,
  });
  page.drawText("Challenge", { x: M, y, size: 7, font: fonts.sansBold, color: C.gray });
  page.drawText(data.challengeTitle, { x: M + 58, y, size: 8, font: fonts.sans, color: C.navy });
  y -= 14;
  y = drawParagraph(page, data.description || "Deliver the agreed scope.", {
    x: M,
    y,
    width: W - 2 * M,
    font: fonts.sans,
    size: 8.5,
    color: C.gray,
    leading: 12,
    maxLines: 4,
  });

  // ── Schedule ──
  y -= 10;
  y = drawSectionTitle(page, fonts, M, y, "02", "Schedule of payments");
  const amountX = W - M - 150;
  const dueX = W - M - 56;
  page.drawText("DELIVERABLE", { x: M, y, size: 6.5, font: fonts.sansBold, color: C.gray });
  page.drawText("AMOUNT", { x: amountX, y, size: 6.5, font: fonts.sansBold, color: C.gray });
  page.drawText("DUE", { x: dueX, y, size: 6.5, font: fonts.sansBold, color: C.gray });
  y -= 7;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: C.line });
  y -= 13;

  const rows = data.milestones.slice(0, 8);
  rows.forEach((m, i) => {
    page.drawText(`${i + 1}. ${m.title}`, {
      x: M,
      y,
      size: 8.5,
      font: fonts.sans,
      color: C.navy,
      maxWidth: amountX - M - 10,
    });
    page.drawText(money(m.amount, data.currency), {
      x: amountX,
      y,
      size: 8.5,
      font: fonts.sans,
      color: C.navy,
    });
    page.drawText(
      m.dueDate
        ? new Date(m.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "—",
      { x: dueX, y, size: 7.5, font: fonts.sans, color: C.gray }
    );
    y -= 15;
  });
  if (data.milestones.length > rows.length) {
    page.drawText(`+ ${data.milestones.length - rows.length} more milestone(s)`, {
      x: M,
      y,
      size: 7.5,
      font: fonts.sans,
      color: C.gray,
    });
    y -= 13;
  }

  page.drawLine({ start: { x: M, y: y + 7 }, end: { x: W - M, y: y + 7 }, thickness: 0.5, color: C.line });
  y -= 4;
  page.drawText("TOTAL", { x: M, y, size: 8.5, font: fonts.sansBold, color: C.navy });
  page.drawText(money(data.totalAmount, data.currency), {
    x: amountX,
    y,
    size: 9.5,
    font: fonts.sansBold,
    color: C.navy,
  });

  // ── Terms ──
  y -= 22;
  y = drawSectionTitle(page, fonts, M, y, "03", "Terms");
  const terms = [
    "Payment: the startup pays each milestone after the student delivers it with evidence; the student confirms receipt in Innoverse. Innoverse records status but does not process or hold funds.",
    "IP assignment: on full payment of all milestones, the student assigns to the startup all rights, title and interest in the deliverables created under this engagement.",
    "Confidentiality: both parties keep non-public information received through this engagement confidential and use it only to perform the work.",
    "Independent contractor: the student is not an employee; no salary, benefits or exclusivity are created.",
  ];
  for (const term of terms) {
    if (y < 240) break;
    for (const line of wrap(`• ${term}`, fonts.sans, 8, W - 2 * M - 4).slice(0, 3)) {
      page.drawText(line, { x: M, y, size: 8, font: fonts.sans, color: C.gray });
      y -= 10.5;
    }
    y -= 2.5;
  }

  // ── Signatures ──
  const sigY = 150;
  page.drawLine({
    start: { x: M, y: sigY + 96 },
    end: { x: W - M, y: sigY + 96 },
    thickness: 0.4,
    color: C.line,
  });
  drawSectionTitle(page, fonts, M, sigY + 82, "04", "Signatures");

  const sigW = (W - 2 * M - 24) / 2;
  await drawSignatureBlock(doc, page, fonts, {
    x: M,
    y: sigY + 30,
    width: sigW,
    label: "SIGNED FOR THE STARTUP",
    name: data.startupSignatoryName || data.startupName,
    detail: data.startupSignatoryTitle
      ? `${data.startupSignatoryTitle}, ${data.startupName}`
      : data.startupName,
    date: data.issuedAt,
    signatureBytes: data.signatureBytes,
  });

  await drawSignatureBlock(doc, page, fonts, {
    x: M + sigW + 24,
    y: sigY + 30,
    width: sigW,
    label: "ACCEPTED BY THE STUDENT",
    name: data.studentAcceptedName || data.studentName,
    detail: data.studentAcceptedAt
      ? "Engagement and IP assignment accepted"
      : "Pending acceptance in Innoverse",
    date: data.studentAcceptedAt ?? null,
    signatureBytes: data.studentSignatureBytes,
    pendingLabel: data.studentAcceptedAt ? undefined : "Pending signature",
  });

  drawDocumentFooter(page, fonts, {
    left: `Issued ${data.issuedAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })} · Innoverse engagement registry`,
    right: "Page 1 of 1 · demo template, not legal advice",
  });

  return doc.save();
}
