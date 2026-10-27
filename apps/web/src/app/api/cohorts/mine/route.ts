import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Cohort, CohortMember, connectDB } from "@innoverse/database";

export const dynamic = "force-dynamic";

/** The signed-in student's cohorts. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const memberships = (await CohortMember.find({ studentId: session.user.id })
      .populate("cohortId", "name description joinCode institutionId")
      .sort({ createdAt: -1 })
      .lean()) as any[];

    return NextResponse.json({
      cohorts: memberships
        .filter((m) => m.cohortId)
        .map((m) => ({
          id: String(m.cohortId._id),
          name: m.cohortId.name,
          description: m.cohortId.description ?? "",
          joinedAt: m.createdAt,
        })),
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
