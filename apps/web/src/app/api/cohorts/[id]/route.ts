import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  Certificate,
  Cohort,
  CohortMember,
  connectDB,
} from "@innoverse/database";
import { canManageCohort, type Actor } from "@/lib/policy";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/** Cohort detail: members and their verified reports. */
export async function GET(
  _req: NextRequest,
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

    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as Actor["role"],
    };
    const decision = canManageCohort(actor, cohort);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }

    const memberships = (await CohortMember.find({ cohortId: id })
      .populate("studentId", "name headline skills githubUsername profilePublic")
      .sort({ createdAt: 1 })
      .lean()) as any[];

    const studentIds = memberships.map((m) => m.studentId?._id).filter(Boolean);
    const certificates = (await Certificate.find({
      studentId: { $in: studentIds },
      revoked: false,
    })
      .select("studentId publicToken confidence rubric.overall evidence.mergedPRs issuedAt")
      .sort({ issuedAt: -1 })
      .lean()) as any[];

    const byStudent = new Map<string, any[]>();
    for (const cert of certificates) {
      const key = String(cert.studentId);
      if (!byStudent.has(key)) byStudent.set(key, []);
      byStudent.get(key)!.push(cert);
    }

    const members = memberships
      .filter((m) => m.studentId)
      .map((m) => {
        const reports = byStudent.get(String(m.studentId._id)) ?? [];
        const confidences = reports
          .map((r) => r.confidence?.score)
          .filter((n: unknown): n is number => typeof n === "number");
        return {
          id: String(m.studentId._id),
          name: m.studentId.name,
          headline: m.studentId.headline ?? null,
          githubUsername: m.studentId.githubUsername ?? null,
          joinedAt: m.createdAt,
          reportCount: reports.length,
          avgConfidence: confidences.length
            ? Math.round(confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length)
            : null,
          mergedPRs: reports.reduce((sum, r) => sum + (r.evidence?.mergedPRs ?? 0), 0),
          latestReportToken: reports[0]?.publicToken ?? null,
        };
      });

    const withReports = members.filter((m) => m.reportCount > 0);
    const avgConfidence = withReports.length
      ? Math.round(
          withReports.reduce((sum, m) => sum + (m.avgConfidence ?? 0), 0) / withReports.length
        )
      : null;

    return NextResponse.json({
      cohort: {
        id: String(cohort._id),
        name: cohort.name,
        description: cohort.description ?? "",
        joinCode: cohort.joinCode,
        createdAt: cohort.createdAt,
      },
      stats: {
        members: members.length,
        withReports: withReports.length,
        reports: certificates.length,
        mergedPRs: members.reduce((sum, m) => sum + m.mergedPRs, 0),
        avgConfidence,
        participation: members.length
          ? Math.round((withReports.length / members.length) * 100)
          : 0,
      },
      members,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
