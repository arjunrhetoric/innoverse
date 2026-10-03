import { NextRequest, NextResponse } from "next/server";
import { connectDB, Certificate } from "@innoverse/database";

export const dynamic = "force-dynamic";

/** Public verification lookup — no session required. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ valid: false, message: "Verification code is required" }, { status: 400 });
    }

    await connectDB();

    const certificate = (await Certificate.findOne({ verificationCode: code })
      .populate("studentId", "name githubUsername")
      .populate("startupId", "name")
      .populate("problemId", "title")
      .lean()) as any;

    if (!certificate) {
      return NextResponse.json({ valid: false, message: "Certificate not found" }, { status: 404 });
    }

    const student = typeof certificate.studentId === "object" ? certificate.studentId : null;
    const startup = typeof certificate.startupId === "object" ? certificate.startupId : null;
    const problem = typeof certificate.problemId === "object" ? certificate.problemId : null;

    return NextResponse.json({
      valid: true,
      certificate: {
        studentName: student?.name ?? "Student",
        studentGithub: student?.githubUsername ?? null,
        startupName: startup?.name ?? "Startup",
        problemTitle: problem?.title ?? "Project",
        rating: certificate.rating,
        review: certificate.review,
        issuedAt: certificate.issuedAt,
        verificationCode: certificate.verificationCode,
        certificateFile: certificate.certificateFile,
        evidence: certificate.evidence ?? null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ valid: false, message: error.message }, { status: 500 });
  }
}
