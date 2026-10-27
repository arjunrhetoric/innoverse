import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Certificate, Shortlist, User } from "@innoverse/database";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const AddSchema = z.object({
  studentId: z.string().regex(/^[a-f0-9]{24}$/i),
  note: z.string().trim().max(500).optional(),
});

/** Startup's shortlisted talent. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "Startup") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    const entries = (await Shortlist.find({ startupId: session.user.id })
      .populate("studentId", "name headline skills location githubUsername profilePublic")
      .sort({ createdAt: -1 })
      .lean()) as any[];

    const studentIds = entries.map((e) => e.studentId?._id).filter(Boolean);
    const certificates = (await Certificate.find({
      studentId: { $in: studentIds },
      revoked: false,
    })
      .select("studentId confidence rubric.overall publicToken problemId")
      .populate("problemId", "title")
      .lean()) as any[];

    const byStudent = new Map<string, any[]>();
    for (const cert of certificates) {
      const key = String(cert.studentId);
      if (!byStudent.has(key)) byStudent.set(key, []);
      byStudent.get(key)!.push(cert);
    }

    return NextResponse.json({
      shortlist: entries
        .filter((e) => e.studentId)
        .map((e) => {
          const reports = byStudent.get(String(e.studentId._id)) ?? [];
          const confidences = reports
            .map((r) => r.confidence?.score)
            .filter((n: unknown): n is number => typeof n === "number");
          return {
            id: String(e._id),
            note: e.note ?? "",
            createdAt: e.createdAt,
            student: {
              id: String(e.studentId._id),
              name: e.studentId.name,
              headline: e.studentId.headline ?? null,
              skills: e.studentId.skills ?? [],
              location: e.studentId.location ?? null,
              githubUsername: e.studentId.githubUsername ?? null,
              listed: Boolean(e.studentId.profilePublic),
            },
            reportCount: reports.length,
            avgConfidence: confidences.length
              ? Math.round(confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length)
              : null,
            latestReportToken: reports[0]?.publicToken ?? null,
          };
        }),
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "Startup") {
      return NextResponse.json({ message: "Only startups can shortlist talent" }, { status: 403 });
    }

    const parsed = AddSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid shortlist entry" }, { status: 400 });
    }

    await connectDB();

    const student = (await User.findOne({
      _id: parsed.data.studentId,
      role: "Student",
      profilePublic: true,
    })
      .select("_id name")
      .lean()) as any;
    if (!student) {
      return NextResponse.json(
        { message: "Only students with a public talent profile can be shortlisted" },
        { status: 404 }
      );
    }

    const entry = await Shortlist.findOneAndUpdate(
      { startupId: session.user.id, studentId: parsed.data.studentId },
      { $set: { note: parsed.data.note ?? "" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await audit({
      actorId: session.user.id,
      actorName: session.user.name ?? null,
      action: "talent.shortlisted",
      resourceType: "Shortlist",
      resourceId: String(entry._id),
      metadata: { studentId: parsed.data.studentId },
      request: req,
    });

    return NextResponse.json({ message: "Added to shortlist", entry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
