import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Certificate, Cohort, CohortMember, connectDB } from "@innoverse/database";
import { canManageCohort, type Actor } from "@/lib/policy";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Accreditation export: one row per enrolled student. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Cohort not found" }, { status: 404 });
    }

    await connectDB();
    const cohort = (await Cohort.findById(id).lean()) as any;
    if (!cohort) return NextResponse.json({ message: "Cohort not found" }, { status: 404 });

    const actor: Actor = { id: session.user.id, role: session.user.role as Actor["role"] };
    const decision = canManageCohort(actor, cohort);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }

    const memberships = (await CohortMember.find({ cohortId: id })
      .populate("studentId", "name email githubUsername")
      .sort({ createdAt: 1 })
      .lean()) as any[];

    const studentIds = memberships.map((m) => m.studentId?._id).filter(Boolean);
    const certificates = (await Certificate.find({
      studentId: { $in: studentIds },
      revoked: false,
    })
      .select("studentId publicToken confidence.score rubric.overall evidence.mergedPRs issuedAt")
      .lean()) as any[];

    const byStudent = new Map<string, any[]>();
    for (const cert of certificates) {
      const key = String(cert.studentId);
      if (!byStudent.has(key)) byStudent.set(key, []);
      byStudent.get(key)!.push(cert);
    }

    const header = [
      "Student",
      "Email",
      "GitHub",
      "Joined",
      "Reports",
      "Average confidence",
      "Average rubric",
      "Merged PRs",
      "Latest report",
    ];

    const rows = memberships
      .filter((m) => m.studentId)
      .map((m) => {
        const reports = byStudent.get(String(m.studentId._id)) ?? [];
        const confidences = reports
          .map((r) => r.confidence?.score)
          .filter((n: unknown): n is number => typeof n === "number");
        const rubrics = reports
          .map((r) => r.rubric?.overall)
          .filter((n: unknown): n is number => typeof n === "number");
        const avgConfidence = confidences.length
          ? Math.round(confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length)
          : "";
        const avgRubric = rubrics.length
          ? Math.round((rubrics.reduce((a: number, b: number) => a + b, 0) / rubrics.length) * 100) / 100
          : "";
        const mergedPRs = reports.reduce((sum, r) => sum + (r.evidence?.mergedPRs ?? 0), 0);
        const token = reports.find((r) => r.publicToken)?.publicToken;
        const origin = req.nextUrl.origin;

        return [
          m.studentId.name,
          m.studentId.email ?? "",
          m.studentId.githubUsername ? `@${m.studentId.githubUsername}` : "",
          new Date(m.createdAt).toISOString().slice(0, 10),
          reports.length,
          avgConfidence,
          avgRubric,
          mergedPRs,
          token ? `${origin}/r/${token}` : "",
        ].map(csvCell).join(",");
      });

    const csv = [header.map(csvCell).join(","), ...rows].join("\r\n");
    const safeName = cohort.name.replace(/[^a-zA-Z0-9-_]+/g, "-").toLowerCase();

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cohort-${safeName}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
