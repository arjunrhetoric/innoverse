import { NextRequest, NextResponse } from "next/server";
import { connectDB, Certificate, User } from "@innoverse/database";

export const dynamic = "force-dynamic";

/**
 * Public talent directory. Only students who explicitly opted in are listed,
 * and only non-revoked reports are used for ranking.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
    const skill = (req.nextUrl.searchParams.get("skill") ?? "").trim().toLowerCase();

    let students = (await User.find({
      role: "Student",
      profilePublic: true,
    })
      .select("name headline skills location githubUsername projectsCompleted ratings")
      .limit(100)
      .lean()) as any[];

    if (q) {
      students = students.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.headline?.toLowerCase().includes(q) ||
          s.githubUsername?.toLowerCase().includes(q) ||
          (s.skills ?? []).some((k: string) => k.toLowerCase().includes(q))
      );
    }
    if (skill) {
      students = students.filter((s) =>
        (s.skills ?? []).some((k: string) => k.toLowerCase() === skill)
      );
    }

    const ids = students.map((s) => s._id);
    const certificates = (await Certificate.find({
      studentId: { $in: ids },
      revoked: false,
    })
      .select("studentId confidence rubric.overall publicToken problemId issuedAt evidence.mergedPRs")
      .populate("problemId", "title")
      .lean()) as any[];

    const byStudent = new Map<string, any[]>();
    for (const cert of certificates) {
      const key = String(cert.studentId);
      if (!byStudent.has(key)) byStudent.set(key, []);
      byStudent.get(key)!.push(cert);
    }

    const talent = students
      .map((s) => {
        const reports = byStudent.get(String(s._id)) ?? [];
        const confidences = reports
          .map((r) => r.confidence?.score)
          .filter((n): n is number => typeof n === "number");
        const rubrics = reports
          .map((r) => r.rubric?.overall)
          .filter((n): n is number => typeof n === "number");
        return {
          id: String(s._id),
          name: s.name,
          headline: s.headline ?? null,
          skills: s.skills ?? [],
          location: s.location ?? null,
          githubUsername: s.githubUsername ?? null,
          projectsCompleted: s.projectsCompleted ?? 0,
          reportCount: reports.length,
          avgConfidence: confidences.length
            ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
            : null,
          avgRubric: rubrics.length
            ? Math.round((rubrics.reduce((a, b) => a + b, 0) / rubrics.length) * 100) / 100
            : null,
          mergedPRs: reports.reduce((sum, r) => sum + (r.evidence?.mergedPRs ?? 0), 0),
          reports: reports.slice(0, 3).map((r) => ({
            token: r.publicToken ?? null,
            project: typeof r.problemId === "object" ? r.problemId?.title : null,
            issuedAt: r.issuedAt,
          })),
        };
      })
      .sort((a, b) => (b.avgConfidence ?? 0) - (a.avgConfidence ?? 0));

    return NextResponse.json({ talent });
  } catch (error: any) {
    return NextResponse.json({ talent: [], message: error.message }, { status: 200 });
  }
}
