import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Cohort, CohortMember, connectDB } from "@innoverse/database";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const JoinSchema = z.object({
  code: z.string().trim().min(6).max(12),
});

/** Join a cohort with its join code. */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "Student") {
      return NextResponse.json({ message: "Only student accounts can join a cohort" }, { status: 403 });
    }

    const parsed = JoinSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ message: "Enter a valid join code" }, { status: 400 });
    }

    await connectDB();
    const cohort = (await Cohort.findOne({
      joinCode: parsed.data.code.toUpperCase(),
    }).lean()) as any;

    if (!cohort) {
      return NextResponse.json({ message: "No cohort matches that code" }, { status: 404 });
    }

    const existing = await CohortMember.findOne({
      cohortId: cohort._id,
      studentId: session.user.id,
    });

    if (!existing) {
      await CohortMember.create({
        cohortId: cohort._id,
        studentId: session.user.id,
      });

      await audit({
        actorId: session.user.id,
        actorName: session.user.name ?? null,
        action: "cohort.joined",
        resourceType: "Cohort",
        resourceId: String(cohort._id),
        metadata: { name: cohort.name },
        request: req,
      });
    }

    return NextResponse.json({
      message: existing ? "You are already in this cohort" : "Joined cohort",
      cohort: {
        id: String(cohort._id),
        name: cohort.name,
        description: cohort.description ?? "",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
