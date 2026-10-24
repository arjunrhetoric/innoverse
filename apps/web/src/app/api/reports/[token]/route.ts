import { NextRequest, NextResponse } from "next/server";
import { connectDB, Certificate } from "@innoverse/database";

export const dynamic = "force-dynamic";

/** Public Proof-of-Work Report — no authentication required. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || token.length < 8) {
      return NextResponse.json({ message: "Report not found" }, { status: 404 });
    }

    await connectDB();

    const certificate = (await Certificate.findOne({ publicToken: token })
      .populate("studentId", "name githubUsername projectsCompleted ratings")
      .populate("startupId", "name companyName")
      .populate("problemId", "title description")
      .lean()) as any;

    if (!certificate) {
      return NextResponse.json({ message: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      report: {
        publicToken: certificate.publicToken,
        issuedAt: certificate.issuedAt,
        verificationCode: certificate.verificationCode,
        certificateFile: certificate.certificateFile,
        sha256: certificate.sha256 ?? null,
        revoked: Boolean(certificate.revoked),
        revokedAt: certificate.revokedAt ?? null,
        revocationReason: certificate.revocationReason ?? null,
        summary: certificate.summary ?? certificate.review ?? "",
        evidence: certificate.evidence ?? null,
        rubric: certificate.rubric ?? null,
        confidence: certificate.confidence ?? null,
        rating: certificate.rating,
        student: certificate.studentId
          ? {
              name: certificate.studentId.name,
              githubUsername: certificate.studentId.githubUsername,
              projectsCompleted: certificate.studentId.projectsCompleted,
            }
          : null,
        startup: certificate.startupId
          ? {
              name: certificate.startupId.name,
              companyName: certificate.startupId.companyName,
            }
          : null,
        problem: certificate.problemId
          ? { title: certificate.problemId.title }
          : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
