import { NextResponse } from "next/server";
import { connectDB, Certificate, Problem } from "@innoverse/database";

export const dynamic = "force-dynamic";

/** Public discovery feed: open challenges + published reports. No auth. */
export async function GET() {
  try {
    await connectDB();

    const [challenges, reports] = await Promise.all([
      Problem.find({ completed: false })
        .select("title description skillsRequired finalDeadline createdAt githubRepoName")
        .populate("createdBy", "name companyName")
        .sort({ createdAt: -1 })
        .limit(24)
        .lean(),
      Certificate.find({ revoked: false, publicToken: { $ne: null } })
        .select("publicToken issuedAt confidence rubric evidence.stats studentId problemId")
        .populate("studentId", "name githubUsername")
        .populate("problemId", "title")
        .sort({ issuedAt: -1 })
        .limit(6)
        .lean(),
    ]);

    return NextResponse.json({
      challenges: challenges.map((c: any) => ({
        id: String(c._id),
        title: c.title,
        description: c.description,
        skills: c.skillsRequired ?? [],
        deadline: c.finalDeadline,
        startup: c.createdBy?.companyName || c.createdBy?.name || "Startup",
        hasRepo: Boolean(c.githubRepoName),
      })),
      reports: reports.map((r: any) => ({
        token: r.publicToken,
        issuedAt: r.issuedAt,
        confidence: r.confidence ?? null,
        rubricOverall: r.rubric?.overall ?? null,
        studentName:
          (typeof r.studentId === "object" ? r.studentId?.name : null) ?? "Student",
        problemTitle:
          (typeof r.problemId === "object" ? r.problemId?.title : null) ?? "Project",
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ challenges: [], reports: [], message: error.message }, { status: 200 });
  }
}
