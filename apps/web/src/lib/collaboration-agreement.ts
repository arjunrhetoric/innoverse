import crypto from "crypto";
import { readStoredBytes, uploadFile } from "./storage";
import { renderCollaborationPdf } from "./collaboration-pdf";

interface GenerateInput {
  problem: any;
  student: any;
  startup: any;
  code?: string | null;
  studentSignatureBytes?: Uint8Array | null;
  signedAt?: Date | null;
}

export interface GeneratedAgreement {
  agreementCode: string;
  agreementFile: string;
}

/**
 * Render and store the collaboration agreement.
 * Called at approval (draft, student signature pending) and again when the
 * student signs (final, with their signature).
 */
export async function generateCollaborationAgreement(
  input: GenerateInput
): Promise<GeneratedAgreement> {
  const { problem, student, startup } = input;

  let signatureBytes: Uint8Array | null = null;
  if (startup?.signatureImage) {
    try {
      signatureBytes = await readStoredBytes(startup.signatureImage);
    } catch (error) {
      console.error("Startup signature unavailable:", error);
    }
  }

  const agreementCode =
    input.code || `COL-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const issuedAt = new Date();

  const pdf = await renderCollaborationPdf({
    agreementCode,
    projectTitle: problem.title,
    projectDescription: problem.description,
    startupName: startup?.companyName || startup?.name || "Startup",
    studentName: student?.name || "Student",
    repoUrl:
      problem.githubIssueUrl ||
      (problem.githubOwner && problem.githubRepoName
        ? `https://github.com/${problem.githubOwner}/${problem.githubRepoName}`
        : null),
    issuedAt,
    startupSignatoryName: startup?.signatoryName ?? null,
    startupSignatoryTitle: startup?.signatoryTitle ?? null,
    signatureBytes,
    studentAcceptedName: input.signedAt ? student?.name ?? null : null,
    studentAcceptedAt: input.signedAt ?? null,
    studentSignatureBytes: input.studentSignatureBytes ?? null,
  });

  const agreementFile = await uploadFile(
    Buffer.from(pdf),
    "agreements",
    `collaboration-${agreementCode}.pdf`,
    "application/pdf"
  );

  return { agreementCode, agreementFile };
}
