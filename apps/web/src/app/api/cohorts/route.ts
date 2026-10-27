import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Cohort, CohortMember, connectDB } from "@innoverse/database";
import { requireInstitution, type Actor } from "@/lib/policy";
import { audit } from "@/lib/audit";
import { z } from "zod";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional(),
});

function newJoinCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

/** List the institution's cohorts with lightweight stats. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as Actor["role"],
    };
    const decision = requireInstitution(actor);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }

    await connectDB();
    const cohorts = (await Cohort.find({ institutionId: session.user.id })
      .sort({ createdAt: -1 })
      .lean()) as any[];

    const ids = cohorts.map((c) => c._id);
    const memberCounts = await CohortMember.aggregate([
      { $match: { cohortId: { $in: ids } } },
      { $group: { _id: "$cohortId", count: { $sum: 1 } } },
    ]);
    const countByCohort = new Map(
      memberCounts.map((m: any) => [String(m._id), m.count as number])
    );

    return NextResponse.json({
      cohorts: cohorts.map((c) => ({
        id: String(c._id),
        name: c.name,
        description: c.description ?? "",
        joinCode: c.joinCode,
        createdAt: c.createdAt,
        memberCount: countByCohort.get(String(c._id)) ?? 0,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as Actor["role"],
    };
    const decision = requireInstitution(actor);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }

    const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "A cohort name of at least 3 characters is required" },
        { status: 400 }
      );
    }

    await connectDB();

    let joinCode = newJoinCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await Cohort.exists({ joinCode });
      if (!exists) break;
      joinCode = newJoinCode();
    }

    const cohort = await Cohort.create({
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      institutionId: session.user.id,
      joinCode,
    });

    await audit({
      actorId: actor.id,
      actorName: session.user.name ?? null,
      action: "cohort.created",
      resourceType: "Cohort",
      resourceId: String(cohort._id),
      metadata: { name: cohort.name },
      request: req,
    });

    return NextResponse.json({ message: "Cohort created", cohort }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
