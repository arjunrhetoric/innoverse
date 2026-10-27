import { NextResponse } from "next/server";
import { connectDB, Certificate, Problem, User } from "@innoverse/database";

export const dynamic = "force-dynamic";

/** Public, live platform metrics. Counts only — no personal data. */
export async function GET() {
  try {
    await connectDB();

    const [challenges, students, startups, reports] = await Promise.all([
      Problem.countDocuments({ completed: false }),
      User.countDocuments({ role: "Student" }),
      User.countDocuments({ role: "Startup" }),
      Certificate.countDocuments({}),
    ]);

    const merged = await Certificate.aggregate([
      { $group: { _id: null, total: { $sum: "$evidence.mergedPRs" } } },
    ]);

    return NextResponse.json({
      challenges,
      students,
      startups,
      reports,
      mergedPRs: merged?.[0]?.total ?? 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { challenges: 0, students: 0, startups: 0, reports: 0, mergedPRs: 0 },
      { status: 200 }
    );
  }
}
