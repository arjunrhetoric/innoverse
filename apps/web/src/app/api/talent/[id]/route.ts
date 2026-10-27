import { NextRequest, NextResponse } from "next/server";
import { connectDB, Certificate, User } from "@innoverse/database";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/** Public profile for an opted-in student. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    }

    await connectDB();

    const student = (await User.findOne({
      _id: id,
      role: "Student",
      profilePublic: true,
    })
      .select(
        "name headline skills location githubUsername projectsCompleted ratings createdAt"
      )
      .lean()) as any;

    if (!student) {
      return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    }

    const certificates = (await Certificate.find({ studentId: id, revoked: false })
      .select(
        "publicToken verificationCode issuedAt confidence rubric evidence summary rating"
      )
      .populate("problemId", "title")
      .populate("startupId", "name companyName")
      .sort({ issuedAt: -1 })
      .lean()) as any[];

    return NextResponse.json({
      student: {
        id: String(student._id),
        name: student.name,
        headline: student.headline ?? null,
        skills: student.skills ?? [],
        location: student.location ?? null,
        githubUsername: student.githubUsername ?? null,
        projectsCompleted: student.projectsCompleted ?? 0,
        memberSince: student.createdAt,
      },
      reports: certificates.map((c) => ({
        token: c.publicToken ?? null,
        verificationCode: c.verificationCode,
        project: typeof c.problemId === "object" ? c.problemId?.title : "Project",
        startup:
          (typeof c.startupId === "object"
            ? c.startupId?.companyName || c.startupId?.name
            : null) ?? "Startup",
        issuedAt: c.issuedAt,
        rating: c.rating,
        confidence: c.confidence ?? null,
        rubricOverall: c.rubric?.overall ?? null,
        evidence: c.evidence ?? null,
        summary: c.summary ?? null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
