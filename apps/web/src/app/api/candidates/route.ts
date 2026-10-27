import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Certificate } from "@innoverse/database";

export const dynamic = "force-dynamic";

/** Startup's certified candidates, ranked for hiring. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "Startup") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    const certificates = await Certificate.find({ startupId: session.user.id })
      .populate("studentId", "name email githubUsername projectsCompleted ratings")
      .populate("problemId", "title")
      .sort({ "confidence.score": -1, issuedAt: -1 })
      .lean();

    return NextResponse.json({
      candidates: certificates
        .filter((c: any) => c.studentId && typeof c.studentId === "object")
        .map((c: any) => ({
          certificateId: String(c._id),
          publicToken: c.publicToken ?? null,
          verificationCode: c.verificationCode,
          issuedAt: c.issuedAt,
          revoked: Boolean(c.revoked),
          confidence: c.confidence ?? null,
          rubricOverall: c.rubric?.overall ?? null,
          evidence: c.evidence ?? null,
          student: {
            name: c.studentId.name,
            email: c.studentId.email,
            githubUsername: c.studentId.githubUsername ?? null,
            projectsCompleted: c.studentId.projectsCompleted ?? 0,
          },
          project: c.problemId?.title ?? "Project",
        })),
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
