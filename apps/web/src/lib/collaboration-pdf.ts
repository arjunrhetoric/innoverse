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
  studentAcceptedName?: string | null;
  studentAcceptedAt?: Date | null;
  studentSignatureBytes?: Uint8Array | null;
}

/**
 * Collaboration + IP assignment agreement.
 * Generated as a draft at approval (student signature pending) and
 * re-generated with the student's signature when they accept.
 */
export async function renderCollaborationPdf(
  data: CollaborationAgreementData
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const W = page.getWidth();
  const H = page.getHeight();
  const M = 56;
  const fonts = await loadFonts(doc);

  drawFrame(page);

  let y = drawDocumentHeader(page, fonts, {
    title: "Collaboration & IP Assignment Agreement",
    code: data.agreementCode,
    subtitle: "Innoverse collaboration registry · Read-only contribution model",
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
    detail: data.repoUrl ? "Approved contributor" : "Contributor",
  });
  y -= 64;

  // ── Project ──
  y = drawSectionTitle(page, fonts, M, y, "01", "Project");
  y = drawParagraph(page, data.projectTitle, {
    x: M,
    y,
    width: W - 2 * M,
    font: fonts.serifBold,
    size: 12,
    color: C.navy,
    leading: 15,
    maxLines: 2,
  });
  if (data.repoUrl) {
    page.drawText("Repository", { x: M, y, size: 7, font: fonts.sansBold, color: C.gray });
    page.drawText(data.repoUrl, {
      x: M + 62,
      y,
      size: 8,
      font: fonts.mono,
      color: C.navy,
    });
    y -= 14;
  }
  y = drawParagraph(
    page,
    data.projectDescription || "Contributions to the project described by the startup.",
    { x: M, y, width: W - 2 * M, font: fonts.sans, size: 8.5, color: C.gray, leading: 12, maxLines: 5 }
  );

  // ── Terms ──
  y -= 10;
  y = drawSectionTitle(page, fonts, M, y, "02", "Terms");
  const terms = [
    "Access: the student receives read-only access to the repository and contributes through forks and pull requests. Direct pushes to protected branches are not permitted; merges require the startup's review.",
    "IP assignment: the student assigns to the startup all rights, title and interest in the contributions created under this collaboration, effective on creation of each contribution.",
    "Confidentiality: the student keeps non-public information in the repository confidential and uses it only to perform this collaboration.",
    "No employment: this collaboration is not an employment relationship and creates no salary, benefits or exclusivity.",
    "Attribution: the startup will make reasonable efforts to credit the student in the project history; the student may reference the verified contributions in their portfolio.",
    "Conduct: both parties follow the repository's contribution guidelines and applicable law.",
  ];

  for (const term of terms) {
    if (y < 250) break;
    const lines = wrap(`• ${term}`, fonts.sans, 8, W - 2 * M - 4);
    for (const line of lines.slice(0, 4)) {
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
  drawSectionTitle(page, fonts, M, sigY + 82, "03", "Signatures");

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
      ? "Collaboration and IP assignment accepted"
      : "Pending acceptance in Innoverse",
    date: data.studentAcceptedAt ?? null,
    signatureBytes: data.studentSignatureBytes,
    pendingLabel: data.studentAcceptedAt ? undefined : "Pending signature",
  });

  drawDocumentFooter(page, fonts, {
    left: `Effective ${data.issuedAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })} · Innoverse agreement registry`,
    right: "Page 1 of 1 · demo template, not legal advice",
  });

  return doc.save();
}
